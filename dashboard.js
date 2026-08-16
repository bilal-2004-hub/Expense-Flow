/* =========================================================
   EXPENSEFLOW — dashboard.js
   Powers: Dashboard summary/widgets, Transactions CRUD table,
   Settings page. Guarded by element-existence checks so this
   single file is safe to include across app pages.
   ========================================================= */

/* ---------- CANVAS CHART HELPERS (no external libs) ---------- */
const Charts = {
  lineBarChart(canvas, { labels, income, expense }) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padding = { top: 20, right: 10, bottom: 30, left: 40 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(...income, ...expense, 1) * 1.15;

    const styles = getComputedStyle(document.documentElement);
    const gridColor = styles.getPropertyValue('--bg').trim() || '#f1f5f9';
    const textColor = styles.getPropertyValue('--text-secondary').trim() || '#64748b';
    const successColor = styles.getPropertyValue('--success').trim() || '#22c55e';
    const expenseColor = styles.getPropertyValue('--expense').trim() || '#ef4444';

    // Grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    const groupWidth = chartW / labels.length;
    const barWidth = groupWidth * 0.28;

    labels.forEach((label, i) => {
      const groupX = padding.left + i * groupWidth + groupWidth / 2;
      const incH = (income[i] / maxVal) * chartH;
      const expH = (expense[i] / maxVal) * chartH;

      // income bar
      ctx.fillStyle = successColor;
      roundRectPath(ctx, groupX - barWidth - 2, padding.top + chartH - incH, barWidth, incH, 4);
      ctx.fill();

      // expense bar
      ctx.fillStyle = expenseColor;
      roundRectPath(ctx, groupX + 2, padding.top + chartH - expH, barWidth, expH, 4);
      ctx.fill();

      // label
      ctx.fillStyle = textColor;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, groupX, h - 8);
    });
  },

  donutChart(canvas, segments) {
    // segments: [{label, value, color}]
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) / 2 - 8;
    const innerRadius = radius * 0.62;
    let startAngle = -Math.PI / 2;

    segments.forEach(seg => {
      const angle = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + angle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      startAngle += angle;
    });

    // inner hole
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();
  }
};

