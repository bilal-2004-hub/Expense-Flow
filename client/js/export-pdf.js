/* =========================================================
   EXPENSEFLOW — export-pdf.js
   PDF export using jsPDF + autoTable.
   Import handler for multi-format file input.
   ========================================================= */

/* ── Helpers ── */
function currencySymbol(code) {
  const map = { USD: '$', EUR: '€', GBP: '£', PKR: 'Rs', INR: '₹' };
  return map[code] || code + ' ';
}

/**
 * Returns true only when today is the last calendar day of the current month.
 * The last day is computed dynamically — no hardcoded 30 or 31.
 *   Jan→31, Feb→28/29, Mar→31, Apr→30 … etc.
 */
function isLastDayOfMonth() {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return today.getDate() === lastDay;
}

/**
 * Returns only the transactions whose date falls within the current
 * calendar month (year + month must match today).
 */
function getCurrentMonthTransactions() {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  return Store.getTransactions().filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

function fmtAmount(amount, sym) {
  return sym + Number(amount).toFixed(2);
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

/* ── PDF Export ── */
function exportToPDF() {
  /* ── SECURITY GUARD: enforce last-day-of-month server-side style ── */
  if (!isLastDayOfMonth()) {
    throw new Error('PDF export is only permitted on the last day of the month.');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const settings     = Store.getSettings();
  const sym          = currencySymbol(settings.currency);
  const todayDate    = new Date();
  const today        = todayDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  /* ── Filter to current month only ── */
  const transactions = getCurrentMonthTransactions();

  /* ── Guard: no transactions this month ── */
  if (transactions.length === 0) {
    throw new Error('No transactions found for this month.');
  }

  /* ── Get logged-in user ── */
  let userName  = settings.name  || 'User';
  let userEmail = settings.email || '';
  try {
    const u = JSON.parse(localStorage.getItem('ef_current_user'));
    if (u && u.name)  userName  = u.name;
    if (u && u.email) userEmail = u.email;
  } catch (e) {}

  /* ── Palette ── */
  const C = {
    primary:   [37, 99, 235],
    income:    [34, 197, 94],
    expense:   [239, 68, 68],
    dark:      [15, 23, 42],
    secondary: [100, 116, 139],
    bg:        [248, 250, 252],
    white:     [255, 255, 255],
    border:    [226, 232, 240]
  };

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 14;

  /* ════════════════════════════════════════
     HEADER BANNER
  ════════════════════════════════════════ */
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 44, 'F');

  // Logo mark square
  doc.setFillColor(255, 255, 255, 0.18);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, 11, 22, 22, 4, 4, 'FD');

  // Wave-square logo mark (drawn vector)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  doc.line(18, 24, 21, 24);   // flat start
  doc.line(21, 24, 21, 18);   // go up
  doc.line(21, 18, 24, 18);   // flat top
  doc.line(24, 18, 24, 26);   // go down
  doc.line(24, 26, 27, 26);   // flat bottom
  doc.line(27, 26, 27, 18);   // go up
  doc.line(27, 18, 30, 18);   // flat top
  doc.line(30, 18, 30, 24);   // go down
  doc.line(30, 24, 33, 24);   // flat end

  // App name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ExpenseFlow', margin + 26, 21);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 210, 255);
  doc.text('Financial Transactions Report', margin + 26, 28.5);

  // Date top-right
  doc.setTextColor(200, 220, 255);
  doc.setFontSize(8);
  doc.text(`Generated: ${today}`, W - margin, 20, { align: 'right' });
  doc.text(`User: ${userName}`, W - margin, 27, { align: 'right' });
  if (userEmail) doc.text(userEmail, W - margin, 34, { align: 'right' });

  /* ════════════════════════════════════════
     SUMMARY CARDS
  ════════════════════════════════════════ */
  let totalIncome  = 0;
  let totalExpense = 0;
  transactions.forEach(t => {
    if (t.status === 'Pending') return;
    if (t.type === 'income')  totalIncome  += Number(t.amount);
    if (t.type === 'expense') totalExpense += Number(t.amount);
  });
  const balance = totalIncome - totalExpense;

  const cardY   = 52;
  const cardH   = 28;
  const cardGap = 5;
  const cardW   = (W - margin * 2 - cardGap * 2) / 3;

  const cards = [
    { label: 'Total Income',   value: fmtAmount(totalIncome,  sym), color: C.income  },
    { label: 'Total Expenses', value: fmtAmount(totalExpense, sym), color: C.expense },
    { label: 'Net Balance',    value: fmtAmount(balance,      sym), color: balance >= 0 ? C.income : C.expense }
  ];

  cards.forEach((card, i) => {
    const cx = margin + i * (cardW + cardGap);
    doc.setFillColor(...C.bg);
    doc.roundedRect(cx, cardY, cardW, cardH, 3, 3, 'F');
    // Top colour bar
    doc.setFillColor(...card.color);
    doc.roundedRect(cx, cardY, cardW, 3.5, 1.5, 1.5, 'F');

    doc.setTextColor(...C.secondary);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label.toUpperCase(), cx + 7, cardY + 12);

    doc.setTextColor(...card.color);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(card.value, cx + 7, cardY + 22);
  });

  /* ════════════════════════════════════════
     SECTION TITLE
  ════════════════════════════════════════ */
  const titleY = cardY + cardH + 12;

  doc.setTextColor(...C.dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction History', margin, titleY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.secondary);
  const monthLabel = todayDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  doc.text(`${transactions.length} record${transactions.length !== 1 ? 's' : ''} · ${monthLabel}`, W - margin, titleY, { align: 'right' });

  // Thin divider line
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.line(margin, titleY + 3, W - margin, titleY + 3);

  /* ════════════════════════════════════════
     TRANSACTION TABLE
  ════════════════════════════════════════ */
  const rows = transactions.map(t => [
    fmtDate(t.date),
    t.title        || '—',
    t.category     || '—',
    t.type === 'income' ? 'Income' : 'Expense',
    fmtAmount(t.amount, sym),
    t.status       || '—'
  ]);

  doc.autoTable({
    startY: titleY + 6,
    head: [['Date', 'Description', 'Category', 'Type', 'Amount', 'Status']],
    body: rows,
    margin: { left: margin, right: margin },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3.5,
      textColor: C.dark,
      lineColor: C.border,
      lineWidth: 0.3
    },
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: C.bg
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 26 },
      3: { cellWidth: 24 },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 26 }
    },
    didParseCell(data) {
      // Colour-code Type column
      if (data.column.index === 3 && data.section === 'body') {
        data.cell.styles.textColor = data.cell.raw === 'Income' ? C.income : C.expense;
        data.cell.styles.fontStyle = 'bold';
      }
      // Colour-code Amount column
      if (data.column.index === 4 && data.section === 'body') {
        const row = transactions[data.row.index];
        if (row) {
          data.cell.styles.textColor = row.type === 'income' ? C.income : C.expense;
        }
      }
    }
  });

  /* ════════════════════════════════════════
     FOOTER on every page
  ════════════════════════════════════════ */
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(margin, H - 12, W - margin, H - 12);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.secondary);
    doc.text('ExpenseFlow — Confidential Financial Report', margin, H - 7);
    doc.text(`Page ${p} of ${pageCount}`, W - margin, H - 7, { align: 'right' });
  }

  /* ── Download ── */
  const filename = `ExpenseFlow-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/* ════════════════════════════════════════
   WIRE UP on DOMContentLoaded
   (runs after dashboard.js has already
    registered the old export click handler,
    so we replace it cleanly)
   ════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* Replace export handler */
  const exportBtn = document.getElementById('export-data-btn');
  const exportHint = document.getElementById('export-pdf-hint');

  if (exportBtn) {
    const lastDay = isLastDayOfMonth();

    if (lastDay) {
      /* ── Last day of month: enable the button ── */
      exportBtn.disabled = false;
      exportBtn.style.opacity = '';
      exportBtn.style.cursor  = '';
      if (exportHint) {
        exportHint.textContent = '';
        exportHint.style.display = 'none';
      }
    } else {
      /* ── Any other day: disable the button and show hint ── */
      exportBtn.disabled = true;
      exportBtn.style.opacity = '0.5';
      exportBtn.style.cursor  = 'not-allowed';
      if (exportHint) {
        exportHint.textContent = 'Monthly PDF reports can only be exported on the last day of the month.';
        exportHint.style.display = 'block';
      }
    }

    // Clone to remove any previously attached listeners
    const freshBtn = exportBtn.cloneNode(true);
    exportBtn.parentNode.replaceChild(freshBtn, exportBtn);

    /* Re-apply disabled state after clone (cloneNode copies attributes but not JS props) */
    if (!lastDay) {
      freshBtn.disabled = true;
      freshBtn.style.opacity = '0.5';
      freshBtn.style.cursor  = 'not-allowed';
    }

    freshBtn.addEventListener('click', () => {
      /* Extra guard: re-check in the handler so it cannot be bypassed via console */
      if (!isLastDayOfMonth()) {
        Toast.show('PDF export is only available on the last day of the month.', 'error');
        return;
      }
      try {
        const monthTxns = getCurrentMonthTransactions();
        if (monthTxns.length === 0) {
          Toast.show('No transactions found for this month.', 'error');
          return;
        }
        exportToPDF();
        Toast.show('PDF report downloaded successfully!', 'success');
      } catch (err) {
        console.error(err);
        /* Surface meaningful messages to the user */
        if (err.message === 'No transactions found for this month.') {
          Toast.show('No transactions found for this month.', 'error');
        } else if (err.message && err.message.includes('only permitted')) {
          Toast.show('PDF export is only available on the last day of the month.', 'error');
        } else {
          Toast.show('PDF generation failed. Please try again.', 'error');
        }
      }
    });
  }
});
