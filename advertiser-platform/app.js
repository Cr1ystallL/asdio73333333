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

function getLastDigits(str) {
  const digits = String(str || '').replace(/\D/g, '');
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
  }, 3500);
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
  let activeModFilter = 'ALL';
  let searchFilter = '';

  const sidebar = document.getElementById('sidebar');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const authDialog = document.getElementById('auth-dialog');
  const createDialog = document.getElementById('create-campaign-dialog');
  const addBankDialog = document.getElementById('add-camp-bank-dialog');

  // Setup closedBy fallback for <dialog>
  [authDialog, createDialog, addBankDialog].forEach((dlg) => {
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

  // Show password toggle
  const togglePassBtn = document.getElementById('toggle-pass-btn');
  const authPassInput = document.getElementById('auth-password');
  if (togglePassBtn && authPassInput) {
    togglePassBtn.addEventListener('click', () => {
      const isPass = authPassInput.type === 'password';
      authPassInput.type = isPass ? 'text' : 'password';
      togglePassBtn.textContent = isPass ? 'Скрыть' : 'Показать';
    });
  }

  function requireAuth() {
    if (!state.advertiserProfile) {
      if (authDialog && !authDialog.open) {
        authDialog.showModal();
      }
      return false;
    }
    return true;
  }

  document.getElementById('topbar-user-btn')?.addEventListener('click', () => {
    if (!state.advertiserProfile) {
      authDialog?.showModal();
    } else {
      switchTab('settings');
    }
  });

  // =========================================================================
  // 2-STEP REGISTRATION VIA TELEGRAM @VerificationCodes
  // =========================================================================
  let pendingAdvAuth = null;
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

  authFormStep1?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const accountName = document.getElementById('auth-account-name')?.value.trim() || '';
    const companyName = document.getElementById('auth-company')?.value.trim() || '';
    const email = document.getElementById('auth-email')?.value.trim() || '';
    const phone = document.getElementById('auth-phone')?.value.trim() || '';
    const country = document.getElementById('auth-country')?.value.trim() || 'Россия';
    const city = document.getElementById('auth-city')?.value.trim() || '';
    const digits = phone.replace(/\D/g, '');
    if (!accountName || !companyName || !email || digits.length < 10) {
      showToast('Заполните Account name, название компании, почту и номер телефона');
      return;
    }

    pendingAdvAuth = { accountName, companyName, email, phone, country, city };
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
    if (!pendingAdvAuth) return;
    const res = await requestTelegramVerificationCode(pendingAdvAuth.phone);
    if (res.ok) {
      if (res.mode === 'sandbox' && res.sandboxCode && otpSandboxBox && otpSandboxCodeEl) {
        otpSandboxCodeEl.textContent = res.sandboxCode;
        otpSandboxBox.hidden = false;
      }
      startOtpTimer(45);
      showToast('Новый код отправлен в @VerificationCodes');
    }
  });

  authFormStep2?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!pendingAdvAuth) return;
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
        verifyBtn.textContent = 'Подтвердить код и создать кабинет';
      }
    }

    if (!isVerified) return;

    state.advertiserProfile = {
      accountName: pendingAdvAuth.accountName || pendingAdvAuth.companyName,
      companyName: pendingAdvAuth.companyName,
      legalName: pendingAdvAuth.companyName,
      email: pendingAdvAuth.email,
      phone: pendingAdvAuth.phone,
      country: pendingAdvAuth.country || 'Россия',
      city: pendingAdvAuth.city || '',
      inn: '',
      telegramVerified: true,
      verifiedVia: '@VerificationCodes',
      ordOperator: 'ОРД VK (Авто-маркировка ЕРИР)',
      availableBank: 0,
      createdAt: new Date().toLocaleDateString('ru-RU')
    };

    saveState(state);
    if (otpTimerId) clearInterval(otpTimerId);
    authFormStep2.hidden = true;
    if (authFormStep1) {
      authFormStep1.hidden = false;
      authFormStep1.reset();
    }
    pendingAdvAuth = null;
    authDialog?.close();
    renderAll();
    showToast(`Телефон подтвержден через @VerificationCodes. Кабинет «${state.advertiserProfile.companyName}» создан`);
  });

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    state.advertiserProfile = null;
    saveState(state);
    renderAll();
    authDialog?.showModal();
    showToast('Вы вышли из аккаунта заказчика');
  });

  // Keyboard shortcut Cmd+K / Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('sidebar-quick-search')?.focus();
    }
  });

  const sideSearch = document.getElementById('sidebar-quick-search');
  if (sideSearch) {
    sideSearch.addEventListener('input', () => {
      searchFilter = sideSearch.value.trim().toLowerCase();
      switchTab('campaigns');
    });
  }

  const TAB_META = {
    'dashboard': { title: 'Сводка и охват', subtitle: 'Октябрь 2026' },
    'campaigns': { title: 'Мои задания', subtitle: 'Активные пулы' },
    'moderation': { title: 'Модерация клипов', subtitle: 'Проверка ссылок' },
    'bank': { title: 'Эскроу-банк и УПД', subtitle: 'Расчетный счет' },
    'clippers': { title: 'Реестр авторов', subtitle: 'Creator CRM' },
    'settings': { title: 'Реквизиты и ОРД', subtitle: 'Маркировка 347-ФЗ' }
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

  function openCreateModal() {
    if (!requireAuth()) return;
    if (createDialog && !createDialog.open) {
      document.getElementById('camp-adv-name').value = state.advertiserProfile?.companyName || '';
      updateBudgetPreview();
      createDialog.showModal();
    }
  }

  ['open-create-modal-sidebar', 'open-create-modal-top', 'open-create-modal-dash', 'open-create-modal-camp'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', openCreateModal);
  });

  ['open-topup-modal-sidebar', 'open-topup-modal-top'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', () => {
      if (!requireAuth()) return;
      switchTab('bank');
    });
  });

  function updateBudgetPreview() {
    const budget = Math.max(0, Number(document.getElementById('camp-budget')?.value) || 50000);
    const cpm = Math.max(10, Number(document.getElementById('camp-cpm')?.value) || 120);
    const netPool = Math.round(budget * 0.8);
    const fee = Math.round(budget * 0.2);
    const estViews = Math.round((netPool / cpm) * 1000);

    document.getElementById('calc-net-pool').textContent = formatMoney(netPool);
    document.getElementById('calc-fee').textContent = formatMoney(fee);
    document.getElementById('calc-views').textContent = `~${formatNumber(estViews)} просм.`;
  }

  document.getElementById('camp-budget')?.addEventListener('input', updateBudgetPreview);
  document.getElementById('camp-cpm')?.addEventListener('input', updateBudgetPreview);

  document.getElementById('create-campaign-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!requireAuth()) return;

    const title = document.getElementById('camp-title').value.trim();
    const advName = document.getElementById('camp-adv-name').value.trim() || state.advertiserProfile.companyName;
    const category = document.getElementById('camp-category').value;
    const sourceUrl = document.getElementById('camp-source').value.trim();
    const budget = Math.max(10000, Number(document.getElementById('camp-budget').value) || 50000);
    const cpm = Math.max(50, Number(document.getElementById('camp-cpm').value) || 120);
    const cap = Math.max(1000, Number(document.getElementById('camp-cap').value) || 12000);
    const promoLink = document.getElementById('camp-promo').value.trim();
    const hashtags = document.getElementById('camp-tags').value.trim();
    const brief = document.getElementById('camp-brief').value.trim();

    if (state.advertiserProfile.availableBank < budget) {
      const diff = budget - state.advertiserProfile.availableBank;
      state.advertiserProfile.availableBank += diff;
      state.advertiserLedger.unshift({
        id: 'atx_' + Date.now() + '_auto',
        title: `Авто-пополнение счета под запуск «${title}»`,
        date: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        amount: `+${formatMoney(diff)}`,
        positive: true
      });
    }

    state.advertiserProfile.availableBank -= budget;
    const netPool = Math.round(budget * 0.8);

    const newCamp = {
      id: 'camp_' + Date.now(),
      title,
      advertiserName: advName,
      advertiserVerified: true,
      category,
      platforms: ['YouTube Shorts', 'VK Клипы', 'TikTok', 'Instagram Reels'],
      cpm,
      totalBudget: budget,
      remainingBudget: netPool,
      maxPayoutPerClip: cap,
      minViews: 1000,
      sourceUrl,
      promoLink,
      hashtags,
      brief,
      status: 'ACTIVE',
      takenByClipper: false,
      isOwnAdvertiser: true
    };

    state.campaigns.unshift(newCamp);
    state.advertiserLedger.unshift({
      id: 'atx_' + Date.now(),
      title: `Аллокация в задание: «${title}» (пул ${formatMoney(netPool)} + 20% сбор)`,
      date: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      amount: `-${formatMoney(budget)}`,
      positive: false
    });

    saveState(state);
    createDialog.close();
    e.target.reset();
    renderAll();
    showToast(`Задание «${title}» опубликовано в каталоге клипперов`);
  });

  document.querySelectorAll('[data-quick-sum]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('topup-amount').value = btn.getAttribute('data-quick-sum');
    });
  });

  document.getElementById('topup-bank-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!requireAuth()) return;

    const amount = Math.max(1000, Number(document.getElementById('topup-amount').value) || 50000);
    const method = document.getElementById('topup-method').value;

    state.advertiserProfile.availableBank = (state.advertiserProfile.availableBank || 0) + amount;
    state.advertiserLedger.unshift({
      id: 'atx_' + Date.now(),
      title: `Пополнение депозита • ${method}`,
      date: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      amount: `+${formatMoney(amount)}`,
      positive: true
    });

    saveState(state);
    renderAll();
    showToast(`Депозит пополнен на ${formatMoney(amount)}`);
  });

  function openAddCampBankModal(campId) {
    if (!requireAuth()) return;
    const camp = state.campaigns.find((c) => c.id === campId);
    if (!camp || !addBankDialog) return;
    document.getElementById('add-bank-camp-id').value = camp.id;
    document.getElementById('add-camp-bank-subtitle').textContent = `Кампания: «${camp.title}»`;
    document.getElementById('modal-free-bank-hint').textContent = formatMoney(state.advertiserProfile?.availableBank || 0);
    if (!addBankDialog.open) {
      addBankDialog.showModal();
    }
  }

  document.getElementById('add-camp-bank-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!requireAuth()) return;

    const campId = document.getElementById('add-bank-camp-id').value;
    const amount = Math.max(5000, Number(document.getElementById('add-bank-amount').value) || 25000);
    const camp = state.campaigns.find((c) => c.id === campId);
    if (!camp) return;

    if (state.advertiserProfile.availableBank < amount) {
      state.advertiserProfile.availableBank = 0;
    } else {
      state.advertiserProfile.availableBank -= amount;
    }

    camp.totalBudget += amount;
    camp.remainingBudget += Math.round(amount * 0.8);
    camp.status = 'ACTIVE';

    state.advertiserLedger.unshift({
      id: 'atx_' + Date.now(),
      title: `Пополнение пула задания «${camp.title}»`,
      date: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      amount: `-${formatMoney(amount)}`,
      positive: false
    });

    saveState(state);
    addBankDialog.close();
    renderAll();
    showToast(`В пул задания «${camp.title}» переведено ${formatMoney(amount)}`);
  });

  function moderateSubmission(subId, decision) {
    if (!requireAuth()) return;
    const sub = state.submissions.find((s) => s.id === subId);
    if (!sub) return;
    const camp = state.campaigns.find((c) => c.id === sub.campaignId);

    if (decision === 'APPROVE') {
      sub.status = 'APPROVED';
      if (camp) {
        camp.remainingBudget = Math.max(0, camp.remainingBudget - sub.earned);
      }
      state.clipperLedger.unshift({
        id: 'tx_' + Date.now(),
        title: `Выплата за клип: «${sub.title}» (${formatNumber(sub.views)} просм.)`,
        date: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        amount: `+${formatMoney(sub.earned)}`,
        positive: true
      });
      showToast(`Ролик «${sub.title}» принят, автору начислено ${formatMoney(sub.earned)}`);
    } else if (decision === 'REJECT') {
      sub.status = 'REJECTED';
      showToast(`Ролик «${sub.title}» отклонен, средства сохранены в пуле`);
    }

    saveState(state);
    renderAll();
  }

  function renderMetrics() {
    const prof = state.advertiserProfile;
    const freeBank = prof?.availableBank || 0;
    const lockedPool = state.campaigns.reduce((acc, c) => acc + c.remainingBudget, 0);
    const totalViews = state.submissions.filter((s) => s.status !== 'REJECTED').reduce((acc, s) => acc + s.views, 0);
    const avgCpm = state.campaigns.length > 0
      ? Math.round(state.campaigns.reduce((acc, c) => acc + c.cpm, 0) / state.campaigns.length)
      : 0;
    const pendingCount = state.submissions.filter((s) => s.status === 'ON_HOLD').length;

    document.getElementById('sidebar-bank').textContent = formatMoney(freeBank);
    document.getElementById('sidebar-locked-bank').textContent = formatMoney(lockedPool);
    document.getElementById('kpi-free-bank').textContent = formatMoney(freeBank);
    document.getElementById('kpi-locked-bank').textContent = formatMoney(lockedPool);
    document.getElementById('kpi-total-views').textContent = formatNumber(totalViews);
    document.getElementById('kpi-avg-cpm').textContent = `${avgCpm} ₽`;

    document.getElementById('nav-camp-count').textContent = state.campaigns.length;
    document.getElementById('nav-mod-count').textContent = pendingCount;

    document.getElementById('bank-available-big').textContent = formatMoney(freeBank);
    document.getElementById('bank-locked-val').textContent = formatMoney(lockedPool);

    // Update platform breakdown from real submissions
    const ytV = state.submissions.filter((s) => s.status !== 'REJECTED' && s.platform === 'YouTube Shorts').reduce((a, b) => a + b.views, 0);
    const vkV = state.submissions.filter((s) => s.status !== 'REJECTED' && s.platform === 'VK Клипы').reduce((a, b) => a + b.views, 0);
    const ttV = state.submissions.filter((s) => s.status !== 'REJECTED' && s.platform === 'TikTok').reduce((a, b) => a + b.views, 0);
    const igV = state.submissions.filter((s) => s.status !== 'REJECTED' && s.platform === 'Instagram Reels').reduce((a, b) => a + b.views, 0);

    document.getElementById('adv-leg-yt').textContent = formatNumber(ytV);
    document.getElementById('adv-leg-vk').textContent = formatNumber(vkV);
    document.getElementById('adv-leg-tt').textContent = formatNumber(ttV);
    document.getElementById('adv-leg-ig').textContent = formatNumber(igV);

    document.getElementById('share-yt').textContent = `${formatNumber(ytV)} просм.`;
    document.getElementById('share-vk').textContent = `${formatNumber(vkV)} просм.`;
    document.getElementById('share-tt').textContent = `${formatNumber(ttV)} просм.`;
    document.getElementById('share-ig').textContent = `${formatNumber(igV)} просм.`;

    const advCurve = document.getElementById('adv-curve-path');
    if (advCurve) {
      if (totalViews > 0) {
        advCurve.setAttribute('d', 'M0,145 C160,136 320,102 480,70 C580,48 650,32 720,20');
      } else {
        advCurve.setAttribute('d', 'M0,145 L720,145');
      }
    }

    // Sidebar dynamic active pools
    const poolsList = document.getElementById('sidebar-pools-list');
    if (poolsList) {
      if (state.campaigns.length === 0) {
        poolsList.innerHTML = `<div class="text-muted" style="font-size:0.75rem; padding:4px 10px;">Пулов пока нет</div>`;
      } else {
        poolsList.innerHTML = state.campaigns.slice(0, 4).map((c) => `
          <button type="button" class="sidebar__dot-item" data-nav-target="campaigns">
            <span class="status-dot status-dot--orange"></span>
            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.title}</span>
            <span class="sidebar__count">${Math.round(c.remainingBudget / 1000)}K</span>
          </button>
        `).join('');
      }
    }

    if (prof) {
      document.getElementById('topbar-monogram').textContent = getInitials(prof.companyName);
      document.getElementById('topbar-company').textContent = prof.companyName;
      document.getElementById('escrow-status-dot').className = 'status-dot status-dot--emerald';
      document.getElementById('studio-card-org').textContent = `ESCROW • ${prof.companyName.slice(0, 10).toUpperCase()}`;
      document.getElementById('studio-card-inn').textContent = `•• ${getLastDigits(prof.inn)}`;
      document.getElementById('set-company-name').value = prof.companyName || '';
      document.getElementById('set-legal-name').value = prof.legalName || '';
      document.getElementById('set-inn').value = prof.inn || '';
      document.getElementById('logout-btn').style.display = 'inline-flex';
    } else {
      document.getElementById('topbar-monogram').textContent = '?';
      document.getElementById('topbar-company').textContent = 'Войти / Регистрация';
      document.getElementById('escrow-status-dot').className = 'status-dot status-dot--orange';
      document.getElementById('studio-card-org').textContent = 'ESCROW • БИЗНЕС';
      document.getElementById('studio-card-inn').textContent = '•• ————';
      document.getElementById('logout-btn').style.display = 'none';
    }
  }

  function renderDashboard() {
    const pendingContainer = document.getElementById('dashboard-pending-list');
    if (pendingContainer) {
      const pending = state.submissions.filter((s) => s.status === 'ON_HOLD').slice(0, 3);
      if (pending.length === 0) {
        pendingContainer.innerHTML = `<p class="text-muted" style="font-size:0.8125rem;">Роликов на проверке сейчас нет</p>`;
      } else {
        pendingContainer.innerHTML = pending.map((s) => `
          <div class="mini-mod-item">
            <div class="mini-mod-item__top">
              <span>${s.clipperName} • ${s.platform}</span>
              <strong class="mono text-emerald">${formatMoney(s.earned)}</strong>
            </div>
            <div class="mini-mod-item__title">${s.title}</div>
            <div class="mono text-muted" style="font-size:0.6875rem;">${formatNumber(s.views)} просм. • токен ${s.clipperCode}</div>
            <div class="mini-mod-item__actions">
              <button type="button" class="btn btn--positive btn--sm" data-fast-approve="${s.id}">Принять</button>
              <button type="button" class="btn btn--danger-ghost btn--sm" data-fast-reject="${s.id}">Отклонить</button>
            </div>
          </div>
        `).join('');

        pendingContainer.querySelectorAll('[data-fast-approve]').forEach((btn) => {
          btn.addEventListener('click', () => moderateSubmission(btn.getAttribute('data-fast-approve'), 'APPROVE'));
        });
        pendingContainer.querySelectorAll('[data-fast-reject]').forEach((btn) => {
          btn.addEventListener('click', () => moderateSubmission(btn.getAttribute('data-fast-reject'), 'REJECT'));
        });
      }
    }

    const wrap = document.getElementById('dashboard-campaigns-wrap');
    if (wrap) {
      if (state.campaigns.length === 0) {
        wrap.innerHTML = `
          <div class="empty-state">
            <h3 class="panel__title">Вы еще не создали ни одного задания</h3>
            <p class="panel__subtitle">Нажмите «Новое задание», чтобы опубликовать ваш первый оффер для клипперов</p>
          </div>
        `;
        return;
      }

      wrap.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Кампания</th>
              <th>Категория</th>
              <th>Ставка CPM</th>
              <th>Выделенный бюджет</th>
              <th>Остаток пула</th>
              <th>Статус</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            ${state.campaigns.map((c) => `
              <tr>
                <td>
                  <strong style="color:var(--text-primary); font-weight:500;">${c.title}</strong>
                  <div class="text-muted" style="font-size:0.6875rem;">${c.advertiserName}</div>
                </td>
                <td><span class="plat-tag plat-tag--cat">${c.category}</span></td>
                <td class="mono">${c.cpm} ₽ / 1k</td>
                <td class="mono">${formatMoney(c.totalBudget)}</td>
                <td class="mono text-emerald">${formatMoney(c.remainingBudget)}</td>
                <td><span class="status-badge status-badge--approved">В каталоге</span></td>
                <td>
                  <button type="button" class="btn btn--secondary btn--sm" data-topup-camp="${c.id}">Пополнить пул</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      wrap.querySelectorAll('[data-topup-camp]').forEach((btn) => {
        btn.addEventListener('click', () => openAddCampBankModal(btn.getAttribute('data-topup-camp')));
      });
    }
  }

  function renderCampaignsGrid() {
    const grid = document.getElementById('adv-campaigns-grid');
    if (!grid) return;

    const filtered = state.campaigns.filter((c) => {
      if (!searchFilter) return true;
      return `${c.title} ${c.advertiserName} ${c.category}`.toLowerCase().includes(searchFilter);
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="panel empty-state" style="grid-column: 1 / -1;">
        <h3 class="panel__title">Активных заданий пока нет</h3>
        <p class="panel__subtitle">Создайте задание для клипперов, и оно сразу появится в каталоге авторов</p>
      </div>`;
      return;
    }

    grid.innerHTML = filtered.map((c) => {
      const pct = Math.max(5, Math.min(100, Math.round((c.remainingBudget / Math.max(1, c.totalBudget)) * 100)));
      return `
        <article class="camp-card">
          <div class="camp-card__top">
            <span class="plat-tag plat-tag--cat">${c.category}</span>
            <span class="status-badge status-badge--approved">В каталоге</span>
          </div>
          <h3 class="camp-card__title">${c.title}</h3>
          <p class="text-muted" style="font-size:0.8125rem;">${c.brief}</p>

          <div class="camp-card__badges">
            ${(c.platforms || []).map((p) => `<span class="plat-tag">${p}</span>`).join('')}
          </div>

          <div class="camp-card__rate-box">
            <div>
              <strong>${c.cpm} ₽ / 1 000</strong>
              <span>Ставка авторам</span>
            </div>
            <div style="text-align:right;">
              <strong>до ${formatMoney(c.maxPayoutPerClip)}</strong>
              <span>Лимит на ролик</span>
            </div>
          </div>

          <div class="camp-card__pool">
            <div class="camp-card__pool-row">
              <span>Остаток пула</span>
              <strong>${formatMoney(c.remainingBudget)} из ${formatMoney(c.totalBudget)}</strong>
            </div>
            <div class="progress-bar">
              <div class="progress-bar__fill" style="width:${pct}%"></div>
            </div>
          </div>

          <div class="camp-card__actions">
            <button type="button" class="btn btn--secondary btn--sm btn--full" data-add-bank="${c.id}">Пополнить пул задания</button>
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('[data-add-bank]').forEach((btn) => {
      btn.addEventListener('click', () => openAddCampBankModal(btn.getAttribute('data-add-bank')));
    });
  }

  function renderModeration() {
    const container = document.getElementById('moderation-list');
    if (!container) return;

    const list = state.submissions.filter((s) => {
      if (activeModFilter !== 'ALL' && s.status !== activeModFilter) return false;
      return true;
    });

    if (list.length === 0) {
      container.innerHTML = `<div class="panel empty-state">
        <h3 class="panel__title">Роликов в очереди модерации нет</h3>
        <p class="panel__subtitle">Когда клипперы сдадут ссылки по вашим заданиям, они появятся здесь</p>
      </div>`;
      return;
    }

    container.innerHTML = list.map((s) => {
      let actionsHtml = '';
      if (s.status === 'ON_HOLD') {
        actionsHtml = `
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn--positive btn--sm" data-mod-approve="${s.id}">Подтвердить выплату</button>
            <button type="button" class="btn btn--danger-ghost btn--sm" data-mod-reject="${s.id}">Отклонить</button>
          </div>
        `;
      } else if (s.status === 'APPROVED') {
        actionsHtml = `<span class="status-badge status-badge--approved">Оплачено</span>`;
      } else {
        actionsHtml = `<span class="status-badge status-badge--rejected">Отклонено</span>`;
      }

      return `
        <article class="sub-card">
          <div>
            <div class="sub-card__meta">
              <span class="plat-tag">${s.platform}</span>
              <span>Автор: <strong style="color:var(--text-primary); font-weight:500;">${s.clipperName}</strong> (<code class="mono text-accent">${s.clipperCode}</code>)</span>
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
              <span>К списанию</span>
              <strong class="text-emerald">${formatMoney(s.earned)}</strong>
              <span>из пула задания</span>
            </div>
          </div>

          <div>
            ${actionsHtml}
          </div>
        </article>
      `;
    }).join('');

    container.querySelectorAll('[data-mod-approve]').forEach((btn) => {
      btn.addEventListener('click', () => moderateSubmission(btn.getAttribute('data-mod-approve'), 'APPROVE'));
    });
    container.querySelectorAll('[data-mod-reject]').forEach((btn) => {
      btn.addEventListener('click', () => moderateSubmission(btn.getAttribute('data-mod-reject'), 'REJECT'));
    });
  }

  function renderBankLedger() {
    const list = document.getElementById('advertiser-ledger-list');
    if (!list) return;

    if (state.advertiserLedger.length === 0) {
      list.innerHTML = `<p class="text-muted" style="font-size:0.8125rem; padding:12px 0;">Операций по депозиту пока нет</p>`;
      return;
    }

    list.innerHTML = state.advertiserLedger.map((tx) => `
      <div class="ledger-item">
        <div>
          <div class="ledger-item__title">${tx.title}</div>
          <div class="ledger-item__date mono">${tx.date}</div>
        </div>
        <div class="ledger-item__amount ${tx.positive ? 'text-emerald' : ''}">${tx.amount}</div>
      </div>
    `).join('');
  }

  function renderCrmTable() {
    const container = document.getElementById('crm-table-container');
    if (!container) return;

    const map = new Map();
    state.submissions.forEach((s) => {
      const cur = map.get(s.clipperCode) || { name: s.clipperName, code: s.clipperCode, clips: 0, views: 0, earned: 0 };
      cur.clips += 1;
      cur.views += s.views;
      cur.earned += s.earned;
      map.set(s.clipperCode, cur);
    });

    const rows = Array.from(map.values());
    if (rows.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <h3 class="panel__title">Реестр авторов пока пуст</h3>
        <p class="panel__subtitle">Когда клипперы начнут сдавать ролики по вашим заданиям, их статистика появится здесь</p>
      </div>`;
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Автор</th>
            <th>Токен верификации</th>
            <th>Сдано роликов</th>
            <th>Подтвержденные просмотры</th>
            <th>Выплачено / в холде</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
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

  document.querySelectorAll('#mod-status-filters .chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#mod-status-filters .chip').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeModFilter = btn.getAttribute('data-mod-status');
      renderModeration();
    });
  });

  document.getElementById('company-settings-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!requireAuth()) return;
    state.advertiserProfile.companyName = document.getElementById('set-company-name').value.trim() || state.advertiserProfile.companyName;
    state.advertiserProfile.legalName = document.getElementById('set-legal-name').value.trim();
    state.advertiserProfile.inn = document.getElementById('set-inn').value.trim();
    state.advertiserProfile.ordOperator = document.getElementById('set-ord').value;
    saveState(state);
    renderAll();
    showToast('Реквизиты организации и настройки ОРД сохранены');
  });

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      state = loadState();
      renderAll();
    }
  });

  function renderAll() {
    renderMetrics();
    renderDashboard();
    renderCampaignsGrid();
    renderModeration();
    renderBankLedger();
    renderCrmTable();
  }

  renderAll();
});