function roundRectPath(ctx, x, y, width, height, radius) {
  if (height <= 0) return;
  const r = Math.min(radius, width / 2, height);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ---------- SHARED FORMATTERS ---------- */
function fmtMoney(n) {
  const settings = Store.getSettings();
  const symbols = { USD: '$', EUR: '€', GBP: '£', PKR: 'Rs ', INR: '₹' };
  const sym = symbols[settings.currency] || '$';
  const sign = n < 0 ? '-' : '';
  return `${sign}${sym}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
}
function fmtDate(iso) {
  const d = parseLocalDate(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - parseLocalDate(iso)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
}

/* =========================================================
   DASHBOARD PAGE
   ========================================================= */
function initDashboardPage() {
  const summaryRoot = document.querySelector('[data-page="dashboard"]');
  if (!summaryRoot) return;

  const tx = Store.getTransactions();
  // All-time totals for Income / Expenses cards
  const allIncome  = tx.filter(t => t.type === 'income') .reduce((s, t) => s + Number(t.amount), 0);
  const allExpense = tx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  // Monthly stats — drives Savings & Balance cards
  const ms = Store.getMonthlyStats();
  // Spendable balance: income − savings goal − expenses (this month)
  const displayBalance = ms.spendableBalance; // can be negative

  setStat('stat-income',  allIncome,   '+8.2%', 'up');
  setStat('stat-expense', allExpense,  '+3.1%', 'down');
  // Savings card: show the locked-away goal amount
  setStat('stat-savings', ms.goal, ms.pct + '% funded', ms.status === 'dipping' ? 'down' : 'up');
  // Balance card: spendable balance after savings + expenses deducted
  setStat('stat-balance', displayBalance,
    displayBalance >= 0 ? 'Spendable' : 'Over budget',
    displayBalance >= 0 ? 'up' : 'down');

  renderRecentTransactions(tx.slice(0, 5));
  renderBudgetProgress(allExpense);
  renderIncomeExpenseChart(tx);
  renderCategoryDonut(tx);
  renderTimeline(tx.slice(0, 4));
  renderUpcomingBills();
  renderMonthlySavingsWidget(ms);
  checkSavingsAlert(ms);
  populateCategorySelects();
  initQuickAddForm();
}

function setStat(prefix, value, trendText, trendDir) {
  const valueEl = document.getElementById(`${prefix}-value`);
  const trendEl = document.getElementById(`${prefix}-trend`);
  if (!valueEl) return;
  valueEl.textContent = fmtMoney(value);
  if (trendEl) {
    trendEl.textContent = trendText;
    trendEl.className = `stat-trend ${trendDir}`;
  }
}

function renderRecentTransactions(list) {
  const root = document.getElementById('recent-tx-list');
  if (!root) return;
  if (!list.length) {
    root.innerHTML = `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No transactions yet. Add your first one!</p></div>`;
    return;
  }
  root.innerHTML = list.map(t => {
    const meta = Store.categoryMeta(t.category);
    const sign = t.type === 'income' ? '+' : '-';
    return `
      <div class="tx-list-row">
        <div class="tx-left">
          <div class="tx-icon" style="background:${meta.color}"><i class="fa-solid ${meta.icon}"></i></div>
          <div>
            <div class="tx-title">${escapeHTML(t.title)}</div>
            <div class="tx-meta">${t.category} · ${fmtDate(t.date)}</div>
          </div>
        </div>
        <div class="tx-amount ${t.type}">${sign}${fmtMoney(Math.abs(t.amount))}</div>
      </div>`;
  }).join('');
}

function renderBudgetProgress(expense) {
  const wrap = document.getElementById('budget-circle');
  if (!wrap) return;
  const settings = Store.getSettings();
  const goal = settings.budgetGoal || 2500;
  const pct = Math.min(Math.round((expense / goal) * 100), 100);
  const circle = wrap.querySelector('.fg-ring');
  const radius = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference;
  requestAnimationFrame(() => {
    circle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
  });
  if (pct > 90) circle.style.stroke = 'var(--expense)';
  else if (pct > 70) circle.style.stroke = 'var(--warning)';
  document.getElementById('budget-pct').textContent = pct + '%';
  document.getElementById('budget-caption').textContent = `${fmtMoney(expense)} of ${fmtMoney(goal)}`;
}

function renderIncomeExpenseChart(tx) {
  const canvas = document.getElementById('income-expense-chart');
  if (!canvas) return;
  const months = lastNMonthLabels(6);
  const income = months.map(m => sumForMonth(tx, m, 'income'));
  const expense = months.map(m => sumForMonth(tx, m, 'expense'));
  Charts.lineBarChart(canvas, { labels: months.map(m => m.label), income, expense });
  window.addEventListener('resize', debounce(() => Charts.lineBarChart(canvas, { labels: months.map(m => m.label), income, expense }), 200));
}

function renderCategoryDonut(tx) {
  const canvas = document.getElementById('category-donut');
  const legend = document.getElementById('category-legend');
  if (!canvas) return;
  const byCategory = {};
  tx.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
  });
  const segments = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cat, value]) => ({ label: cat, value, color: Store.categoryMeta(cat).color }));
  Charts.donutChart(canvas, segments);
  if (legend) {
    const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
    legend.innerHTML = segments.map(seg => `
      <div class="category-row">
        <span class="cat-dot" style="background:${seg.color}"></span>
        <span class="cat-name">${seg.label}</span>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${(seg.value/total*100).toFixed(0)}%; background:${seg.color}"></div></div>
        <span class="cat-amount">${((seg.value/total)*100).toFixed(0)}%</span>
      </div>`).join('');
  }
}

function renderTimeline(list) {
  const root = document.getElementById('activity-timeline');
  if (!root) return;
  if (!list.length) { root.innerHTML = `<p style="color:var(--text-secondary);font-size:0.88rem;">No recent activity.</p>`; return; }
  root.innerHTML = list.map(t => `
    <div class="timeline-item">
      <div class="timeline-dot" style="background:${t.type === 'income' ? 'var(--success)' : 'var(--expense)'}"></div>
      <div class="timeline-content">
        <p>${t.type === 'income' ? 'Received' : 'Spent'} ${fmtMoney(Math.abs(t.amount))} — ${escapeHTML(t.title)}</p>
        <span>${timeAgo(t.date)}</span>
      </div>
    </div>`).join('');
}

function renderUpcomingBills() {
  const root = document.getElementById('upcoming-bills');
  if (!root) return;
  const bills = [
    { name: 'Internet & Wi-Fi', due: 'Due in 3 days', amount: 55 },
    { name: 'Car Insurance', due: 'Due in 6 days', amount: 130 },
    { name: 'Streaming Bundle', due: 'Due in 9 days', amount: 24.99 }
  ];
  root.innerHTML = bills.map(b => `
    <div class="bill-row">
      <div>
        <div class="bill-name">${b.name}</div>
        <div class="bill-date">${b.due}</div>
      </div>
      <div class="bill-amount">${fmtMoney(b.amount)}</div>
    </div>`).join('');
}

/**
 * Renders the Monthly Savings Tracker widget.
 * ms = object returned by Store.getMonthlyStats()
 *
 * Layout:
 *   [Status banner]
 *   [Goal Hero: locked amount]
 *   [Breakdown: Income / Reserved / Spendable / Expenses / Balance]
 *   [Progress bar: how much of goal is funded by income]
 */
function renderMonthlySavingsWidget(ms) {
  const bar     = document.getElementById('savings-goal-fill');
  if (!bar) return; // not on dashboard

  // Hero goal amount
  const heroEl  = document.getElementById('savings-hero-amount');
  const resEl   = document.getElementById('savings-reserved-amt');
  const budEl   = document.getElementById('savings-spendable-budget');
  const incEl   = document.getElementById('savings-month-income');
  const expEl   = document.getElementById('savings-month-expense');
  const balEl   = document.getElementById('savings-month-balance');
  const label   = document.getElementById('savings-goal-label');
  const pctEl   = document.getElementById('savings-goal-pct');
  const banner  = document.getElementById('savings-status-banner');

  if (heroEl) heroEl.textContent = fmtMoney(ms.goal);
  if (incEl)  incEl.textContent  = fmtMoney(ms.income);
  if (resEl)  resEl.textContent  = ms.goal > 0 ? '−' + fmtMoney(ms.savedAmount) : fmtMoney(0);
  if (budEl)  budEl.textContent  = fmtMoney(ms.spendableBudget);
  if (expEl)  expEl.textContent  = '−' + fmtMoney(ms.expense);

  // Remaining spendable balance (colour-coded)
  if (balEl) {
    balEl.textContent  = fmtMoney(ms.spendableBalance);
    balEl.style.color  = ms.spendableBalance < 0 ? 'var(--expense)'
                       : ms.spendableBalance > 0 ? 'var(--success)'
                       : 'var(--text-primary)';
  }

  // Progress bar — how much of goal is funded
  if (label) label.textContent = `${fmtMoney(ms.savedAmount)} of ${fmtMoney(ms.goal)} goal secured`;
  if (pctEl) {
    pctEl.textContent = ms.pct + '%';
    pctEl.style.color = ms.status === 'on-track' ? 'var(--success)'
                      : ms.status === 'dipping'  ? 'var(--expense)'
                      : ms.status === 'tight'    ? 'var(--warning)'
                      : '#cbd5e1';
  }
  bar.className = 'progress-bar-fill ' + ms.status;
  requestAnimationFrame(() => { bar.style.width = ms.pct + '%'; });

  // Status banner
  if (banner) {
    if (ms.status === 'no-income') {
      banner.className = 'savings-status-banner tight';
      banner.innerHTML = `<i class="fa-solid fa-circle-info"></i><span>No income recorded yet — add income to start tracking.</span>`;
    } else {
      const bannerConfig = {
        'on-track': { icon: 'fa-circle-check',
          text: `On Track — ${fmtMoney(ms.savedAmount)} locked away. ${fmtMoney(ms.spendableBalance)} spendable remaining.` },
        'tight':    { icon: 'fa-triangle-exclamation',
          text: `Income below goal — only ${fmtMoney(ms.savedAmount)} of ${fmtMoney(ms.goal)} secured so far.` },
        'dipping':  { icon: 'fa-circle-exclamation',
          text: `⚠️ Over spendable budget by ${fmtMoney(Math.abs(ms.spendableBalance))} — spending into savings!` }
      };
      const cfg = bannerConfig[ms.status];
      banner.className = 'savings-status-banner ' + ms.status;
      banner.innerHTML = `<i class="fa-solid ${cfg.icon}"></i><span>${cfg.text}</span>`;
    }
  }
}

/**
 * Shows a toast if the user is over their spendable budget (dipping into savings).
 */
function checkSavingsAlert(ms) {
  if (ms.status === 'dipping') {
    setTimeout(() => {
      Toast.show(
        `⚠️ You've exceeded your spendable budget by ${fmtMoney(Math.abs(ms.spendableBalance))} — dipping into savings!`,
        'error'
      );
    }, 800);
  } else if (ms.status === 'tight' && ms.goal > 0 && ms.income > 0) {
    setTimeout(() => {
      Toast.show(
        `💡 Income (${fmtMoney(ms.income)}) is below your savings goal (${fmtMoney(ms.goal)}) this month.`,
        'warning'
      );
    }, 800);
  }
}

