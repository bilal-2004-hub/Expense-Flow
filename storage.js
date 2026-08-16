/* =========================================================
   EXPENSEFLOW — storage.js
   Data manager backed by Backend REST API & Cloud Firestore.
   All page logic talks to data through the `Store` object.
   ========================================================= */

const Store = (() => {
  const CATEGORIES = {
    Salary:        { color: '#22c55e', icon: 'fa-briefcase' },
    Freelance:     { color: '#0ea5e9', icon: 'fa-laptop-code' },
    Food:          { color: '#f59e0b', icon: 'fa-utensils' },
    Shopping:      { color: '#ec4899', icon: 'fa-bag-shopping' },
    Transport:     { color: '#2563eb', icon: 'fa-car' },
    Bills:         { color: '#ef4444', icon: 'fa-file-invoice-dollar' },
    Entertainment: { color: '#8b5cf6', icon: 'fa-film' },
    Health:        { color: '#14b8a6', icon: 'fa-heart-pulse' },
    Education:     { color: '#f97316', icon: 'fa-graduation-cap' },
    Other:         { color: '#64748b', icon: 'fa-ellipsis' }
  };

  const cache = {
    transactions: [],
    settings: null
  };

  function defaultSettings() {
    return {
      name: 'User',
      email: '',
      theme: localStorage.getItem('ef_theme') || 'light',
      currency: 'USD',
      language: 'English',
      notifications: { budget: true, bills: true, weekly: false },
      budgetGoal: 2500,
      savingsGoal: 10000,
      monthlySavingsGoal: 1500
    };
  }

  // Fetch transactions from Firestore via backend API
  async function fetchTransactions() {
    try {
      const res = await API.get('/transactions');
      cache.transactions = res.data || [];
      return cache.transactions;
    } catch (err) {
      console.warn('Could not fetch transactions from API:', err);
      return cache.transactions;
    }
  }

  // Synchronous accessor for cached transactions
  function getTransactions() {
    return cache.transactions;
  }

  async function addTransaction(tx) {
    try {
      const res = await API.post('/transactions', tx);
      const created = res.data;
      cache.transactions.unshift(created);
      return created;
    } catch (err) {
      console.error('Error adding transaction via API:', err);
      throw err;
    }
  }

  async function updateTransaction(id, updates) {
    try {
      const res = await API.put(`/transactions/${id}`, updates);
      const updated = res.data;
      const idx = cache.transactions.findIndex(t => t.id === id);
      if (idx > -1) {
        cache.transactions[idx] = updated;
      }
      return updated;
    } catch (err) {
      console.error('Error updating transaction via API:', err);
      throw err;
    }
  }

  async function deleteTransaction(id) {
    try {
      await API.delete(`/transactions/${id}`);
      cache.transactions = cache.transactions.filter(t => t.id !== id);
    } catch (err) {
      console.error('Error deleting transaction via API:', err);
      throw err;
    }
  }

  // Fetch settings from Firestore via backend API
  async function fetchSettings() {
    try {
      const res = await API.get('/settings');
      cache.settings = { ...defaultSettings(), ...(res.data || {}) };
      return cache.settings;
    } catch (err) {
      console.warn('Could not fetch settings from API:', err);
      if (!cache.settings) cache.settings = defaultSettings();
      return cache.settings;
    }
  }

  function getSettings() {
    return cache.settings || defaultSettings();
  }

  async function saveSettings(settings) {
    try {
      const res = await API.put('/settings', settings);
      cache.settings = { ...defaultSettings(), ...(res.data || settings) };

      if (settings.theme) {
        localStorage.setItem('ef_theme', settings.theme);
      }
      return cache.settings;
    } catch (err) {
      console.error('Error saving settings via API:', err);
      cache.settings = { ...getSettings(), ...settings };
      return cache.settings;
    }
  }

  /**
   * Returns the monthly snapshot with savings locked away from income FIRST.
   */
  function getMonthlyStats(customTxList, customSettings) {
    const now      = new Date();
    const year     = now.getFullYear();
    const month    = now.getMonth();
    const settings = customSettings || getSettings();
    const goal     = Number(settings.monthlySavingsGoal) || 0;
    const txList   = customTxList || getTransactions();

    const txThisMonth = (txList || []).filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const income  = txThisMonth.filter(t => t.type === 'income') .reduce((s, t) => s + Number(t.amount), 0);
    const expense = txThisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    const savedAmount      = Math.min(income, goal);
    const spendableBudget  = Math.max(income - goal, 0);
    const spendableBalance = income - goal - expense;
    const savingsSecured   = income >= goal;
    const pct = goal > 0 ? Math.min(Math.round((savedAmount / goal) * 100), 100) : (income > 0 ? 100 : 0);

    let status;
    if (income === 0)              status = 'no-income';
    else if (spendableBalance < 0) status = 'dipping';
    else if (!savingsSecured)      status = 'tight';
    else                           status = 'on-track';

    return { income, expense, goal, savedAmount, spendableBudget, spendableBalance, savingsSecured, pct, status };
  }

  async function exportData() {
    const transactions = await fetchTransactions();
    const settings = await fetchSettings();
    const data = { transactions, settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenseflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function categoryMeta(cat) {
    return CATEGORIES[cat] || CATEGORIES.Other;
  }

  return {
    CATEGORIES,
    fetchTransactions,
    getTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    fetchSettings,
    getSettings,
    saveSettings,
    exportData,
    categoryMeta,
    getMonthlyStats
  };
})();
