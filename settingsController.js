const { db } = require('../config/firebase');

// @desc    Get settings for logged in user
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    const uid = req.user.uid;
    const docRef = db.collection('settings').doc(uid);
    const doc = await docRef.get();

    const defaults = {
      name: 'User',
      email: req.user.email || '',
      theme: 'light',
      currency: 'USD',
      language: 'English',
      notifications: { budget: true, bills: true, weekly: false },
      budgetGoal: 2500,
      savingsGoal: 10000,
      monthlySavingsGoal: 1500
    };

    if (!doc.exists) {
      // Return defaults if doc doesn't exist yet
      return res.status(200).json({
        success: true,
        data: defaults
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...defaults,
        ...doc.data()
      }
    });
  } catch (err) {
    console.error('Get settings error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch settings.'
    });
  }
};

// @desc    Update settings for logged in user
// @route   PUT /api/settings
// @access  Private
const updateSettings = async (req, res) => {
  try {
    const uid = req.user.uid;
    const docRef = db.collection('settings').doc(uid);

    const now = new Date().toISOString();
    const updates = {
      ...req.body,
      updatedAt: now
    };

    await docRef.set(updates, { merge: true });
    const updatedDoc = await docRef.get();

    return res.status(200).json({
      success: true,
      data: updatedDoc.data()
    });
  } catch (err) {
    console.error('Update settings error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings.'
    });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
