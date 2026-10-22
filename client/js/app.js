/* =========================================================
   EXPENSEFLOW — app.js
   Shared across every page: theme, sidebar/hamburger, toasts,
   ripple effect, scroll reveal, back-to-top, landing page bits.
   ========================================================= */

/* ---------- THEME (DARK MODE) ---------- */
const Theme = {
  init() {
    const settings = Store.getSettings();
    const saved = settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    document.querySelectorAll('.theme-toggle-input').forEach(el => {
      el.checked = saved === 'dark';
    });
  },
  toggle(isDark) {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    const settings = Store.getSettings();
    settings.theme = theme;
    Store.saveSettings(settings);
  }
};

/* ---------- TOASTS ---------- */
const Toast = {
  container: null,
  init() {
    this.container = document.querySelector('.toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'success') {
    if (!this.container) this.init();
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.success}"></i><span>${message}</span>`;
    this.container.appendChild(el);
    setTimeout(() => {
      el.classList.add('hide');
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }
};

/* ---------- RIPPLE EFFECT ---------- */
function attachRipple() {
  document.querySelectorAll('.btn, .fab, .filter-chip').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const computedPos = window.getComputedStyle(this).position;
      if (computedPos === 'static') {
        this.style.position = 'relative';
      }
      const rect = this.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

/* ---------- SIDEBAR / MOBILE NAV (app pages) ---------- */
function initSidebar() {
  const sidebar = document.querySelector('.app-sidebar');
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const closeBtn = document.querySelector('.sidebar-close');
  const scrim = document.querySelector('.overlay-scrim');
  if (!sidebar) return;

  const open = () => { sidebar.classList.add('open'); scrim && scrim.classList.add('show'); };
  const close = () => { sidebar.classList.remove('open'); scrim && scrim.classList.remove('show'); };

  menuBtn && menuBtn.addEventListener('click', open);
  closeBtn && closeBtn.addEventListener('click', close);
  scrim && scrim.addEventListener('click', close);

  // Highlight active link based on filename
  const current = location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === current) a.classList.add('active');
  });
}

/* ---------- LANDING NAV SCROLL STATE ---------- */
function initLandingNav() {
  const nav = document.querySelector('.landing-nav');
  if (!nav) return;
  const onScroll = () => {
    if (window.scrollY > 30) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll);
  onScroll();

  const hamburger = document.querySelector('.hamburger');
  const menu = document.querySelector('.nav-menu');
  hamburger && hamburger.addEventListener('click', () => {
    menu.classList.toggle('mobile-open');
    if (menu.classList.contains('mobile-open')) {
      menu.style.display = 'flex';
      menu.style.position = 'absolute';
      menu.style.top = '100%';
      menu.style.left = '0';
      menu.style.right = '0';
      menu.style.flexDirection = 'column';
      menu.style.background = 'var(--card)';
      menu.style.padding = '20px 24px';
      menu.style.boxShadow = 'var(--shadow-md)';
      menu.style.borderRadius = '0 0 16px 16px';
    } else {
      menu.style.display = '';
    }
  });
}

/* ---------- SCROLL REVEAL ---------- */
function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05 });
  items.forEach(el => io.observe(el));
}

/* ---------- BACK TO TOP ---------- */
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 400);
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---------- FAQ ACCORDION ---------- */
function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    question && question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('active');
        i.querySelector('.faq-answer').style.maxHeight = null;
      });
      if (!isActive) {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

/* ---------- NEWSLETTER FORM ---------- */
function initNewsletter() {
  const form = document.querySelector('.newsletter-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    Toast.show("You're subscribed! Watch your inbox for updates.", 'success');
    form.reset();
  });
}

/* ---------- ANIMATED COUNTERS (landing hero stats) ---------- */
function animateCounter(el, target, duration = 1400) {
  const start = 0;
  const startTime = performance.now();
  const isDecimal = target % 1 !== 0;
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = start + (target - start) * eased;
    el.textContent = isDecimal ? value.toFixed(1) : Math.round(value).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = isDecimal ? target.toFixed(1) : target.toLocaleString();
  }
  requestAnimationFrame(tick);
}

