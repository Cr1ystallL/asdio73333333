const STORAGE_KEY = 'konveer_real_state_v2';

// Clean zero-state: no phantom accounts, no fake campaigns, no fake avatars
const DEFAULT_STATE = {
  advertiserProfile: null,
  clipperProfile: null,
  campaigns: [],
  submissions: [],
  clipperLedger: [],
  advertiserLedger: []
};

function loadState() {
  let local = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) local = JSON.parse(raw);
  } catch (e) {}

  let synced = null;
  try {
    if (window.name && window.name.includes('"__konveer_sync":true')) {
      const parsedName = JSON.parse(window.name);
      if (parsedName && parsedName.__konveer_sync && parsedName.state) {
        synced = parsedName.state;
      }
    }
  } catch (e) {}

  let source = local;
  if (synced && (!local || (synced.updatedAt || 0) >= (local.updatedAt || 0))) {
    source = {
      ...synced,
      clipperProfile: synced.clipperProfile || local?.clipperProfile || null,
      advertiserProfile: synced.advertiserProfile || local?.advertiserProfile || null
    };
  }

  if (!source) {
    const clean = structuredClone(DEFAULT_STATE);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return clean;
  }

  const normalized = {
    updatedAt: source.updatedAt || Date.now(),
    advertiserProfile: source.advertiserProfile || null,
    clipperProfile: source.clipperProfile || null,
    campaigns: Array.isArray(source.campaigns) ? source.campaigns : [],
    submissions: Array.isArray(source.submissions) ? source.submissions : [],
    clipperLedger: Array.isArray(source.clipperLedger) ? source.clipperLedger : [],
    advertiserLedger: Array.isArray(source.advertiserLedger) ? source.advertiserLedger : []
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  try {
    window.name = JSON.stringify({ __konveer_sync: true, state: normalized });
  } catch (e) {}
  return normalized;
}

function saveState(state) {
  state.updatedAt = Date.now();
  const str = JSON.stringify(state);
  localStorage.setItem(STORAGE_KEY, str);
  try {
    window.name = JSON.stringify({ __konveer_sync: true, state });
  } catch (e) {}
}

function formatMoney(num) {
  return Math.round(num || 0).toLocaleString('ru-RU') + ' ₽';
}

function formatNumber(num) {
  return Math.round(num || 0).toLocaleString('ru-RU');
}

function getInitials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/[\s_.-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getLastDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : '————';
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3400);
}