/**
 * Initialises the savings goal prompt modal that appears
 * the first time the user adds income in a new month.
 */
function initSavingsPromptModal() {
  const modal       = document.getElementById('savings-prompt-modal');
  const confirmBtn  = document.getElementById('prompt-savings-confirm');
  const skipBtn     = document.getElementById('prompt-savings-skip');
  const amtInput    = document.getElementById('prompt-savings-amount');
  if (!modal) return;
  // Guard: only attach listeners once
  if (modal.dataset.initialized) return;
  modal.dataset.initialized = 'true';

  // Pre-fill with existing goal
  if (amtInput) amtInput.value = Store.getSettings().monthlySavingsGoal || '';

  confirmBtn && confirmBtn.addEventListener('click', () => {
    const raw = parseFloat(amtInput.value);
    if (isNaN(raw) || raw < 0) {
      Toast.show('Please enter a valid amount.', 'error');
      return;
    }
    const updated = { ...Store.getSettings(), monthlySavingsGoal: raw };
    Store.saveSettings(updated);
    Toast.show(`Savings goal set to ${fmtMoney(raw)} 🔒`, 'success');
    modal.classList.remove('open');
    initDashboardPage(); // refresh widget
  });

  skipBtn && skipBtn.addEventListener('click', () => {
    modal.classList.remove('open');
  });
}

