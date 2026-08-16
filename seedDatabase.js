/* =========================================================
   EXPENSEFLOW — seedDatabase.js
   Script to initialize and populate all Firestore collections.
   Run using: node server/seedDatabase.js
   ========================================================= */

const { db } = require('./config/firebase');

async function initializeCollections() {
  console.log('🚀 Initializing Firestore collections for expense-flow-d5278...\n');

  try {
    const demoUid = 'demo_user_123';
    const now = new Date().toISOString();

    // 1. Users Collection
    console.log('📦 Creating "users" collection...');
    await db.collection('users').doc(demoUid).set({
      name: 'Demo User',
      email: 'demo@expenseflow.com',
      photoUrl: '',
      emailVerified: true,
      role: 'user',
      createdAt: now,
      lastLoginAt: now
    });

    // 2. Settings Collection
    console.log('📦 Creating "settings" collection...');
    await db.collection('settings').doc(demoUid).set({
      name: 'Demo User',
      email: 'demo@expenseflow.com',
      theme: 'light',
      currency: 'USD',
      language: 'English',
      notifications: { budget: true, bills: true, weekly: false },
      budgetGoal: 2500,
      savingsGoal: 10000,
      monthlySavingsGoal: 1500,
      updatedAt: now
    });

    // 3. Categories Collection
    console.log('📦 Creating "categories" collection...');
    const defaultCategories = [
      { name: 'Salary', type: 'income', color: '#22c55e', icon: 'fa-briefcase', isDefault: true },
      { name: 'Freelance', type: 'income', color: '#0ea5e9', icon: 'fa-laptop-code', isDefault: true },
      { name: 'Food', type: 'expense', color: '#f59e0b', icon: 'fa-utensils', isDefault: true },
      { name: 'Shopping', type: 'expense', color: '#ec4899', icon: 'fa-bag-shopping', isDefault: true },
      { name: 'Transport', type: 'expense', color: '#2563eb', icon: 'fa-car', isDefault: true },
      { name: 'Bills', type: 'expense', color: '#ef4444', icon: 'fa-file-invoice-dollar', isDefault: true },
      { name: 'Entertainment', type: 'expense', color: '#8b5cf6', icon: 'fa-film', isDefault: true },
      { name: 'Health', type: 'expense', color: '#14b8a6', icon: 'fa-heart-pulse', isDefault: true },
      { name: 'Education', type: 'expense', color: '#f97316', icon: 'fa-graduation-cap', isDefault: true },
      { name: 'Other', type: 'expense', color: '#64748b', icon: 'fa-ellipsis', isDefault: true }
    ];

    for (const cat of defaultCategories) {
      await db.collection('categories').add({
        userId: demoUid,
        ...cat,
        createdAt: now
      });
    }

    // 4. Transactions Collection
    console.log('📦 Creating "transactions" collection...');
    const sampleTransactions = [
      {
        userId: demoUid,
        title: 'Monthly Salary',
        amount: 4500.00,
        type: 'income',
        category: 'Salary',
        paymentMethod: 'Bank Transfer',
        date: now.slice(0, 10),
        notes: 'Monthly tech paycheck',
        status: 'Completed',
        createdAt: now,
        updatedAt: now
      },
      {
        userId: demoUid,
        title: 'Grocery Shopping',
        amount: 145.80,
        type: 'expense',
        category: 'Food',
        paymentMethod: 'Credit Card',
        date: now.slice(0, 10),
        notes: 'Supermarket weekly essentials',
        status: 'Completed',
        createdAt: now,
        updatedAt: now
      },
      {
        userId: demoUid,
        title: 'Electricity & Utility Bill',
        amount: 95.00,
        type: 'expense',
        category: 'Bills',
        paymentMethod: 'UPI',
        date: now.slice(0, 10),
        notes: 'Home monthly utility bill',
        status: 'Completed',
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const tx of sampleTransactions) {
      await db.collection('transactions').add(tx);
    }

    // 5. Budgets Collection
    console.log('📦 Creating "budgets" collection...');
    await db.collection('budgets').doc(`${demoUid}_2026_08`).set({
      userId: demoUid,
      month: '2026-08',
      totalBudget: 2500.00,
      categoryBudgets: {
        Food: 600.00,
        Shopping: 400.00,
        Transport: 300.00,
        Bills: 800.00,
        Entertainment: 200.00
      },
      alertThreshold: 80,
      createdAt: now
    });

    // 6. Savings Goals Collection
    console.log('📦 Creating "savingsGoals" collection...');
    await db.collection('savingsGoals').add({
      userId: demoUid,
      title: 'Emergency Fund',
      targetAmount: 10000.00,
      currentAmount: 3500.00,
      targetDate: '2026-12-31',
      color: '#10b981',
      icon: 'fa-piggy-bank',
      status: 'in-progress',
      createdAt: now
    });

    // 7. Recurring Bills Collection
    console.log('📦 Creating "recurringBills" collection...');
    await db.collection('recurringBills').add({
      userId: demoUid,
      title: 'Netflix Subscription',
      amount: 15.99,
      category: 'Entertainment',
      frequency: 'monthly',
      dueDate: '2026-08-25',
      autoRenew: true,
      status: 'Active',
      lastPaidDate: '2026-07-25',
      createdAt: now
    });

    // 8. Notifications Collection
    console.log('📦 Creating "notifications" collection...');
    await db.collection('notifications').add({
      userId: demoUid,
      title: 'Welcome to ExpenseFlow!',
      message: 'Your account and database collections have been successfully initialized.',
      type: 'info',
      read: false,
      createdAt: now
    });

    // 9. Password Resets Collection
    console.log('📦 Creating "passwordResets" collection...');
    await db.collection('passwordResets').add({
      email: 'demo@expenseflow.com',
      otpHash: 'sample_hash_string',
      expiresAt: now,
      attempts: 0,
      used: true,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      createdAt: now
    });

    console.log('\n✅ ALL 9 COLLECTIONS CREATED SUCCESSFULLY IN FIRESTORE!');
  } catch (err) {
    console.error('\n❌ Error creating collections:', err);
  }
}

initializeCollections();
