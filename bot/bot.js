// Konveer Telegram Auth Bot (Long Polling Runner)
// Zero dependencies — works on Node 18+ with native fetch!
// Run: node bot.js

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9126995995:AAHDbxNRV6JR5JfdOXbRXmO4k_VKc_76eck';
const API_ENDPOINTS = (process.env.KONVEER_ENDPOINTS || 'https://konveer-clipper.vercel.app,https://konveer-advertiser.vercel.app')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

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

  // Extract token: "/start KV-A7B8C", "KV-A7B8C", "A7B8C"
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

    // Verify token on the website API
    await verifyTokenOnPlatform(extractedToken, tgUser);

    const userNameDisplay = fromUser.first_name || (fromUser.username ? `@${fromUser.username}` : 'пользователь');

    const reply = 
      `✅ <b>Код авторизации успешно подтвержден!</b>\n\n` +
      `Здравствуйте, <b>${userNameDisplay}</b>!\n` +
      `Ваш Telegram аккаунт успешно привязан к личному кабинету <b>Konveer</b>.\n\n` +
      `Код: <code>${extractedToken}</code>\n\n` +
      `Вернитесь в браузер — окно авторизации подтвердится автоматически, и вы попадете в свой кабинет.`;

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
      `1. Заполните данные на сайте Konveer\n` +
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

  // Next poll
  setImmediate(poll);
}

async function start() {
  console.log('🤖 Запуск Konveer Telegram Auth Bot...');
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
