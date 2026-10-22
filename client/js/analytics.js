/* =========================================================
   EXPENSEFLOW — analytics.js
   Powers the Analytics page: trend chart, category breakdown,
   top categories, monthly/weekly comparison, heatmap, insights.
   Relies on Charts helpers + formatters defined in dashboard.js.
   ========================================================= */

function initAnalyticsPage() {
  const root = document.querySelector('[data-page="analytics"]');
  if (!root) return;

  const tx = Store.getTransactions().filter(t => t.status !== 'Pending');
  renderAnalyticsTrend(tx);
  renderAnalyticsDonut(tx);
  renderTopCategories(tx);
  renderMonthlyComparison(tx);
  renderWeeklyComparison(tx);
  renderSavingsProgressAnalytics();
  renderHeatmap(tx);
  renderInsights(tx);
}

function renderAnalyticsTrend(tx) {
  const canvas = document.getElementById('analytics-trend-chart');
  if (!canvas) return;
  const months = lastNMonthLabels(6);
  const income = months.map(m => sumForMonth(tx, m, 'income'));
  const expense = months.map(m => sumForMonth(tx, m, 'expense'));
  Charts.lineBarChart(canvas, { labels: months.map(m => m.label), income, expense });
  window.addEventListener('resize', debounce(() => Charts.lineBarChart(canvas, { labels: months.map(m => m.label), income, expense }), 200));
}

function renderAnalyticsDonut(tx) {
  const canvas = document.getElementById('analytics-donut');
  const legend = document.getElementById('analytics-legend');
  if (!canvas) return;
  const byCategory = {};
  tx.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
  });
  const segments = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, value]) => ({ label: cat, value, color: Store.categoryMeta(cat).color }));
  Charts.donutChart(canvas, segments);
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  if (legend) {
    legend.innerHTML = segments.map(seg => `
      <div class="category-row">
        <span class="cat-dot" style="background:${seg.color}"></span>
        <span class="cat-name">${seg.label}</span>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${(seg.value/total*100).toFixed(0)}%; background:${seg.color}"></div></div>
        <span class="cat-amount">${fmtMoney(seg.value)}</span>
      </div>`).join('');
  }
}

function renderTopCategories(tx) {
  const root = document.getElementById('top-categories');
  if (!root) return;
  const byCategory = {};
  tx.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
  });
  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = top.length ? top[0][1] : 1;
  root.innerHTML = top.map(([cat, value]) => {
    const meta = Store.categoryMeta(cat);
    return `
    <div class="category-row">
      <span class="cat-dot" style="background:${meta.color}"></span>
      <span class="cat-name">${cat}</span>
      <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${(value/max*100).toFixed(0)}%; background:${meta.color}"></div></div>
      <span class="cat-amount">${fmtMoney(value)}</span>
    </div>`;
  }).join('') || `<p style="color:var(--text-secondary);font-size:0.88rem;">No expense data yet.</p>`;
}

function renderMonthlyComparison(tx) {
  const root = document.getElementById('monthly-comparison');
  if (!root) return;
  const months = lastNMonthLabels(4);
  const values = months.map(m => sumForMonth(tx, m, 'expense'));
  const max = Math.max(...values, 1);
  root.innerHTML = months.map((m, i) => `
    <div class="progress-label-row"><span>${m.label}</span><span>${fmtMoney(values[i])}</span></div>
    <div class="progress-bar-track mt-20" style="margin-bottom:16px;"><div class="progress-bar-fill" style="width:${(values[i]/max*100).toFixed(0)}%"></div></div>
  `).join('');
}

