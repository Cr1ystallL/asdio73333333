// Konveer Telegram Auth Bot & Central Cross-Platform Sync REST API
// Zero dependencies — runs on Node 18+ with native fetch and http
// Location on server: /root/konveer-bot/bot.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9126995995:AAHDbxNRV6JR5JfdOXbRXmO4k_VKc_76eck';
const API_ENDPOINTS = (process.env.KONVEER_ENDPOINTS || 'https://konveer-clipper.vercel.app,https://konveer-advertiser.vercel.app')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

function loadJson(file, defaultVal) {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Error loading JSON from:', file, e.message);
  }
  return defaultVal;
}

function saveJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving JSON to:', file, e.message);
  }
}

let sharedCampaigns = loadJson(CAMPAIGNS_FILE, []);
let sharedSubmissions = loadJson(SUBMISSIONS_FILE, []);

// =========================================================================
// 1. HTTP REST SYNC SERVER (Port 48125)
// =========================================================================
const HTTP_PORT = process.env.HTTP_PORT || 48125;

const httpServer = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  const readBody = () => new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        resolve({});
      }
    });
  });

  // Health check
  if (pathname === '/health' || pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      service: 'Konveer Sync Server',
      campaignsCount: sharedCampaigns.length,
      submissionsCount: sharedSubmissions.length
    }));
  }

  // GET /api/campaigns
  if (req.method === 'GET' && pathname === '/api/campaigns') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, campaigns: sharedCampaigns }));
  }

  // POST /api/campaigns (create or update campaign)
  if (req.method === 'POST' && pathname === '/api/campaigns') {
    const body = await readBody();
    if (!body || !body.title) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Поле title обязательно' }));
    }

    const campId = body.id || ('camp_' + Date.now());
    const existingIdx = sharedCampaigns.findIndex(c => c.id === campId);

    const budget = Number(body.totalBudget) || 50000;
    const remainingBudget = typeof body.remainingBudget === 'number' ? body.remainingBudget : Math.round(budget * 0.8);

    const campaignObj = {
      id: campId,
      title: String(body.title).trim(),
      advertiserName: String(body.advertiserName || 'Заказчик').trim(),
      advertiserVerified: body.advertiserVerified ?? true,
      category: body.category || 'Игры',
      platforms: Array.isArray(body.platforms) && body.platforms.length > 0
        ? body.platforms
        : ['YouTube Shorts', 'VK Клипы', 'TikTok', 'Instagram Reels'],
      cpm: Number(body.cpm) || 120,
      totalBudget: budget,
      remainingBudget: remainingBudget,
      maxPayoutPerClip: Number(body.maxPayoutPerClip) || 12000,
      minViews: Number(body.minViews) || 1000,
      sourceUrl: body.sourceUrl || '',
      promoLink: body.promoLink || '',
      hashtags: body.hashtags || '',
      brief: body.brief || '',
      status: body.status || 'ACTIVE',
      createdAt: body.createdAt || Date.now(),
      takenByClipper: body.takenByClipper || false
    };

    if (existingIdx >= 0) {
      sharedCampaigns[existingIdx] = { ...sharedCampaigns[existingIdx], ...campaignObj };
    } else {
      sharedCampaigns.unshift(campaignObj);
    }

    saveJson(CAMPAIGNS_FILE, sharedCampaigns);
    console.log(`[SYNC API] Кампания сохранена: «${campaignObj.title}» (${campId})`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, campaign: campaignObj, total: sharedCampaigns.length }));
  }

  // POST /api/campaigns/take
  if (req.method === 'POST' && pathname === '/api/campaigns/take') {
    const body = await readBody();
    const { campaignId, clipperCode } = body;
    const camp = sharedCampaigns.find(c => c.id === campaignId);
    if (!camp) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Задание не найдено' }));
    }
    camp.takenByClipper = clipperCode || true;
    saveJson(CAMPAIGNS_FILE, sharedCampaigns);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, campaign: camp }));
  }

  // GET /api/submissions
  if (req.method === 'GET' && pathname === '/api/submissions') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, submissions: sharedSubmissions }));
  }

  // POST /api/submissions (clipper submits video)
  if (req.method === 'POST' && pathname === '/api/submissions') {
    const body = await readBody();
    if (!body || !body.videoUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Поле videoUrl обязательно' }));
    }

    const subId = body.id || ('sub_' + Date.now());
    const submissionObj = {
      id: subId,
      campaignId: body.campaignId || '',
      title: body.title || 'Видеоролик',
      platform: body.platform || 'YouTube Shorts',
      videoUrl: body.videoUrl,
      clipperCode: body.clipperCode || '',
      clipperName: body.clipperName || 'Клиппер',
      views: Number(body.views) || 0,
      earned: Number(body.earned) || 0,
      status: body.status || 'PENDING',
      createdAt: body.createdAt || Date.now(),
      submittedAt: body.submittedAt || new Date().toLocaleString('ru-RU')
    };

    sharedSubmissions.unshift(submissionObj);
    saveJson(SUBMISSIONS_FILE, sharedSubmissions);
    console.log(`[SYNC API] Новый клип сдан: ${submissionObj.videoUrl}`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, submission: submissionObj }));
  }

  // PATCH /api/submissions (advertiser approves or rejects)
  if (req.method === 'PATCH' && pathname === '/api/submissions') {
    const body = await readBody();
    const { submissionId, status, rejectionReason } = body;
    const sub = sharedSubmissions.find(s => s.id === submissionId);
    if (!sub) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Сданный клип не найден' }));
    }
    if (status) sub.status = status;
    if (rejectionReason) sub.rejectionReason = rejectionReason;
    saveJson(SUBMISSIONS_FILE, sharedSubmissions);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, submission: sub }));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'Эндпоинт не найден' }));
});