function initHeroCounters() {
  document.querySelectorAll('[data-counter]').forEach(el => {
    const target = parseFloat(el.getAttribute('data-counter'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(el, target);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    io.observe(el);
  });
}

/* ---------- SMOOTH SCROLL FOR ANCHOR LINKS ---------- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

/* ---------- PAGE LOADER ---------- */
function initPageLoader() {
  const loader = document.querySelector('.page-loader');
  if (!loader) return;
  window.addEventListener('load', () => {
    setTimeout(() => loader.classList.add('hidden'), 350);
  });
}

/* ---------- GREETING ---------- */
function setGreeting() {
  const el = document.querySelector('[data-greeting]');
  if (!el) return;
  const hour = new Date().getHours();
  const settings = Store.getSettings();
  let name = settings.name || '';
  if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
    name = firebase.auth().currentUser.displayName || name;
  }
  const firstName = (name || 'there').split(' ')[0];
  let phrase = 'Good evening';
  if (hour < 12) phrase = 'Good morning';
  else if (hour < 18) phrase = 'Good afternoon';
  el.textContent = `${phrase}, ${firstName} 👋`;
}

/* ---------- TOPBAR USER NAME, INITIALS & AVATAR ---------- */
function setTopbarUser() {
  let name = '';
  let email = '';
  let avatar = '';

  if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
    const user = firebase.auth().currentUser;
    name = user.displayName || '';
    email = user.email || '';
    avatar = user.photoURL || '';
  }

  const settings = Store.getSettings();
  if (!name) name = settings.name || 'User';
  if (!email) email = settings.email || '';
  if (!avatar) avatar = settings.avatar || localStorage.getItem('ef_user_avatar') || '';

  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('') || 'U';

  // ── Generic topbar elements (all pages) ──
  const nameEl = document.getElementById('topbar-user-name');
  if (nameEl) nameEl.textContent = name;

  // ── Topbar profile avatar chips (all pages) ──
  document.querySelectorAll('.profile-chip .avatar-circle').forEach(circle => {
    if (avatar) {
      circle.innerHTML = `<img src="${avatar}" alt="${name}">`;
    } else {
      circle.textContent = initials;
      circle.style.display = '';
    }
  });

  // ── Settings page — topbar profile chip name ──
  const topChipName = document.querySelector('.profile-chip > span');
  if (topChipName) topChipName.textContent = name;

  // ── Settings page — large avatar & profile card ──
  const profileAvatarContainer = document.getElementById('profile-avatar-container');
  const bigInitials = profileAvatarContainer ? profileAvatarContainer.querySelector('#profile-initials') : null;
  const avatarImg = document.getElementById('profile-avatar-img');
  const removeBtn = document.getElementById('avatar-remove-btn');
  const profileName = document.getElementById('profile-name-display');
  const profileEmail = document.getElementById('profile-email-display');

  if (avatar) {
    if (avatarImg) {
      avatarImg.src = avatar;
      avatarImg.style.display = 'block';
    }
    if (bigInitials) bigInitials.style.display = 'none';
    if (removeBtn) removeBtn.style.display = 'flex';
  } else {
    if (avatarImg) {
      avatarImg.src = '';
      avatarImg.style.display = 'none';
    }
    if (bigInitials) {
      bigInitials.textContent = initials;
      bigInitials.style.display = '';
    }
    if (removeBtn) removeBtn.style.display = 'none';
  }

  if (profileName) profileName.textContent = name;
  if (profileEmail) profileEmail.textContent = email;

  // ── Settings page — pre-fill form inputs ──
  const inputName = document.getElementById('settings-name');
  const inputEmail = document.getElementById('settings-email');
  if (inputName && !inputName.value) inputName.value = name;
  if (inputEmail && !inputEmail.value) inputEmail.value = email;

  // ── Settings page — profile progress bar ──
  updateProfileCompletion({ name, email, avatar, monthlySavingsGoal: settings.monthlySavingsGoal });
}

/* ---------- DYNAMIC PROFILE COMPLETION CALCULATOR ---------- */
function updateProfileCompletion(data) {
  const fillEl = document.getElementById('profile-progress-fill');
  const textEl = document.getElementById('profile-progress-text');
  if (!fillEl || !textEl) return;

  const s = (typeof Store !== 'undefined' && Store.getSettings) ? Store.getSettings() : {};
  let name = (data && data.name !== undefined) ? data.name : (s.name || '');
  let email = (data && data.email !== undefined) ? data.email : (s.email || '');
  let avatar = (data && data.avatar !== undefined) ? data.avatar : (s.avatar || localStorage.getItem('ef_user_avatar') || '');
  let savingsGoal = (data && data.monthlySavingsGoal !== undefined) ? data.monthlySavingsGoal : (s.monthlySavingsGoal || 0);

  try {
    const currentUser = JSON.parse(localStorage.getItem('ef_current_user'));
    if (currentUser) {
      if (!name && currentUser.name) name = currentUser.name;
      if (!email && currentUser.email) email = currentUser.email;
      if (!avatar && currentUser.photoURL) avatar = currentUser.photoURL;
    }
  } catch (e) {}

  const hasName = Boolean(name && name.trim() && name.trim().toLowerCase() !== 'user');
  const hasEmail = Boolean(email && email.trim());
  const hasAvatar = Boolean(avatar && avatar.trim());
  const hasSavingsGoal = Boolean(Number(savingsGoal) > 0);

  const criteria = [hasName, hasEmail, hasAvatar, hasSavingsGoal];
  const completedCount = criteria.filter(Boolean).length;
  const percentage = Math.round((completedCount / criteria.length) * 100);

  fillEl.style.width = `${percentage}%`;

  if (percentage === 100) {
    fillEl.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    textEl.innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--success);font-size:0.88rem;"></i> <strong style="color:var(--success);">Profile 100% complete</strong>';
  } else {
    fillEl.style.background = 'var(--gradient-primary)';
    let hint = '';
    if (!hasAvatar) {
      hint = ' (add photo +25%)';
    } else if (!hasSavingsGoal) {
      hint = ' (set savings goal +25%)';
    }
    textEl.innerHTML = `Profile ${percentage}% complete <span style="opacity:0.75;font-size:0.75rem;">${hint}</span>`;
  }
}
window.updateProfileCompletion = updateProfileCompletion;