function renderWeeklyComparison(tx) {
  const root = document.getElementById('weekly-comparison');
  if (!root) return;
  const now = new Date();
  const weeks = [3, 2, 1, 0].map(offset => {
    const end = new Date(now); end.setDate(end.getDate() - offset * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const value = tx.filter(t => {
      const d = parseLocalDate(t.date);
      return t.type === 'expense' && d >= start && d <= end;
    }).reduce((s, t) => s + Number(t.amount), 0);
    return { label: `Week ${4 - offset}`, value };
  });
  const max = Math.max(...weeks.map(w => w.value), 1);
  root.innerHTML = weeks.map(w => `
    <div class="progress-label-row"><span>${w.label}</span><span>${fmtMoney(w.value)}</span></div>
    <div class="progress-bar-track" style="margin-bottom:16px;"><div class="progress-bar-fill" style="width:${(w.value/max*100).toFixed(0)}%; background:var(--warning)"></div></div>
  `).join('');
}

function renderSavingsProgressAnalytics() {
  const bar = document.getElementById('analytics-savings-fill');
  if (!bar) return;

  // Use getMonthlyStats() for real saved/goal values — settings.savingsCurrent doesn't exist
  const ms = Store.getMonthlyStats();
  const savedAmount = ms.savedAmount || 0;
  const goal = ms.goal || 0;

  // Safe percentage: avoid NaN when goal is 0
  const pct = goal > 0 ? Math.min(Math.round((savedAmount / goal) * 100), 100) : (savedAmount > 0 ? 100 : 0);

  const labelEl = document.getElementById('analytics-savings-label');
  const pctEl   = document.getElementById('analytics-savings-pct');

  if (goal > 0) {
    if (labelEl) labelEl.textContent = `${fmtMoney(savedAmount)} saved of ${fmtMoney(goal)} goal`;
  } else {
    if (labelEl) labelEl.textContent = 'No savings goal set — visit Settings to add one.';
  }
  if (pctEl) pctEl.textContent = pct + '%';
  requestAnimationFrame(() => { bar.style.width = pct + '%'; });
}

function renderHeatmap(tx) {
  const root = document.getElementById('spending-heatmap');
  if (!root) return;
  const days = 91; // ~13 weeks
  const totals = {};
  tx.filter(t => t.type === 'expense').forEach(t => {
    totals[t.date] = (totals[t.date] || 0) + Number(t.amount);
  });
  const max = Math.max(...Object.values(totals), 1);
  const cells = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    const value = totals[iso] || 0;
    const intensity = value / max;
    cells.push(`<div class="heatmap-cell" title="${iso}: ${fmtMoney(value)}" style="background:${intensityColor(intensity)}"></div>`);
  }
  root.innerHTML = cells.join('');
}

function intensityColor(intensity) {
  if (intensity === 0) return 'var(--bg)';
  const stops = ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a'];
  const idx = Math.min(Math.floor(intensity * stops.length), stops.length - 1);
  return stops[idx];
}

function renderInsights(tx) {
  const root = document.getElementById('financial-insights');
  if (!root) return;
  const expenseTx = tx.filter(t => t.type === 'expense');
  const income = tx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = expenseTx.reduce((s, t) => s + Number(t.amount), 0);
  const savingsRate = income > 0 ? Math.max(Math.round(((income - expense) / income) * 100), 0) : 0;
  const byCategory = {};
  expenseTx.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount); });
  const topCat = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const avgTx = expenseTx.length ? expense / expenseTx.length : 0;

  const insights = [
    { icon: 'fa-piggy-bank', color: 'var(--success)', title: `${savingsRate}%`, sub: 'Savings rate this period' },
    { icon: 'fa-chart-pie', color: 'var(--primary)', title: topCat ? topCat[0] : '—', sub: 'Top spending category' },
    { icon: 'fa-receipt', color: 'var(--warning)', title: fmtMoney(avgTx), sub: 'Average transaction size' },
    { icon: 'fa-arrow-trend-up', color: 'var(--expense)', title: expenseTx.length.toString(), sub: 'Total expense entries' }
  ];
  root.innerHTML = insights.map(i => `
    <div class="insight-card">
      <div class="insight-icon" style="background:${i.color}"><i class="fa-solid ${i.icon}"></i></div>
      <div>
        <h4>${i.title}</h4>
        <p>${i.sub}</p>
      </div>
    </div>`).join('');
}

window.onAppDataReady = () => {
  initAnalyticsPage();
};

document.addEventListener('DOMContentLoaded', initAnalyticsPage);