/* Quick Add widget on dashboard */
function initQuickAddForm() {
  const form = document.getElementById('quick-add-form');
  if (!form) return;
  // Guard: only attach listeners once
  if (form.dataset.initialized) return;
  form.dataset.initialized = 'true';

  let type = 'expense';
  const toggleBtns = form.querySelectorAll('.type-toggle button');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      type = btn.dataset.type;
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title    = form.querySelector('[name=title]').value.trim();
    const amount   = parseFloat(form.querySelector('[name=amount]').value);
    const category = form.querySelector('[name=category]').value;
    if (!title || !amount || amount <= 0) {
      Toast.show('Please fill in a valid title and amount.', 'error');
      return;
    }

    // Detect first income entry of the current month → prompt for savings goal
    const isIncome = type === 'income';
    let shouldPrompt = false;
    if (isIncome) {
      const ms = Store.getMonthlyStats();
      shouldPrompt = ms.income === 0 || Store.getSettings().monthlySavingsGoal === 0;
    }

    try {
      await Store.addTransaction({
        title, amount, category, type,
        date: new Date().toISOString().slice(0, 10),
        notes: '', status: 'Completed'
      });
      Toast.show('Transaction added successfully.', 'success');
      form.reset();
      initDashboardPage();

      if (shouldPrompt) {
        const modal    = document.getElementById('savings-prompt-modal');
        const amtInput = document.getElementById('prompt-savings-amount');
        if (modal) {
          if (amtInput) amtInput.value = Store.getSettings().monthlySavingsGoal || '';
          setTimeout(() => modal.classList.add('open'), 400);
        }
      }
    } catch (err) {
      Toast.show('Failed to add transaction. Please try again.', 'error');
    }
  });
}

/* ---------- Date helpers ---------- */
function lastNMonthLabels(n) {
  const arr = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString(undefined, { month: 'short' }) });
  }
  return arr;
}
function sumForMonth(tx, m, type) {
  return tx.filter(t => {
    const d = parseLocalDate(t.date);
    return t.type === type && d.getFullYear() === m.year && d.getMonth() === m.month;
  }).reduce((s, t) => s + Number(t.amount), 0);
}
function debounce(fn, wait) {
  let timeout;
  return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => fn(...args), wait); };
}
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* =========================================================
   TRANSACTIONS PAGE
   ========================================================= */
let txState = { search: '', dateFilter: 'all', category: 'all', sort: 'date-desc', editingId: null, deletingId: null };

