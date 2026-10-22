const { auth, db } = require('../config/firebase');
const { sendOTPEmail } = require('../services/emailService');
const {
  generateOTP,
  hashValue,
  compareValue,
  generateRandomToken
} = require('../services/otpService');

// @desc    Signup new user with Firebase Auth & Firestore
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Create user in Firebase Authentication
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email.toLowerCase().trim(),
        password: password,
        displayName: name.trim()
      });
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-exists') {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }
      throw authErr;
    }

    const uid = userRecord.uid;
    const now = new Date().toISOString();

    // Create user document in Firestore users/{uid}
    await db.collection('users').doc(uid).set({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      createdAt: now
    });

    // Create default settings document in Firestore settings/{uid}
    await db.collection('settings').doc(uid).set({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      theme: 'light',
      currency: 'USD',
      language: 'English',
      notifications: { budget: true, bills: true, weekly: false },
      budgetGoal: 2500,
      savingsGoal: 10000,
      monthlySavingsGoal: 1500,
      updatedAt: now
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      uid: uid
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error during signup.'
    });
  }
};

// @desc    Forgot Password - Request OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Generic security response
    const genericResponse = {
      success: true,
      message: 'If an account exists with this email, an OTP has been sent.'
    };

    // Verify user exists in Firebase Auth
    try {
      await auth.getUserByEmail(cleanEmail);
    } catch (err) {
      // User not found -> return generic success to prevent email enumeration
      return res.status(200).json(genericResponse);
    }

    // Check OTP resend cooldown (60 seconds) in Firestore passwordResets
    const resetsRef = db.collection('passwordResets');
    const lastSnap = await resetsRef
      .where('email', '==', cleanEmail)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!lastSnap.empty) {
      const lastDoc = lastSnap.docs[0].data();
      const cooldownMs = (parseInt(process.env.OTP_RESEND_COOLDOWN) || 60) * 1000;
      const lastCreatedTime = new Date(lastDoc.createdAt).getTime();
      const timeSinceLast = Date.now() - lastCreatedTime;

      if (timeSinceLast < cooldownMs) {
        const waitSec = Math.ceil((cooldownMs - timeSinceLast) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSec} seconds before requesting a new OTP.`
        });
      }
    }

    // Invalidate previous active OTPs for this email
    const activeSnaps = await resetsRef
      .where('email', '==', cleanEmail)
      .where('used', '==', false)
      .get();

    const batch = db.batch();
    activeSnaps.forEach(doc => {
      batch.update(doc.ref, { used: true });
    });
    await batch.commit();

    // Generate secure 6-digit OTP
    const otp = generateOTP();
    const otpHash = await hashValue(otp);
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    // Save to Firestore passwordResets collection
    await resetsRef.add({
      email: cleanEmail,
      otpHash,
      expiresAt,
      attempts: 0,
      used: false,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      createdAt
    });

    // Send email via Nodemailer
    try {
      await sendOTPEmail(cleanEmail, otp);
    } catch (mailErr) {
      console.error('Mail sending failed:', mailErr);
      return res.status(500).json({
        success: false,
        message: 'Error sending email. Please try again later.'
      });
    }

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error('FORGOT PASSWORD ERROR:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
      error: err.code || null
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
  return forgotPassword(req, res);
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and OTP.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const resetsRef = db.collection('passwordResets');

    // Find the most recent active OTP record
    const snap = await resetsRef
      .where('email', '==', cleanEmail)
      .where('used', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP.'
      });
    }

    const docRef = snap.docs[0].ref;
    const otpRecord = snap.docs[0].data();

    // Check expiration
    if (new Date(otpRecord.expiresAt) < new Date()) {
      await docRef.update({ used: true });
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP.'
      });
    }

    // Check maximum verification attempts
    const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;
    if (otpRecord.attempts >= maxAttempts) {
      await docRef.update({ used: true });
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.'
      });
    }

    // Match OTP
    const isMatch = await compareValue(otp, otpRecord.otpHash);
    if (!isMatch) {
      const newAttempts = otpRecord.attempts + 1;
      const updates = { attempts: newAttempts };
      if (newAttempts >= maxAttempts) {
        updates.used = true;
      }
      await docRef.update(updates);

      if (newAttempts >= maxAttempts) {
        return res.status(400).json({
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.'
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP.'
      });
    }

    // Valid OTP - Generate short-lived reset token (10 minutes)
    const resetToken = generateRandomToken();
    const resetTokenHash = await hashValue(resetToken);
    const resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await docRef.update({
      used: true,
      resetTokenHash,
      resetTokenExpiresAt
    });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      reset_token: resetToken
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, reset_token, password } = req.body;

    if (!email || !reset_token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all fields.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const resetsRef = db.collection('passwordResets');

    // Find the record with active reset token
    const snap = await resetsRef
      .where('email', '==', cleanEmail)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.'
      });
    }

    const docRef = snap.docs[0].ref;
    const otpRecord = snap.docs[0].data();

    if (
      !otpRecord.resetTokenHash ||
      !otpRecord.resetTokenExpiresAt ||
      new Date(otpRecord.resetTokenExpiresAt) < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.'
      });
    }

    // Match reset token
    const isTokenMatch = await compareValue(reset_token, otpRecord.resetTokenHash);
    if (!isTokenMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.'
      });
    }

    // Update password in Firebase Authentication
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(cleanEmail);
    } catch (userErr) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    await auth.updateUser(userRecord.uid, {
      password: password
    });

    // Invalidate reset token to prevent reuse
    await docRef.update({
      resetTokenHash: null,
      resetTokenExpiresAt: null
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

module.exports = {
  signup,
  forgotPassword,
  resendOTP,
  verifyOTP,
  resetPassword
};
