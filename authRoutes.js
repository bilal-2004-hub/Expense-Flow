const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  signup,
  forgotPassword,
  resendOTP,
  verifyOTP,
  resetPassword
} = require('../controllers/authController');

const router = express.Router();

// Rate limiting middleware to prevent brute-forcing OTP requests
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 15 minutes.'
  }
});

// Rate limiting middleware to prevent brute-forcing OTP values
const verifyOTPLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again after 15 minutes.'
  }
});

router.post('/signup', signup);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/resend-otp', forgotPasswordLimiter, resendOTP);
router.post('/verify-otp', verifyOTPLimiter, verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;