function initTransactionsPage() {
  const root = document.querySelector('[data-page="transactions"]');
  if (!root) return;

  // Always re-render the table with latest data
  populateCategorySelects();
  renderTransactionsTable();

  // Guard: only attach event listeners once
  if (root.dataset.initialized) return;
  root.dataset.initialized = 'true';

  document.getElementById('tx-search').addEventListener('input', (e) => {
    txState.search = e.target.value.toLowerCase();
    renderTransactionsTable();
  });

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      txState.dateFilter = chip.dataset.range;
      renderTransactionsTable();
    });
  });

  document.getElementById('category-filter').addEventListener('change', (e) => {
    txState.category = e.target.value;
    renderTransactionsTable();
  });

  document.getElementById('sort-filter').addEventListener('change', (e) => {
    txState.sort = e.target.value;
    renderTransactionsTable();
  });

  // Modal open/close
  const modal = document.getElementById('tx-modal');
  const openAdd = () => {
    txState.editingId = null;
    document.getElementById('tx-modal-title').textContent = 'Add Transaction';
    document.getElementById('tx-form').reset();
    document.getElementById('tx-form-date').value = new Date().toISOString().slice(0, 10);
    setModalType('expense');
    modal.classList.add('open');
  };
  document.getElementById('fab-add-tx').addEventListener('click', openAdd);
  document.querySelectorAll('[data-close-modal="tx-modal"]').forEach(b => b.addEventListener('click', () => modal.classList.remove('open')));

  document.querySelectorAll('#tx-form .type-toggle button').forEach(btn => {
    btn.addEventListener('click', () => setModalType(btn.dataset.type));
  });

  document.getElementById('tx-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    // Use form.elements['title'] — form.title resolves to the HTML tooltip attribute, not the input
    const data = {
      title: (form.elements['title'].value || '').trim(),
      amount: parseFloat(form.elements['amount'].value),
      category: form.elements['category'].value,
      type: form.querySelector('.type-toggle button.active').dataset.type,
      date: form.elements['date'].value,
      notes: (form.elements['notes'] ? form.elements['notes'].value.trim() : '')
    };
    if (!data.title || !data.amount || data.amount <= 0 || !data.date) {
      Toast.show('Please complete all required fields.', 'error');
      return;
    }
    try {
      if (txState.editingId) {
        await Store.updateTransaction(txState.editingId, data);
        Toast.show('Transaction updated.', 'success');
      } else {
        await Store.addTransaction({ ...data, status: 'Completed' });
        Toast.show('Transaction added successfully.', 'success');
      }
      modal.classList.remove('open');
      renderTransactionsTable();
    } catch (err) {
      console.error('Transaction save error:', err);
      Toast.show('Error saving transaction.', 'error');
    }
  });

  // Delete confirm modal
  const delModal = document.getElementById('delete-modal');
  document.querySelectorAll('[data-close-modal="delete-modal"]').forEach(b => b.addEventListener('click', () => delModal.classList.remove('open')));
  document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (txState.deletingId) {
      try {
        await Store.deleteTransaction(txState.deletingId);
        Toast.show('Transaction deleted.', 'warning');
        renderTransactionsTable();
      } catch (err) {
        Toast.show('Error deleting transaction.', 'error');
      }
    }
    delModal.classList.remove('open');
  });
}

function setModalType(type) {
  document.querySelectorAll('#tx-form .type-toggle button').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
}

function populateCategorySelects() {
  const selects = document.querySelectorAll('.category-select, #category-filter');
  const cats = Object.keys(Store.CATEGORIES);
  selects.forEach(sel => {
    const isFilter = sel.id === 'category-filter';
    sel.innerHTML = (isFilter ? '<option value="all">All Categories</option>' : '') +
      cats.map(c => `<option value="${c}">${c}</option>`).join('');
  });
}

