const { db } = require('../config/firebase');

// @desc    Get all transactions for logged in user
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const uid = req.user.uid;
    const snap = await db.collection('transactions')
      .where('userId', '==', uid)
      .get();

    const transactions = [];
    snap.forEach(doc => {
      transactions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by date or createdAt descending
    transactions.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt);
      const dateB = new Date(b.date || b.createdAt);
      return dateB - dateA;
    });

    return res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions.'
    });
  }
};

// @desc    Get single transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    const docRef = db.collection('transactions').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.'
      });
    }

    const data = doc.data();

    // User isolation check
    if (data.userId !== uid) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this transaction.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: doc.id,
        ...data
      }
    });
  } catch (err) {
    console.error('Get transaction by ID error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction.'
    });
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { title, category, amount, type, date, notes, status } = req.body;

    if (!title || amount === undefined || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, amount, and type.'
      });
    }

    const now = new Date().toISOString();
    const newTx = {
      userId: uid, // Derived strictly from verified Firebase token
      title: title.trim(),
      category: category || 'Other',
      amount: Number(amount),
      type: type || 'expense',
      date: date || now.slice(0, 10),
      notes: notes || '',
      status: status || 'Completed',
      createdAt: now,
      updatedAt: now
    };

    const docRef = await db.collection('transactions').add(newTx);

    return res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        ...newTx
      }
    });
  } catch (err) {
    console.error('Create transaction error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create transaction.'
    });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    const docRef = db.collection('transactions').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.'
      });
    }

    const existing = doc.data();

    // User isolation check
    if (existing.userId !== uid) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this transaction.'
      });
    }

    const allowedFields = ['title', 'category', 'amount', 'type', 'date', 'notes', 'status'];
    const updates = { updatedAt: new Date().toISOString() };

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = field === 'amount' ? Number(req.body[field]) : req.body[field];
      }
    });

    await docRef.update(updates);
    const updatedDoc = await docRef.get();

    return res.status(200).json({
      success: true,
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (err) {
    console.error('Update transaction error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update transaction.'
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    const docRef = db.collection('transactions').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.'
      });
    }

    const existing = doc.data();

    // User isolation check
    if (existing.userId !== uid) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this transaction.'
      });
    }

    await docRef.delete();

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully.'
    });
  } catch (err) {
    console.error('Delete transaction error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete transaction.'
    });
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction
};