// Modern Web Guidance: validate-input-after-interaction fallback & ARIA sync
const UserInvalidFallback = (() => {
  const dirtyState = new WeakMap();
  const updateState = (input) => {
    const isValid = input.checkValidity();
    input.classList.toggle('user-invalid-fallback', !isValid);
    input.classList.toggle('user-valid-fallback', isValid);
    if (!isValid) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  };
  const handleEvent = (event) => {
    const input = event.target;
    if (event.type === 'reset') {
      const controls = input.elements || [];
      for (const control of controls) {
        dirtyState.delete(control);
        control.classList.remove('user-invalid-fallback', 'user-valid-fallback');
        control.removeAttribute('aria-invalid');
      }
      return;
    }
    if (!input || !input.checkValidity) return;
    if (event.type === 'input' || event.type === 'change') {
      const s = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      s.hasInteracted = true;
      dirtyState.set(input, s);
      if (s.hasBlurred) updateState(input);
    } else if (event.type === 'blur') {
      const s = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      s.hasBlurred = true;
      dirtyState.set(input, s);
      if (s.hasInteracted) updateState(input);
    }
  };
  const init = (root = document) => {
    if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('selector(:user-invalid)')) {
      const syncAria = (el) => {
        if (el && el.matches) {
          el.setAttribute('aria-invalid', el.matches(':user-invalid') ? 'true' : 'false');
        }
      };
      root.addEventListener('blur', (e) => syncAria(e.target), true);
      root.addEventListener('input', (e) => {
        if (e.target && e.target.hasAttribute && e.target.hasAttribute('aria-invalid')) syncAria(e.target);
      });
      return;
    }
    root.addEventListener('blur', handleEvent, true);
    root.addEventListener('input', handleEvent);
    root.addEventListener('change', handleEvent);
    root.addEventListener('reset', handleEvent, true);
  };
  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  UserInvalidFallback.init(document);

  let state = loadState();
  let activeCategory = 'ALL';
  let activePlatform = 'ALL';
  let activeClipStatus = 'ALL';

  const sidebar = document.getElementById('sidebar');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const authDialog = document.getElementById('auth-dialog');
  const orderDetailDialog = document.getElementById('order-detail-dialog');
  const submitClipDialog = document.getElementById('submit-clip-dialog');

  // Setup closedBy fallback for <dialog>
  [authDialog, orderDetailDialog, submitClipDialog].forEach((dlg) => {
    if (dlg && !('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e, d) => {
        const r = d.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOut = false;
      dlg.addEventListener('pointerdown', (e) => {
        pressedOut = e.target === dlg && isOutside(e, dlg);
      });
      dlg.addEventListener('pointerup', (e) => {
        if (pressedOut && e.target === dlg && isOutside(e, dlg)) {
          dlg.close();
        }
        pressedOut = false;
      });
    }
  });

  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('is-open');
    });
  }

  // Show password toggle in registration form
  const togglePassBtn = document.getElementById('toggle-pass-btn');
  const authPassInput = document.getElementById('auth-password');
  if (togglePassBtn && authPassInput) {
    togglePassBtn.addEventListener('click', () => {
      const isPass = authPassInput.type === 'password';
      authPassInput.type = isPass ? 'text' : 'password';
      togglePassBtn.textContent = isPass ? 'Скрыть' : 'Показать';
    });
  }

  // Ensure user is prompted to register if no profile exists
  function requireAuth() {
    if (!state.clipperProfile) {
      if (authDialog && !authDialog.open) {
        authDialog.showModal();
      }
      return false;
    }
    return true;
  }

  // Open auth dialog when clicking topbar or home CTA
  document.getElementById('topbar-user-btn')?.addEventListener('click', () => {
    if (!state.clipperProfile) {
      authDialog?.showModal();
    } else {
      switchTab('profile');
    }
  });

  document.getElementById('home-auth-cta')?.addEventListener('click', () => {
    authDialog?.showModal();
  });

  document.getElementById('home-copy-token-btn')?.addEventListener('click', () => {
    if (!requireAuth()) return;
    navigator.clipboard?.writeText(state.clipperProfile.verificationCode);
    showToast(`Токен ${state.clipperProfile.verificationCode} скопирован в буфер`);
  });

  // =========================================================================
  // 2-STEP REGISTRATION VIA TELEGRAM @VerificationCodes
  // =========================================================================
  let pendingAuthData = null;
  let otpSessionToken = '';
  let otpRequestId = '';
  let otpFallbackCode = '';
  let otpTimerId = null;

  const authFormStep1 = document.getElementById('auth-form');
  const authFormStep2 = document.getElementById('auth-otp-form');
  const otpTargetPhoneEl = document.getElementById('otp-target-phone');
  const otpSandboxBox = document.getElementById('otp-sandbox-box');
  const otpSandboxCodeEl = document.getElementById('otp-sandbox-code');
  const otpInput = document.getElementById('auth-otp-code');
  const otpResendBtn = document.getElementById('otp-resend-btn');
  const otpBackBtn = document.getElementById('otp-back-btn');
  const otpAutofillBtn = document.getElementById('otp-autofill-btn');
  const authSendBtn = document.getElementById('auth-send-code-btn');

  function startOtpTimer(seconds = 45) {
    if (otpTimerId) clearInterval(otpTimerId);
    let left = seconds;
    if (otpResendBtn) {
      otpResendBtn.disabled = true;
      otpResendBtn.textContent = `Повторно через ${left} с`;
    }
    otpTimerId = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(otpTimerId);
        otpTimerId = null;
        if (otpResendBtn) {
          otpResendBtn.disabled = false;
          otpResendBtn.textContent = 'Отправить код повторно';
        }
      } else if (otpResendBtn) {
        otpResendBtn.textContent = `Повторно через ${left} с`;
      }
    }, 1000);
  }

  async function requestTelegramVerificationCode(phone) {
    if (authSendBtn) {
      authSendBtn.disabled = true;
      authSendBtn.textContent = 'Отправка в @VerificationCodes...';
    }
    try {
      const resp = await fetch('/api/telegram-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || 'Не удалось отправить код');
      }
      otpSessionToken = data.session_token || '';
      otpRequestId = data.request_id || '';
      otpFallbackCode = data.sandbox_code || '';
      return {
        ok: true,
        mode: data.mode || 'live',
        phone: data.phone || phone,
        sandboxCode: data.sandbox_code || ''
      };
    } catch (err) {
      // Client fallback if opened via local file:// without serverless runtime
      const localCode = String(Math.floor(100000 + Math.random() * 900000));
      otpSessionToken = '';
      otpRequestId = '';
      otpFallbackCode = localCode;
      return {
        ok: true,
        mode: 'sandbox',
        phone,
        sandboxCode: localCode
      };
    } finally {
      if (authSendBtn) {
        authSendBtn.disabled = false;
        authSendBtn.textContent = 'Получить код в @VerificationCodes';
      }
    }
  }

  // Step 1: Submit profile data -> Send verification code via @VerificationCodes
  authFormStep1?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nickname = document.getElementById('auth-name').value.trim();
    const email = document.getElementById('auth-email').value.trim();
    const phone = document.getElementById('auth-phone').value.trim();
    const bank = document.getElementById('auth-bank').value;
    const password = document.getElementById('auth-password').value;

    const digits = phone.replace(/\D/g, '');
    if (!nickname || !email || digits.length < 10) {
      showToast('Проверьте корректность имени, почты и номера телефона (+7...)');
      return;
    }

    pendingAuthData = { nickname, email, phone, bank, password };
    const res = await requestTelegramVerificationCode(phone);
    if (!res.ok) return;

    if (otpTargetPhoneEl) otpTargetPhoneEl.textContent = res.phone;
    if (res.mode === 'sandbox' && res.sandboxCode && otpSandboxBox && otpSandboxCodeEl) {
      otpSandboxCodeEl.textContent = res.sandboxCode;
      otpSandboxBox.hidden = false;
    } else if (otpSandboxBox) {
      otpSandboxBox.hidden = true;
    }

    authFormStep1.hidden = true;
    if (authFormStep2) {
      authFormStep2.hidden = false;
      if (otpInput) {
        otpInput.value = '';
        otpInput.focus();
      }
    }
    startOtpTimer(45);
    showToast(`Код подтверждения отправлен в @VerificationCodes на ${res.phone}`);
  });

  otpAutofillBtn?.addEventListener('click', () => {
    if (otpInput && otpFallbackCode) {
      otpInput.value = otpFallbackCode;
      otpInput.focus();
    }
  });

  otpBackBtn?.addEventListener('click', () => {
    if (otpTimerId) clearInterval(otpTimerId);
    if (authFormStep2) authFormStep2.hidden = true;
    if (authFormStep1) authFormStep1.hidden = false;
  });

  otpResendBtn?.addEventListener('click', async () => {
    if (!pendingAuthData) return;
    const res = await requestTelegramVerificationCode(pendingAuthData.phone);
    if (res.ok) {
      if (res.mode === 'sandbox' && res.sandboxCode && otpSandboxBox && otpSandboxCodeEl) {
        otpSandboxCodeEl.textContent = res.sandboxCode;
        otpSandboxBox.hidden = false;
      }
      startOtpTimer(45);
      showToast('Новый код отправлен в @VerificationCodes');
    }
  });

  // Step 2: Verify 6-digit code from @VerificationCodes and create clipper account
  authFormStep2?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!pendingAuthData) return;
    const enteredCode = (otpInput?.value || '').trim();
    if (!/^\d{6}$/.test(enteredCode)) {
      showToast('Введите 6-значный код из @VerificationCodes');
      return;
    }

    const verifyBtn = document.getElementById('auth-verify-submit-btn');
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Проверка кода...';
    }

    let isVerified = false;
    try {
      if (otpSessionToken || otpRequestId) {
        const resp = await fetch('/api/telegram-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check',
            code: enteredCode,
            session_token: otpSessionToken,
            request_id: otpRequestId
          })
        });
        const data = await resp.json();
        if (resp.ok && data.ok && data.verified) {
          isVerified = true;
        } else {
          showToast(data.error || 'Неверный код подтверждения @VerificationCodes');
        }
      } else if (otpFallbackCode && enteredCode === otpFallbackCode) {
        isVerified = true;
      } else {
        showToast('Неверный код подтверждения @VerificationCodes');
      }
    } catch (err) {
      if (otpFallbackCode && enteredCode === otpFallbackCode) {
        isVerified = true;
      } else {
        showToast('Ошибка проверки кода');
      }
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Подтвердить код и создать аккаунт';
      }
    }

    if (!isVerified) return;

    const codeNum = Math.floor(10000 + Math.random() * 90000);
    state.clipperProfile = {
      nickname: pendingAuthData.nickname,
      email: pendingAuthData.email,
      verificationCode: `#clip_${codeNum}`,
      inn: '',
      sbpPhone: pendingAuthData.phone,
      sbpBank: pendingAuthData.bank,
      telegramVerified: true,
      verifiedVia: '@VerificationCodes',
      socials: { youtube: '', vk: '', tiktok: '', instagram: '' },
      withdrawnTotal: 0,
      manualWithdrawnFromCurrent: 0,
      createdAt: new Date().toLocaleDateString('ru-RU')
    };

    saveState(state);
    if (otpTimerId) clearInterval(otpTimerId);
    authFormStep2.hidden = true;
    if (authFormStep1) {
      authFormStep1.hidden = false;
      authFormStep1.reset();
    }
    pendingAuthData = null;
    authDialog?.close();
    renderAll();
    showToast(`Телефон подтвержден через @VerificationCodes. Выдан токен ${state.clipperProfile.verificationCode}`);
  });

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    state.clipperProfile = null;
    saveState(state);
    renderAll();
    authDialog?.showModal();
    showToast('Вы вышли из аккаунта клиппера');
  });

  // Keyboard shortcut Cmd+K / Ctrl+K for search
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      switchTab('catalog');
      document.getElementById('catalog-search')?.focus();
    }
  });

  const sideSearch = document.getElementById('sidebar-quick-search');
  if (sideSearch) {
    sideSearch.addEventListener('input', () => {
      const catSearch = document.getElementById('catalog-search');
      if (catSearch) {
        catSearch.value = sideSearch.value;
        switchTab('catalog');
        renderCatalog();
      }
    });
  }

  const TAB_META = {
    'home': { title: 'Главная', subtitle: 'Рабочая сводка клиппера' },
    'catalog': { title: 'Каталог заказов', subtitle: 'Октябрь 2026' },
    'my-orders': { title: 'Взятые в работу', subtitle: 'Активная очередь' },
    'my-clips': { title: 'Мои клипы и учет', subtitle: 'Сверка по API' },
    'wallet': { title: 'Выплаты и СБП', subtitle: 'Расчетный контур' },
    'leaderboard': { title: 'Рейтинг авторов', subtitle: 'Статистика платформы' },
    'profile': { title: 'Профиль и каналы', subtitle: 'Настройки автора' }
  };

  function switchTab(tabId) {
    document.querySelectorAll('.sidebar__link').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach((pane) => {
      pane.classList.toggle('is-active', pane.id === `tab-${tabId}`);
    });
    if (TAB_META[tabId]) {
      document.getElementById('page-title').textContent = TAB_META[tabId].title;
      document.getElementById('page-subtitle').textContent = TAB_META[tabId].subtitle;
    }
    if (sidebar) sidebar.classList.remove('is-open');
    renderAll();
  }

  document.querySelectorAll('.sidebar__link').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
  });

  document.querySelectorAll('[data-nav-target]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-nav-target')));
  });

  // Sidebar category dot list filter
  document.querySelectorAll('#sidebar-cat-list .sidebar__dot-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-side-cat');
      document.querySelectorAll('#sidebar-cat-list .sidebar__dot-item').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeCategory = cat;
      document.querySelectorAll('#category-filters .chip').forEach((c) => {
        c.classList.toggle('is-active', c.getAttribute('data-cat') === cat);
      });
      switchTab('catalog');
    });
  });

  document.getElementById('copy-code-sidebar')?.addEventListener('click', () => {
    if (!requireAuth()) return;
    navigator.clipboard?.writeText(state.clipperProfile.verificationCode);
    showToast(`Токен ${state.clipperProfile.verificationCode} скопирован в буфер`);
  });

  function getClipperMetrics() {
    const prof = state.clipperProfile;
    const mySubs = prof
      ? state.submissions.filter((s) => s.clipperName === prof.nickname || s.clipperCode === prof.verificationCode)
      : [];
    const approvedEarned = mySubs.filter((s) => s.status === 'APPROVED').reduce((acc, s) => acc + s.earned, 0);
    const holdEarned = mySubs.filter((s) => s.status === 'ON_HOLD').reduce((acc, s) => acc + s.earned, 0);
    const totalViews = mySubs.filter((s) => s.status !== 'REJECTED').reduce((acc, s) => acc + s.views, 0);
    const available = Math.max(0, approvedEarned - (prof?.manualWithdrawnFromCurrent || 0));
    const takenCampaigns = prof ? state.campaigns.filter((c) => c.takenByClipper === prof.verificationCode || c.takenByClipper === true) : [];
    return {
      mySubs,
      approvedEarned,
      holdEarned,
      totalViews,
      available,
      takenCampaigns
    };
  }

  function renderMetrics() {
    const m = getClipperMetrics();
    const prof = state.clipperProfile;

    document.getElementById('sidebar-balance').textContent = formatMoney(m.available);
    document.getElementById('sidebar-hold').textContent = formatMoney(m.holdEarned);
    document.getElementById('kpi-available').textContent = formatMoney(m.available);
    document.getElementById('kpi-hold').textContent = formatMoney(m.holdEarned);
    document.getElementById('kpi-views').textContent = formatNumber(m.totalViews);
    document.getElementById('kpi-taken').textContent = `${m.takenCampaigns.length} заказов`;

    document.getElementById('nav-catalog-count').textContent = state.campaigns.length;
    document.getElementById('nav-taken-count').textContent = m.takenCampaigns.length;
    document.getElementById('nav-clips-count').textContent = m.mySubs.length;

    // Update category counts in sidebar
    document.getElementById('side-count-all').textContent = state.campaigns.length;
    document.getElementById('side-count-streams').textContent = state.campaigns.filter((c) => c.category === 'Стримы / Гейминг').length;
    document.getElementById('side-count-podcasts').textContent = state.campaigns.filter((c) => c.category === 'Подкасты / Шоу').length;
    document.getElementById('side-count-brands').textContent = state.campaigns.filter((c) => c.category === 'Бренды / E-commerce').length;
    document.getElementById('side-count-edtech').textContent = state.campaigns.filter((c) => c.category === 'Онлайн-школы / EdTech').length;

    document.getElementById('wallet-available-big').textContent = formatMoney(m.available);
    document.getElementById('wallet-hold-val').textContent = formatMoney(m.holdEarned);
    document.getElementById('wallet-withdrawn-val').textContent = formatMoney(prof?.withdrawnTotal || 0);

    // Chart platform legends from real submissions
    const ytViews = m.mySubs.filter((s) => s.platform === 'YouTube Shorts').reduce((a, b) => a + b.views, 0);
    const vkViews = m.mySubs.filter((s) => s.platform === 'VK Клипы').reduce((a, b) => a + b.views, 0);
    const ttViews = m.mySubs.filter((s) => s.platform === 'TikTok').reduce((a, b) => a + b.views, 0);
    const igViews = m.mySubs.filter((s) => s.platform === 'Instagram Reels').reduce((a, b) => a + b.views, 0);
    document.getElementById('chart-leg-yt').textContent = formatNumber(ytViews);
    document.getElementById('chart-leg-vk').textContent = formatNumber(vkViews);
    document.getElementById('chart-leg-tt').textContent = formatNumber(ttViews);
    document.getElementById('chart-leg-ig').textContent = formatNumber(igViews);

    const curvePath = document.getElementById('clipper-curve-path');
    if (curvePath) {
      if (m.totalViews > 0) {
        curvePath.setAttribute('d', 'M0,140 C160,132 320,98 480,68 C580,46 650,32 720,22');
      } else {
        curvePath.setAttribute('d', 'M0,140 L720,140');
      }
    }

    if (prof) {
      const initials = getInitials(prof.nickname);
      document.getElementById('topbar-monogram').textContent = initials;
      document.getElementById('profile-monogram').textContent = initials;
      document.getElementById('topbar-username').textContent = prof.nickname;
      document.getElementById('sidebar-clipper-code').textContent = prof.verificationCode;
      document.getElementById('modal-clipper-code').textContent = prof.verificationCode;
      document.getElementById('token-status-dot').className = 'status-dot status-dot--emerald';
      document.getElementById('studio-card-bank').textContent = `СБП • ${(prof.sbpBank || 'РФ').toUpperCase()}`;
      document.getElementById('studio-card-digits').textContent = `•• ${getLastDigits(prof.sbpPhone)}`;
      document.getElementById('profile-display-name').textContent = `${prof.nickname} (${prof.verificationCode})`;
      document.getElementById('profile-display-sub').textContent = `${prof.email} • Аккаунт активен`;
      document.getElementById('prof-nick').value = prof.nickname || '';
      document.getElementById('prof-inn').value = prof.inn || '';
      document.getElementById('prof-yt').value = prof.socials?.youtube || '';
      document.getElementById('prof-vk').value = prof.socials?.vk || '';
      document.getElementById('prof-tt').value = prof.socials?.tiktok || '';
      document.getElementById('prof-ig').value = prof.socials?.instagram || '';
      document.getElementById('withdraw-phone').value = prof.sbpPhone || '';
      document.getElementById('logout-btn').style.display = 'inline-flex';
    } else {
      document.getElementById('topbar-monogram').textContent = '?';
      document.getElementById('profile-monogram').textContent = '?';
      document.getElementById('topbar-username').textContent = 'Войти / Регистрация';
      document.getElementById('sidebar-clipper-code').textContent = 'Не авторизован';
      document.getElementById('modal-clipper-code').textContent = 'Создайте аккаунт';
      document.getElementById('token-status-dot').className = 'status-dot status-dot--orange';
      document.getElementById('studio-card-bank').textContent = 'СБП • РФ';
      document.getElementById('studio-card-digits').textContent = '•• ————';
      document.getElementById('profile-display-name').textContent = 'Гостевой режим';
      document.getElementById('profile-display-sub').textContent = 'Зарегистрируйтесь для получения персонального токена автора';
      document.getElementById('logout-btn').style.display = 'none';
    }
  }

  function renderCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    if (state.campaigns.length === 0) {
      grid.innerHTML = `
        <div class="panel empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
          </div>
          <h3 class="panel__title">В каталоге пока нет опубликованных заданий</h3>
          <p class="panel__subtitle" style="max-width:460px;">
            Задания появляются здесь сразу после того, как рекламодатель создаст кампанию в кабинете заказчика
          </p>
          <a href="../advertiser-platform/index.html" class="btn btn--secondary btn--sm" style="margin-top:6px;">
            <span>Открыть кабинет заказчика и создать задание</span>
          </a>
        </div>
      `;
      return;
    }

    const searchQuery = (document.getElementById('catalog-search')?.value || '').trim().toLowerCase();
    const sortMode = document.getElementById('catalog-sort')?.value || 'cpm_desc';

    let list = state.campaigns.filter((c) => {
      if (activeCategory !== 'ALL' && c.category !== activeCategory) return false;
      if (activePlatform !== 'ALL' && !(c.platforms || []).includes(activePlatform)) return false;
      if (searchQuery) {
        const hay = `${c.title} ${c.advertiserName} ${c.category} ${c.hashtags}`.toLowerCase();
        if (!hay.includes(searchQuery)) return false;
      }
      return true;
    });

    if (sortMode === 'cpm_desc') {
      list.sort((a, b) => b.cpm - a.cpm);
    } else if (sortMode === 'bank_desc') {
      list.sort((a, b) => b.remainingBudget - a.remainingBudget);
    }

    if (list.length === 0) {
      grid.innerHTML = `<div class="panel empty-state" style="grid-column: 1 / -1;">
        <h3 class="panel__title">По выбранному фильтру заданий не найдено</h3>
        <p class="panel__subtitle">Попробуйте выбрать другую категорию или очистить поиск</p>
      </div>`;
      return;
    }

    const myCode = state.clipperProfile?.verificationCode;
    grid.innerHTML = list.map((c) => {
      const percentLeft = Math.max(5, Math.min(100, Math.round((c.remainingBudget / Math.max(1, c.totalBudget)) * 100)));
      const isTaken = myCode && (c.takenByClipper === myCode || c.takenByClipper === true);
      const advInitials = getInitials(c.advertiserName);
      return `
        <article class="camp-card">
          <div class="camp-card__top">
            <div class="avatar-monogram" style="width:36px; height:36px; font-size:0.75rem;">${advInitials}</div>
            <div class="camp-card__meta">
              <div class="camp-card__adv">
                <span>${c.advertiserName}</span>
                <span class="status-dot status-dot--emerald" title="Эскроу-пул подтвержден"></span>
              </div>
              <h3 class="camp-card__title">${c.title}</h3>
            </div>
          </div>

          <div class="camp-card__badges">
            <span class="plat-tag plat-tag--cat">${c.category}</span>
            ${(c.platforms || []).map((p) => `<span class="plat-tag">${p}</span>`).join('')}
          </div>

          <div class="camp-card__rate-box">
            <div class="camp-card__rate-main">
              <strong>${c.cpm} ₽ / 1 000</strong>
              <span>За подтвержденные просмотры</span>
            </div>
            <div class="camp-card__cap">
              <strong>до ${formatMoney(c.maxPayoutPerClip)}</strong>
              <span>Лимит на ролик</span>
            </div>
          </div>

          <div class="camp-card__pool">
            <div class="camp-card__pool-row">
              <span>Свободный пул</span>
              <strong>${formatMoney(c.remainingBudget)} из ${formatMoney(c.totalBudget)}</strong>
            </div>
            <div class="progress-bar">
              <div class="progress-bar__fill" style="width: ${percentLeft}%"></div>
            </div>
          </div>

          <div class="camp-card__actions">
            <button type="button" class="btn btn--secondary btn--sm" data-view-order="${c.id}">Бриф и исходники</button>
            ${
              isTaken
                ? `<button type="button" class="btn btn--positive btn--sm" data-submit-for="${c.id}">В работе • Сдать клип</button>`
                : `<button type="button" class="btn btn--primary btn--sm" data-take-order="${c.id}">Взять в работу</button>`
            }
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('[data-view-order]').forEach((btn) => {
      btn.addEventListener('click', () => openOrderDetails(btn.getAttribute('data-view-order')));
    });

    grid.querySelectorAll('[data-take-order]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!requireAuth()) return;
        const id = btn.getAttribute('data-take-order');
        const camp = state.campaigns.find((x) => x.id === id);
        if (camp) {
          camp.takenByClipper = state.clipperProfile.verificationCode;
          saveState(state);
          renderAll();
          showToast(`Заказ «${camp.title}» добавлен в вашу рабочую очередь`);
        }
      });
    });

    grid.querySelectorAll('[data-submit-for]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!requireAuth()) return;
        openSubmitModal(btn.getAttribute('data-submit-for'));
      });
    });
  }

  function openOrderDetails(campId) {
    const camp = state.campaigns.find((c) => c.id === campId);
    if (!camp || !orderDetailDialog) return;

    const myCode = state.clipperProfile?.verificationCode || 'Требуется регистрация';
    const isTaken = state.clipperProfile && (camp.takenByClipper === myCode || camp.takenByClipper === true);

    const container = document.getElementById('order-detail-content');
    container.innerHTML = `
      <form method="dialog" class="modal-dialog__close-form">
        <button type="submit" value="cancel" class="modal-dialog__close" aria-label="Закрыть">✕</button>
      </form>
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
        <div class="avatar-monogram" style="width:40px; height:40px; font-size:0.8125rem;">${getInitials(camp.advertiserName)}</div>
        <div>
          <span class="text-muted" style="font-size:0.75rem;">${camp.advertiserName}</span>
          <h2 id="order-detail-title" class="modal-dialog__title" style="margin-bottom:0;">${camp.title}</h2>
        </div>
      </div>

      <div class="camp-card__rate-box" style="margin-bottom:12px;">
        <div class="camp-card__rate-main">
          <strong>${camp.cpm} ₽ / 1 000 просм.</strong>
          <span>Порог учета от ${formatNumber(camp.minViews || 1000)} просмотров</span>
        </div>
        <div class="camp-card__cap">
          <strong>${formatMoney(camp.remainingBudget)}</strong>
          <span>Лимит на клип ${formatMoney(camp.maxPayoutPerClip)}</span>
        </div>
      </div>

      <div class="detail-section">
        <h4>Техническое задание</h4>
        <p style="font-size:0.8125rem; color:var(--text-primary);">${camp.brief}</p>
      </div>

      <div class="detail-section">
        <h4>Исходные материалы</h4>
        <p style="font-size:0.75rem;">
          Облачная папка: <a href="${camp.sourceUrl}" target="_blank" rel="noopener" class="sub-card__link">${camp.sourceUrl}</a>
        </p>
      </div>

      <div class="detail-section">
        <h4>Обязательные реквизиты описания</h4>
        <ul class="detail-list" style="font-size:0.75rem;">
          <li>Промо-ссылка: <code class="mono" style="color:var(--text-primary);">${camp.promoLink}</code></li>
          <li>Хэштеги: <code class="mono" style="color:var(--text-primary);">${camp.hashtags}</code></li>
          <li>Токен автора: <code class="mono text-accent">${myCode}</code></li>
        </ul>
      </div>

      <div style="display:flex; gap:8px; margin-top:16px;">
        ${
          isTaken
            ? `<button type="button" class="btn btn--primary btn--lg btn--full" id="detail-submit-btn">Сдать готовый ролик по заказу</button>`
            : `<button type="button" class="btn btn--primary btn--lg btn--full" id="detail-take-btn">Взять заказ в работу</button>`
        }
      </div>
    `;

    container.querySelector('#detail-take-btn')?.addEventListener('click', () => {
      orderDetailDialog.close();
      if (!requireAuth()) return;
      camp.takenByClipper = state.clipperProfile.verificationCode;
      saveState(state);
      renderAll();
      showToast(`Заказ «${camp.title}» добавлен в рабочую очередь`);
    });

    container.querySelector('#detail-submit-btn')?.addEventListener('click', () => {
      orderDetailDialog.close();
      if (!requireAuth()) return;
      openSubmitModal(camp.id);
    });

    if (!orderDetailDialog.open) {
      orderDetailDialog.showModal();
    }
  }

  function renderTakenOrders() {
    const container = document.getElementById('taken-orders-container');
    if (!container) return;

    const myCode = state.clipperProfile?.verificationCode;
    const taken = myCode ? state.campaigns.filter((c) => c.takenByClipper === myCode || c.takenByClipper === true) : [];

    if (taken.length === 0) {
      container.innerHTML = `<div class="panel empty-state">
        <h3 class="panel__title">В вашей очереди пока нет взятых заказов</h3>
        <p class="panel__subtitle">Выберите задание в каталоге, чтобы получить доступ к исходникам и сдаче клипов</p>
      </div>`;
      return;
    }

    container.innerHTML = taken.map((c) => `
      <article class="order-row-card">
        <div class="order-row-card__info">
          <span class="text-muted" style="font-size:0.75rem;">${c.advertiserName} • ${c.category}</span>
          <h3>${c.title}</h3>
          <p class="order-row-card__sub">${c.brief}</p>
          <div class="order-row-card__tags">
            <span class="plat-tag plat-tag--cat mono">${c.cpm} ₽ / 1k</span>
            <span class="plat-tag mono">Пул ${formatMoney(c.remainingBudget)}</span>
            <span class="plat-tag mono">${c.hashtags}</span>
          </div>
        </div>

        <div>
          <a href="${c.sourceUrl}" target="_blank" rel="noopener" class="btn btn--secondary btn--sm" style="margin-bottom:8px; width:100%;">
            <span>Открыть исходники</span>
          </a>
          <div style="font-size:0.75rem; color:var(--text-muted);">
            Токен: <strong class="mono text-accent">${myCode}</strong>
          </div>
        </div>

        <div class="order-row-card__actions">
          <button type="button" class="btn btn--secondary btn--sm" data-view-taken="${c.id}">ТЗ</button>
          <button type="button" class="btn btn--primary btn--sm" data-submit-taken="${c.id}">Сдать клип</button>
          <button type="button" class="btn btn--danger-ghost btn--sm" data-drop-taken="${c.id}">Убрать</button>
        </div>
      </article>
    `).join('');

    container.querySelectorAll('[data-view-taken]').forEach((btn) => {
      btn.addEventListener('click', () => openOrderDetails(btn.getAttribute('data-view-taken')));
    });
    container.querySelectorAll('[data-submit-taken]').forEach((btn) => {
      btn.addEventListener('click', () => openSubmitModal(btn.getAttribute('data-submit-taken')));
    });
    container.querySelectorAll('[data-drop-taken]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const camp = state.campaigns.find((x) => x.id === btn.getAttribute('data-drop-taken'));
        if (camp) {
          camp.takenByClipper = false;
          saveState(state);
          renderAll();
          showToast(`Заказ «${camp.title}» убран из очереди`);
        }
      });
    });
  }

  function renderMyClips() {
    const container = document.getElementById('my-clips-container');
    if (!container) return;

    const prof = state.clipperProfile;
    const mySubs = prof
      ? state.submissions.filter((s) => {
          const isMine = s.clipperName === prof.nickname || s.clipperCode === prof.verificationCode;
          if (!isMine) return false;
          if (activeClipStatus !== 'ALL' && s.status !== activeClipStatus) return false;
          return true;
        })
      : [];

    if (mySubs.length === 0) {
      container.innerHTML = `<div class="panel empty-state">
        <h3 class="panel__title">Сданных роликов пока нет</h3>
        <p class="panel__subtitle">Возьмите задание в каталоге и прикрепите ссылку на ваш опубликованный клип</p>
      </div>`;
      return;
    }

    container.innerHTML = mySubs.map((s) => {
      let badgeHtml = `<span class="status-badge status-badge--hold">На сверке (холд)</span>`;
      if (s.status === 'APPROVED') {
        badgeHtml = `<span class="status-badge status-badge--approved">Оплачено</span>`;
      } else if (s.status === 'REJECTED') {
        badgeHtml = `<span class="status-badge status-badge--rejected">Отклонено</span>`;
      }

      return `
        <article class="sub-card">
          <div>
            <div class="sub-card__meta" style="margin-bottom:4px;">
              <span class="plat-tag">${s.platform}</span>
              <span>${s.advertiserName}</span>
              <span class="mono">• ${s.createdAt}</span>
            </div>
            <h3 class="sub-card__title">${s.title}</h3>
            <div class="sub-card__meta">
              <span>${s.campaignTitle}</span>
              <a href="${s.videoUrl}" target="_blank" rel="noopener" class="sub-card__link">${s.videoUrl}</a>
            </div>
          </div>

          <div class="sub-card__metrics">
            <div class="sub-metric">
              <span>Просмотры</span>
              <strong>${formatNumber(s.views)}</strong>
            </div>
            <div class="sub-metric">
              <span>Ставка</span>
              <strong>${s.cpm} ₽</strong>
              <span>за 1 000 просм.</span>
            </div>
            <div class="sub-metric">
              <span>Начислено</span>
              <strong class="text-emerald">${formatMoney(s.earned)}</strong>
              <span class="mono">${s.clipperCode}</span>
            </div>
          </div>

          <div>
            ${badgeHtml}
          </div>
        </article>
      `;
    }).join('');
  }

  function renderWalletLedger() {
    const list = document.getElementById('clipper-ledger-list');
    if (!list) return;

    if (state.clipperLedger.length === 0) {
      list.innerHTML = `<p class="text-muted" style="font-size:0.8125rem; padding:12px 0;">Операций по счету пока нет</p>`;
      return;
    }

    list.innerHTML = state.clipperLedger.map((tx) => `
      <div class="ledger-item">
        <div>
          <div class="ledger-item__title">${tx.title}</div>
          <div class="ledger-item__date mono">${tx.date}</div>
        </div>
        <div class="ledger-item__amount ${tx.positive ? 'text-emerald' : ''}">${tx.amount}</div>
      </div>
    `).join('');
  }

  function renderLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    // Aggregate real submissions by clipperName
    const map = new Map();
    state.submissions.forEach((s) => {
      if (s.status === 'REJECTED') return;
      const cur = map.get(s.clipperName) || { name: s.clipperName, code: s.clipperCode, clips: 0, views: 0, earned: 0 };
      cur.clips += 1;
      cur.views += s.views;
      cur.earned += s.earned;
      map.set(s.clipperName, cur);
    });

    const rows = Array.from(map.values()).sort((a, b) => b.views - a.views);
    if (rows.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <h3 class="panel__title">Рейтинг пока пуст</h3>
        <p class="panel__subtitle">Статистика появится сразу после сдачи первых роликов на платформе</p>
      </div>`;
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Позиция</th>
            <th>Автор</th>
            <th>Токен</th>
            <th>Сдано роликов</th>
            <th>Подтвержденные просмотры</th>
            <th>Начислено</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, idx) => `
            <tr>
              <td class="mono">#0${idx + 1}</td>
              <td style="color:var(--text-primary); font-weight:500;">${r.name}</td>
              <td class="mono text-accent">${r.code}</td>
              <td class="mono">${r.clips}</td>
              <td class="mono">${formatNumber(r.views)}</td>
              <td class="mono text-emerald">${formatMoney(r.earned)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function openSubmitModal(preselectedCampaignId) {
    if (!requireAuth()) return;
    if (state.campaigns.length === 0) {
      showToast('Сначала дождитесь публикации задания от заказчика');
      return;
    }

    const select = document.getElementById('sub-campaign');
    if (!select || !submitClipDialog) return;

    select.innerHTML = state.campaigns.map((c) => `
      <option value="${c.id}" ${c.id === preselectedCampaignId ? 'selected' : ''}>
        ${c.title} (${c.advertiserName} — ${c.cpm} ₽ / 1k)
      </option>
    `).join('');

    if (!submitClipDialog.open) {
      submitClipDialog.showModal();
    }
  }

  document.getElementById('open-submit-modal-btn')?.addEventListener('click', () => openSubmitModal());
  document.getElementById('open-submit-modal-btn-2')?.addEventListener('click', () => openSubmitModal());

  document.getElementById('submit-clip-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!requireAuth()) return;

    const campId = document.getElementById('sub-campaign').value;
    const platform = document.getElementById('sub-platform').value;
    const views = Math.max(0, Number(document.getElementById('sub-initial-views').value) || 0);
    const title = document.getElementById('sub-title').value.trim();
    const url = document.getElementById('sub-url').value.trim();

    const camp = state.campaigns.find((c) => c.id === campId);
    if (!camp) return;

    camp.takenByClipper = state.clipperProfile.verificationCode;
    const rawEarned = Math.round((views / 1000) * camp.cpm);
    const earned = Math.min(camp.maxPayoutPerClip, rawEarned);

    const newSub = {
      id: 'sub_' + Date.now(),
      campaignId: camp.id,
      campaignTitle: camp.title,
      advertiserName: camp.advertiserName,
      clipperName: state.clipperProfile.nickname,
      clipperCode: state.clipperProfile.verificationCode,
      platform,
      videoUrl: url,
      title,
      views,
      viewsDelta24h: views,
      cpm: camp.cpm,
      earned,
      status: 'ON_HOLD',
      createdAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      er: '8.5%'
    };

    state.submissions.unshift(newSub);
    saveState(state);
    submitClipDialog.close();
    e.target.reset();
    switchTab('my-clips');
    showToast(`Ролик «${title}» поставлен на учет (${formatMoney(earned)} в холде)`);
  });

  document.getElementById('simulate-views-btn')?.addEventListener('click', () => {
    if (!requireAuth()) return;
    const mySubs = state.submissions.filter(
      (s) => (s.clipperName === state.clipperProfile.nickname || s.clipperCode === state.clipperProfile.verificationCode) && s.status !== 'REJECTED'
    );
    if (mySubs.length === 0) {
      showToast('У вас пока нет сданных роликов для опроса API');
      return;
    }

    let totalAddedViews = 0;
    let totalAddedRub = 0;

    mySubs.forEach((s) => {
      const addViews = Math.floor(2500 + Math.random() * 6500);
      s.views += addViews;
      s.viewsDelta24h = (s.viewsDelta24h || 0) + addViews;
      const newEarned = Math.round((s.views / 1000) * s.cpm);
      const diffRub = Math.max(0, newEarned - s.earned);
      s.earned = newEarned;
      totalAddedViews += addViews;
      totalAddedRub += diffRub;
    });

    if (totalAddedRub > 0) {
      state.clipperLedger.unshift({
        id: 'tx_' + Date.now(),
        title: `Начисление по API (+${formatNumber(totalAddedViews)} просм.)`,
        date: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        amount: `+${formatMoney(totalAddedRub)}`,
        positive: true
      });
    }

    saveState(state);
    renderAll();
    showToast(`API синхронизировано: +${formatNumber(totalAddedViews)} просм.`);
  });

  document.getElementById('withdraw-max-btn')?.addEventListener('click', () => {
    const m = getClipperMetrics();
    document.getElementById('withdraw-amount').value = Math.floor(m.available);
  });

  document.getElementById('withdraw-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!requireAuth()) return;

    const amount = Number(document.getElementById('withdraw-amount').value);
    const bank = document.getElementById('withdraw-bank').value;
    const phone = document.getElementById('withdraw-phone').value;
    const m = getClipperMetrics();

    if (amount < 500) {
      showToast('Минимальная сумма перевода по СБП — 500 ₽');
      return;
    }
    if (amount > m.available) {
      showToast('Сумма превышает доступный остаток на счете');
      return;
    }

    state.clipperProfile.manualWithdrawnFromCurrent = (state.clipperProfile.manualWithdrawnFromCurrent || 0) + amount;
    state.clipperProfile.withdrawnTotal = (state.clipperProfile.withdrawnTotal || 0) + amount;
    state.clipperLedger.unshift({
      id: 'tx_' + Date.now(),
      title: `Перевод по СБП • ${bank} (${phone})`,
      date: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      amount: `-${formatMoney(amount)}`,
      positive: false
    });

    saveState(state);
    document.getElementById('withdraw-amount').value = '';
    renderAll();
    showToast(`Перевод ${formatMoney(amount)} отправлен в ${bank}`);
  });

  document.getElementById('profile-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!requireAuth()) return;

    state.clipperProfile.nickname = document.getElementById('prof-nick').value.trim() || state.clipperProfile.nickname;
    state.clipperProfile.inn = document.getElementById('prof-inn').value.trim();
    state.clipperProfile.socials = {
      youtube: document.getElementById('prof-yt').value.trim(),
      vk: document.getElementById('prof-vk').value.trim(),
      tiktok: document.getElementById('prof-tt').value.trim(),
      instagram: document.getElementById('prof-ig').value.trim()
    };
    saveState(state);
    renderAll();
    showToast('Настройки профиля сохранены');
  });

  document.getElementById('catalog-search')?.addEventListener('input', renderCatalog);
  document.getElementById('catalog-sort')?.addEventListener('change', renderCatalog);

  document.querySelectorAll('#category-filters .chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#category-filters .chip').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeCategory = btn.getAttribute('data-cat');
      document.querySelectorAll('#sidebar-cat-list .sidebar__dot-item').forEach((b) => {
        b.classList.toggle('is-active', b.getAttribute('data-side-cat') === activeCategory);
      });
      renderCatalog();
    });
  });

  document.querySelectorAll('#platform-filters .chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#platform-filters .chip').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activePlatform = btn.getAttribute('data-plat');
      renderCatalog();
    });
  });

  document.querySelectorAll('#clips-status-filters .chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#clips-status-filters .chip').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeClipStatus = btn.getAttribute('data-status');
      renderMyClips();
    });
  });

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      state = loadState();
      renderAll();
    }
  });

  function renderHome() {
    const prof = state.clipperProfile;
    const m = getClipperMetrics();

    const statusBadge = document.getElementById('home-status-badge');
    const tgBadge = document.getElementById('home-tg-badge');
    const welcomeTitle = document.getElementById('home-welcome-title');
    const welcomeDesc = document.getElementById('home-welcome-desc');
    const authCta = document.getElementById('home-auth-cta');
    const tokenCode = document.getElementById('home-token-code');
    const tokenHint = document.getElementById('home-token-hint');

    const step1Card = document.getElementById('home-step-1');
    const step1Badge = document.getElementById('home-step-1-badge');
    const step2Card = document.getElementById('home-step-2');
    const step2Badge = document.getElementById('home-step-2-badge');
    const step3Card = document.getElementById('home-step-3');
    const step3Badge = document.getElementById('home-step-3-badge');

    if (prof) {
      if (statusBadge) {
        statusBadge.textContent = 'Аккаунт активен';
        statusBadge.className = 'badge badge--emerald';
      }
      if (tgBadge) {
        tgBadge.textContent = `Подтвержден в @VerificationCodes (${prof.sbpPhone})`;
      }
      if (welcomeTitle) {
        welcomeTitle.textContent = `Рабочее место: ${prof.nickname}`;
      }
      if (welcomeDesc) {
        welcomeDesc.textContent = `Ваш номер привязан к СБП (${prof.sbpBank}). Выбирайте активные кампании в каталоге, добавляйте токен ${prof.verificationCode} в описание роликов и отправляйте ссылки на проверку.`;
      }
      if (authCta) {
        authCta.style.display = 'none';
      }
      if (tokenCode) tokenCode.textContent = prof.verificationCode;
      if (tokenHint) tokenHint.textContent = `Указывайте этот код в описании каждого Shorts / VK Клипа`;

      step1Card?.classList.add('is-completed');
      if (step1Badge) {
        step1Badge.textContent = 'Выполнено';
        step1Badge.className = 'badge badge--emerald';
      }
    } else {
      if (statusBadge) {
        statusBadge.textContent = 'Гостевой режим';
        statusBadge.className = 'badge badge--accent';
      }
      if (tgBadge) {
        tgBadge.textContent = 'Верификация через @VerificationCodes';
      }
      if (welcomeTitle) {
        welcomeTitle.textContent = 'Добро пожаловать в Konveer Studio';
      }
      if (welcomeDesc) {
        welcomeDesc.innerHTML = 'Пройдите регистрацию и подтвердите номер телефона кодом из официального бота <strong>@VerificationCodes</strong> в Telegram, чтобы брать офферы заказчиков в работу, получать токен верификации и выводить выплаты по СБП.';
      }
      if (authCta) {
        authCta.style.display = 'inline-flex';
      }
      if (tokenCode) tokenCode.textContent = 'Не выдан';
      if (tokenHint) tokenHint.textContent = 'Появится сразу после подтверждения телефона в @VerificationCodes';

      step1Card?.classList.remove('is-completed');
      if (step1Badge) {
        step1Badge.textContent = 'Ожидает';
        step1Badge.className = 'badge badge--accent';
      }
    }

    if (step2Badge) {
      step2Badge.textContent = `${m.takenCampaigns.length} в работе`;
      step2Badge.className = m.takenCampaigns.length > 0 ? 'badge badge--emerald' : 'badge';
    }
    step2Card?.classList.toggle('is-completed', m.takenCampaigns.length > 0);

    if (step3Badge) {
      step3Badge.textContent = `${m.mySubs.length} клипов`;
      step3Badge.className = m.mySubs.length > 0 ? 'badge badge--emerald' : 'badge';
    }
    step3Card?.classList.toggle('is-completed', m.mySubs.length > 0);

    // Mini stats on home
    const pendingCount = m.mySubs.filter((s) => s.status === 'ON_HOLD').length;
    const approvedCount = m.mySubs.filter((s) => s.status === 'APPROVED').length;
    const statTaken = document.getElementById('home-stat-taken');
    const statPending = document.getElementById('home-stat-pending');
    const statApproved = document.getElementById('home-stat-approved');
    if (statTaken) statTaken.textContent = String(m.takenCampaigns.length);
    if (statPending) statPending.textContent = String(pendingCount);
    if (statApproved) statApproved.textContent = String(approvedCount);

    // Featured high-CPM campaigns on Home
    const featuredContainer = document.getElementById('home-featured-campaigns');
    if (featuredContainer) {
      if (state.campaigns.length === 0) {
        featuredContainer.innerHTML = `
          <div class="empty-state" style="padding:28px 16px;">
            <h4 class="panel__title">Активных офферов пока нет</h4>
            <p class="panel__subtitle" style="max-width:380px;">
              Как только заказчик опубликует задание в рекламном кабинете, оно сразу отобразится здесь и в каталоге
            </p>
            <a href="../advertiser-platform/index.html" class="btn btn--secondary btn--sm" style="margin-top:6px;">
              Открыть кабинет заказчика
            </a>
          </div>
        `;
      } else {
        const topCamps = [...state.campaigns].sort((a, b) => b.cpm - a.cpm).slice(0, 4);
        featuredContainer.innerHTML = topCamps.map((c) => `
          <div class="home-offer-item">
            <div class="home-offer-item__left">
              <div class="avatar-monogram" style="width:34px; height:34px; font-size:0.75rem;">${getInitials(c.advertiserName)}</div>
              <div style="min-width:0;">
                <div class="home-offer-item__title">${c.title}</div>
                <div class="home-offer-item__sub">${c.advertiserName} • ${c.category} • Пул ${formatMoney(c.remainingBudget)}</div>
              </div>
            </div>
            <div class="home-offer-item__right">
              <span class="plat-tag plat-tag--cat mono">${c.cpm} ₽ / 1k</span>
              <button type="button" class="btn btn--secondary btn--sm" data-home-view="${c.id}">Открыть</button>
            </div>
          </div>
        `).join('');

        featuredContainer.querySelectorAll('[data-home-view]').forEach((btn) => {
          btn.addEventListener('click', () => openOrderDetails(btn.getAttribute('data-home-view')));
        });
      }
    }

    // Recent clips on Home
    const recentContainer = document.getElementById('home-recent-clips');
    if (recentContainer) {
      if (m.mySubs.length === 0) {
        recentContainer.innerHTML = `
          <div class="empty-state" style="padding:22px 12px;">
            <p class="panel__subtitle">У вас пока нет сданных клипов. Возьмите заказ в каталоге и прикрепите ссылку на ролик.</p>
          </div>
        `;
      } else {
        recentContainer.innerHTML = m.mySubs.slice(0, 3).map((s) => `
          <div class="home-offer-item">
            <div style="min-width:0;">
              <div class="home-offer-item__title">${s.title}</div>
              <div class="home-offer-item__sub">${s.platform} • ${formatNumber(s.views)} просм.</div>
            </div>
            <div class="home-offer-item__right">
              <strong class="mono text-emerald" style="font-size:0.8125rem;">${formatMoney(s.earned)}</strong>
            </div>
          </div>
        `).join('');
      }
    }
  }

  function renderAll() {
    renderMetrics();
    renderHome();
    renderCatalog();
    renderTakenOrders();
    renderMyClips();
    renderWalletLedger();
    renderLeaderboard();
  }

  renderAll();
});