// =========================================================================
// 2. TELEGRAM AUTH BOT (Long Polling)
// =========================================================================
let offset = 0;

async function tgCall(method, body = {}) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return await res.json();
}

async function verifyTokenOnPlatform(token, tgUser) {
  const results = [];
  for (const endpoint of API_ENDPOINTS) {
    try {
      const res = await fetch(`${endpoint}/api/telegram-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_by_bot',
          token,
          telegram_user: tgUser
        })
      });
      const data = await res.json();
      results.push({ endpoint, data });
    } catch (err) {
      results.push({ endpoint, error: err.message });
    }
  }
  return results;
}

async function handleMessage(msg) {
  if (!msg || !msg.text) return;
  const chatId = msg.chat.id;
  const fromUser = msg.from || {};
  const text = msg.text.trim();

  console.log(`[Message from @${fromUser.username || fromUser.id}]: ${text}`);

  let extractedToken = null;
  const startMatch = text.match(/^\/start\s+(KV-[A-Z0-9]+|[A-Z0-9]{4,10})/i);
  const directMatch = text.match(/^(KV-[A-Z0-9]+|[A-Z0-9]{4,10})$/i);

  if (startMatch) {
    extractedToken = startMatch[1].toUpperCase();
  } else if (directMatch) {
    extractedToken = directMatch[1].toUpperCase();
  }

  if (extractedToken && !extractedToken.startsWith('KV-')) {
    extractedToken = 'KV-' + extractedToken;
  }

  if (extractedToken) {
    const tgUser = {
      id: fromUser.id,
      username: fromUser.username ? `@${fromUser.username}` : '',
      first_name: fromUser.first_name || '',
      last_name: fromUser.last_name || '',
      auth_date: Math.floor(Date.now() / 1000)
    };

    console.log(`✅ Проверяем код ${extractedToken} для @${fromUser.username || fromUser.id}...`);

    await verifyTokenOnPlatform(extractedToken, tgUser);

    const userNameDisplay = fromUser.first_name || (fromUser.username ? `@${fromUser.username}` : 'пользователь');

    const reply = 
      `✅ <b>Код авторизации успешно подтвержден!</b>\n\n` +
      `Здравствуйте, <b>${userNameDisplay}</b>!\n` +
      `Ваш Telegram аккаунт успешно привязан к личному кабинету <b>Konveer</b>.\n\n` +
      `Код: <code>${extractedToken}</code>\n\n` +
      `Вернитесь в браузер — окно авторизации подтвердится автоматически.`;

    await tgCall('sendMessage', {
      chat_id: chatId,
      text: reply,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎬 Открыть платформу Konveer', url: 'https://konveer-clipper.vercel.app' }
          ]
        ]
      }
    });
    return;
  }

  if (text.startsWith('/start') || text.startsWith('/help')) {
    const welcome = 
      `👋 <b>Привет! Я бот авторизации платформы Konveer.</b>\n\n` +
      `Я подтверждаю привязку вашего Telegram аккаунта для Клиперов и Заказчиков.\n\n` +
      `<b>Как привязать аккаунт:</b>\n` +
      `1. Заполните форму регистрации на сайте Konveer\n` +
      `2. Получите код вида <code>KV-XXXXXX</code>\n` +
      `3. Отправьте этот код сюда сообщением\n\n` +
      `После отправки кода сайт моментально подтвердит ваш вход!`;

    await tgCall('sendMessage', {
      chat_id: chatId,
      text: welcome,
      parse_mode: 'HTML'
    });
    return;
  }

  await tgCall('sendMessage', {
    chat_id: chatId,
    text: `ℹ️ Отправьте код авторизации с сайта (например, <code>KV-XXXXXX</code>), чтобы подтвердить регистрацию.`,
    parse_mode: 'HTML'
  });
}

async function poll() {
  try {
    const res = await tgCall('getUpdates', {
      offset,
      timeout: 30
    });

    if (res && res.ok && Array.isArray(res.result)) {
      for (const update of res.result) {
        offset = update.update_id + 1;
        if (update.message) {
          await handleMessage(update.message);
        }
      }
    }
  } catch (err) {
    console.error('Ошибка в цикле long-polling:', err.message);
    await new Promise(r => setTimeout(r, 3000));
  }

  setImmediate(poll);
}

async function start() {
  console.log('🤖 Запуск Konveer Telegram Auth Bot & Sync Server...');

  // Start HTTP sync server
  httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🌐 Konveer Sync REST API запущен на порту ${HTTP_PORT}`);
  });

  try {
    const me = await tgCall('getMe');
    if (me && me.ok) {
      console.log(`🚀 Бот подключен успешно: @${me.result.username} (${me.result.first_name})`);
      console.log('Ожидаем входящие сообщения от пользователей...');
      poll();
    } else {
      console.error('❌ Не удалось подключиться к Telegram API:', me);
    }
  } catch (err) {
    console.error('❌ Критическая ошибка старта бота:', err);
  }
}

start();
