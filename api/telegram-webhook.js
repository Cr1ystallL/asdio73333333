// Vercel Serverless Function — Telegram Webhook Handler
// Handles incoming updates from Telegram Bot API when running serverless
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Konveer Telegram Webhook is live. Send POST updates from Telegram.');
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const update = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  const message = update.message || update.edited_message;
  if (!message || !message.text) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  const chatId = message.chat.id;
  const fromUser = message.from || {};
  const text = message.text.trim();

  // Helper to send message via Telegram Bot API
  async function sendMessage(textToSend, extra = {}) {
    if (!botToken) return;
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: textToSend,
          parse_mode: 'HTML',
          ...extra
        })
      });
    } catch (err) {
      console.error('Failed to send Telegram message:', err);
    }
  }

  // Parse token: e.g. "/start KV-A89B2" or "KV-A89B2" or "A89B2"
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
    // Record verified session in global in-memory session map
    const globalSessions = global.__konveer_sessions || new Map();
    global.__konveer_sessions = globalSessions;

    const tgUser = {
      id: fromUser.id,
      username: fromUser.username ? `@${fromUser.username}` : '',
      first_name: fromUser.first_name || '',
      last_name: fromUser.last_name || '',
      auth_date: Math.floor(Date.now() / 1000)
    };

    let session = globalSessions.get(extractedToken) || {
      token: extractedToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000
    };

    session.status = 'verified';
    session.telegramUser = tgUser;
    session.verifiedAt = Date.now();
    globalSessions.set(extractedToken, session);

    const userNameDisplay = fromUser.first_name || (fromUser.username ? `@${fromUser.username}` : 'пользователь');

    const replyText = 
      `✅ <b>Код успешно подтвержден!</b>\n\n` +
      `Здравствуйте, <b>${userNameDisplay}</b>! Ваш Telegram аккаунт успешно привязан к платформе <b>Konveer</b>.\n\n` +
      `Токен авторизации: <code>${extractedToken}</code>\n\n` +
      `Вернитесь на сайт в браузере — окно авторизации подтвердится автоматически, и вы попадете в свой личный кабинет.`;

    await sendMessage(replyText, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎬 Открыть платформу Konveer', url: 'https://konveer-clipper.vercel.app' }
          ]
        ]
      }
    });

    return res.status(200).json({ ok: true, verified: true, token: extractedToken });
  }

  // If user sent standard /start without code or /help
  if (text.startsWith('/start') || text.startsWith('/help')) {
    const welcome = 
      `👋 <b>Привет! Я официальный бот авторизации платформы Konveer.</b>\n\n` +
      `Я помогаю быстро и бесплатно подтвердить ваш Telegram для кабинета Клипера или Заказчика.\n\n` +
      `<b>Как пройти верификацию:</b>\n` +
      `1. Заполните форму регистрации на сайте\n` +
      `2. Получите код авторизации (например, <code>KV-84920</code>)\n` +
      `3. Отправьте этот код мне сюда в чат (или нажмите ссылку на сайте)\n\n` +
      `После отправки кода ваш аккаунт будет мгновенно подтвержден на сайте!`;

    await sendMessage(welcome);
    return res.status(200).json({ ok: true });
  }

  // Any other text
  await sendMessage(
    `ℹ️ Отправьте код авторизации с сайта (например, <code>KV-XXXXXX</code>), чтобы подтвердить регистрацию.`
  );
  return res.status(200).json({ ok: true });
};