/* ---------- AUTH STATE GUARD ---------- */
function initAuthGuard() {
  const protectedPages = ['dashboard.html', 'transactions.html', 'analytics.html', 'settings.html'];
  const pageName = location.pathname.split('/').pop() || 'index.html';
  const isProtected = protectedPages.includes(pageName);
  const isLanding = pageName === 'index.html' || pageName === '';

  // Synchronize dashboard links on landing page with Remember Me status
  function updateLandingDashboardLinks(isRemembered) {
    if (!isLanding) return;
    const target = isRemembered ? 'dashboard.html' : 'login.html';
    document.querySelectorAll('#explore-dashboard-btn, .explore-dashboard-btn').forEach(btn => {
      btn.setAttribute('href', target);
    });
  }

  // Pre-check on initial load
  const hasRememberMe = localStorage.getItem('ef_remember_me') === 'true' && Boolean(localStorage.getItem('ef_id_token'));
  updateLandingDashboardLinks(hasRememberMe);

  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        // User logged in
        try {
          const token = await user.getIdToken();
          localStorage.setItem('ef_id_token', token);
        } catch (e) { }

        const isRemembered = localStorage.getItem('ef_remember_me') === 'true';
        updateLandingDashboardLinks(isRemembered);

        // Fetch settings & transactions for authenticated user
        await Store.fetchSettings();
        await Store.fetchTransactions();

        setGreeting();
        setTopbarUser();

        // Set ExpenseFlow logo destination based on current page
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        const dashboardPages = [
          'dashboard.html',
          'transactions.html',
          'analytics.html',
          'settings.html'
        ];

        document.querySelectorAll('.logo').forEach(logo => {
          if (currentPage === 'index.html' || currentPage === '') {
            // On landing page, logo always stays on landing page
            logo.href = 'index.html';
          } else if (dashboardPages.includes(currentPage)) {
            // Inside the application, logo always goes back to dashboard
            logo.href = 'dashboard.html';
          }
        });
        //Trigger page-specific initializers if data is now ready
        if (typeof window.onAppDataReady === 'function') {
          window.onAppDataReady();
        }
      } else {
        // User logged out
        updateLandingDashboardLinks(false);
        localStorage.removeItem('ef_id_token');
        localStorage.removeItem('ef_current_user');

        if (isProtected) {
          window.location.href = 'login.html';
        }
      }
    });
  }
}

/* ---------- INIT ALL (runs on every page) ---------- */
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  Toast.init();
  attachRipple();
  initSidebar();
  initLandingNav();
  initScrollReveal();
  initBackToTop();
  initFAQ();
  initNewsletter();
  initHeroCounters();
  initSmoothScroll();
  initPageLoader();
  setGreeting();
  setTopbarUser();
  initAuthGuard();

  // Intercept explore dashboard clicks on landing page
  document.addEventListener('click', (e) => {
    const exploreBtn = e.target.closest('#explore-dashboard-btn, .explore-dashboard-btn');
    if (exploreBtn) {
      const isRemembered = localStorage.getItem('ef_remember_me') === 'true' && Boolean(localStorage.getItem('ef_id_token'));
      if (!isRemembered) {
        e.preventDefault();
        window.location.href = 'login.html';
      }
    }
  });

  // Intercept logout link clicks to cleanly clear the user session
  document.querySelectorAll('a').forEach(a => {
    if (a.textContent.includes('Logout')) {
      a.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          if (typeof firebase !== 'undefined' && firebase.auth) {
            await firebase.auth().signOut();
          }
        } catch (err) { }
        localStorage.removeItem('ef_id_token');
        localStorage.removeItem('ef_current_user');
        localStorage.removeItem('ef_remember_me');
        window.location.href = 'index.html';
      });
    }
  });

  // Global theme toggle switches
  document.querySelectorAll('.theme-toggle-input').forEach(input => {
    input.addEventListener('change', (e) => Theme.toggle(e.target.checked));
  });
});