function renderTransactionsTable() {
  const tbody = document.getElementById('tx-table-body');
  if (!tbody) return;
  let list = Store.getTransactions();

  if (txState.search) {
    list = list.filter(t => t.title.toLowerCase().includes(txState.search) || t.category.toLowerCase().includes(txState.search));
  }
  if (txState.category !== 'all') {
    list = list.filter(t => t.category === txState.category);
  }
  if (txState.dateFilter !== 'all') {
    const now = new Date();
    list = list.filter(t => {
      const d = parseLocalDate(t.date);
      const diffDays = (now - d) / 86400000;
      if (txState.dateFilter === 'today') return diffDays < 1;
      if (txState.dateFilter === 'week') return diffDays <= 7;
      if (txState.dateFilter === 'month') return diffDays <= 31;
      if (txState.dateFilter === 'year') return diffDays <= 365;
      return true;
    });
  }
  list = [...list].sort((a, b) => {
    if (txState.sort === 'date-desc') return parseLocalDate(b.date) - parseLocalDate(a.date);
    if (txState.sort === 'date-asc') return parseLocalDate(a.date) - parseLocalDate(b.date);
    if (txState.sort === 'amount-desc') return b.amount - a.amount;
    if (txState.sort === 'amount-asc') return a.amount - b.amount;
    return 0;
  });

  document.getElementById('tx-count').textContent = `${list.length} transaction${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><p>No transactions match your filters.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(t => {
    const meta = Store.categoryMeta(t.category);
    const sign = t.type === 'income' ? '+' : '-';
    return `
    <tr data-id="${t.id}">
      <td data-label="Date">${fmtDate(t.date)}</td>
      <td data-label="Title">${escapeHTML(t.title)}</td>
      <td data-label="Category"><span class="category-pill" style="background:${meta.color}22; color:${meta.color}"><i class="fa-solid ${meta.icon}"></i> ${t.category}</span></td>
      <td data-label="Amount" class="tx-amount ${t.type}">${sign}${fmtMoney(Math.abs(t.amount))}</td>
      <td data-label="Type" style="text-transform:capitalize">${t.type}</td>
      <td data-label="Status"><span class="status-pill ${(t.status || 'Completed').toLowerCase()}">${t.status || 'Completed'}</span></td>
      <td data-label="Actions">
        <div class="row-actions">
          <button class="edit-btn" title="Edit" onclick="editTransaction('${t.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="delete-btn" title="Delete" onclick="askDeleteTransaction('${t.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Keep balance strip in sync every time the table re-renders
  renderTxBalance();
}

/* ---------- BALANCE STRIP (Transactions Page) ---------- */
function renderTxBalance() {
  const incomeEl  = document.getElementById('tx-bal-income');
  const expenseEl = document.getElementById('tx-bal-expense');
  const balanceEl = document.getElementById('tx-bal-balance');
  if (!incomeEl) return; // not on transactions page

  const all     = Store.getTransactions();
  const income  = all.filter(t => t.type === 'income') .reduce((s, t) => s + Number(t.amount), 0);
  const expense = all.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  incomeEl .textContent = fmtMoney(income);
  expenseEl.textContent = fmtMoney(expense);
  balanceEl.textContent = fmtMoney(balance);

  // Colour the balance card green/red depending on sign
  const balCard = balanceEl.closest('.tx-bal-card');
  if (balCard) {
    balCard.classList.toggle('negative', balance < 0);
  }
}

function editTransaction(id) {
  const tx = Store.getTransactions().find(t => t.id === id);
  if (!tx) return;
  txState.editingId = id;
  document.getElementById('tx-modal-title').textContent = 'Edit Transaction';
  const form = document.getElementById('tx-form');
  form.title.value = tx.title;
  form.amount.value = tx.amount;
  form.category.value = tx.category;
  form.date.value = tx.date;
  form.notes.value = tx.notes || '';
  setModalType(tx.type);
  document.getElementById('tx-modal').classList.add('open');
}

function askDeleteTransaction(id) {
  txState.deletingId = id;
  document.getElementById('delete-modal').classList.add('open');
}

/* =========================================================
   SETTINGS PAGE
   ========================================================= */
function initSettingsPage() {
  const root = document.querySelector('[data-page="settings"]');
  if (!root) return;
  // Guard: only attach event listeners once
  if (root.dataset.initialized) {
    // Just refresh display values with latest data
    const s = Store.getSettings();
    const savingsGoalInput = document.getElementById('settings-savings-goal');
    if (savingsGoalInput) savingsGoalInput.value = s.monthlySavingsGoal || 0;
    return;
  }
  root.dataset.initialized = 'true';
  const settings = Store.getSettings();

  // Prefer the currently logged-in user over the default settings
  let userName  = settings.name;
  let userEmail = settings.email;
  try {
    const currentUser = JSON.parse(localStorage.getItem('ef_current_user'));
    if (currentUser && currentUser.name)  userName  = currentUser.name;
    if (currentUser && currentUser.email) userEmail = currentUser.email;
  } catch (e) {}

  document.getElementById('settings-name').value = userName;
  document.getElementById('settings-email').value = userEmail;
  document.getElementById('settings-currency').value = settings.currency;
  document.getElementById('settings-language').value = settings.language;
  document.getElementById('notif-budget').checked = settings.notifications.budget;
  document.getElementById('notif-bills').checked = settings.notifications.bills;
  document.getElementById('notif-weekly').checked = settings.notifications.weekly;
  document.getElementById('profile-initials').textContent = initialsFrom(userName);
  const topAvatar = document.getElementById('profile-initials-top');
  if (topAvatar) topAvatar.textContent = initialsFrom(userName);
  const topChipName = document.querySelector('.profile-chip > span');
  if (topChipName) topChipName.textContent = userName;
  document.getElementById('profile-name-display').textContent = userName;
  document.getElementById('profile-email-display').textContent = userEmail;

  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName  = document.getElementById('settings-name').value.trim()  || userName;
    const newEmail = document.getElementById('settings-email').value.trim() || userEmail;
    const updated = {
      ...settings,
      name: newName,
      email: newEmail,
      currency: document.getElementById('settings-currency').value,
      language: document.getElementById('settings-language').value,
      notifications: {
        budget: document.getElementById('notif-budget').checked,
        bills: document.getElementById('notif-bills').checked,
        weekly: document.getElementById('notif-weekly').checked
      }
    };
    await Store.saveSettings(updated);

    // Also update the current-user record so name/email persist across pages
    try {
      const currentUser = JSON.parse(localStorage.getItem('ef_current_user')) || {};
      currentUser.name  = newName;
      currentUser.email = newEmail;
      localStorage.setItem('ef_current_user', JSON.stringify(currentUser));
    } catch (e) {}

    Toast.show('Settings saved successfully.', 'success');
    document.getElementById('profile-initials').textContent = initialsFrom(newName);
    if (topAvatar) topAvatar.textContent = initialsFrom(newName);
    if (topChipName) topChipName.textContent = newName;
    document.getElementById('profile-name-display').textContent = newName;
    document.getElementById('profile-email-display').textContent = newEmail;
  });

  const exportDataBtn = document.getElementById('export-data-btn');
  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', async () => {
      await Store.exportData();
      Toast.show('Your data has been exported.', 'success');
    });
  }

  const importFileInput = document.getElementById('import-file-input');
  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await Store.importData(reader.result);
          Toast.show('Data imported successfully. Reloading…', 'success');
          setTimeout(() => location.reload(), 1200);
        } catch (err) {
          Toast.show('Import failed — invalid file format.', 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  const resetModal = document.getElementById('reset-modal');
  document.getElementById('reset-data-btn').addEventListener('click', () => resetModal.classList.add('open'));
  document.querySelectorAll('[data-close-modal="reset-modal"]').forEach(b => b.addEventListener('click', () => resetModal.classList.remove('open')));
  document.getElementById('confirm-reset-btn').addEventListener('click', () => {
    Toast.show('Data reset action.', 'warning');
    resetModal.classList.remove('open');
  });

  /* ── Monthly Savings Goal editor ── */
  const savingsGoalInput = document.getElementById('settings-savings-goal');
  const savingsGoalBtn   = document.getElementById('save-savings-goal-btn');
  if (savingsGoalInput) {
    const currentGoal = Store.getSettings().monthlySavingsGoal || 0;
    savingsGoalInput.value = currentGoal;
  }
  if (savingsGoalBtn) {
    savingsGoalBtn.addEventListener('click', async () => {
      const raw = parseFloat(savingsGoalInput.value);
      if (isNaN(raw) || raw < 0) {
        Toast.show('Please enter a valid savings goal amount.', 'error');
        return;
      }
      const updated = { ...Store.getSettings(), monthlySavingsGoal: raw };
      await Store.saveSettings(updated);
      Toast.show(`Monthly savings goal set to ${fmtMoney(raw)} 🎯`, 'success');
    });
  }
}

function initialsFrom(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
}

/* ---------- INIT ---------- */
window.onAppDataReady = () => {
  // Re-render all pages with fresh data from the API.
  // Guards inside each init function prevent duplicate listener attachment.
  initDashboardPage();
  initTransactionsPage();
  initSettingsPage();
  initSavingsPromptModal();
};

document.addEventListener('DOMContentLoaded', () => {
  initDashboardPage();
  initTransactionsPage();
  initSettingsPage();
  initSavingsPromptModal();
});
