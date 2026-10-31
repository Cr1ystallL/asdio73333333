// Vercel Serverless Function — Official Telegram Gateway API (@VerificationCodes)
// Docs: https://core.telegram.org/gateway/api
const crypto = require('crypto');

function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  }
  if (digits.length === 10 && digits.startsWith('9')) {
    digits = '7' + digits;
  }
  return '+' + digits;
}

function createSignedToken(phone, code, expiresAt, secret) {
  const payload = `${phone}:${code}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ phone, expiresAt, sig: hmac })).toString('base64url');
}

function verifySignedToken(token, code, secret) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    if (!decoded || !decoded.phone || !decoded.expiresAt || !decoded.sig) {
      return { valid: false, reason: 'Некорректный токен сессии' };
    }
    if (Date.now() > decoded.expiresAt) {
      return { valid: false, reason: 'Срок действия кода истек. Запросите новый код' };
    }
    const expectedPayload = `${decoded.phone}:${String(code).trim()}:${decoded.expiresAt}`;
    const expectedHmac = crypto.createHmac('sha256', secret).update(expectedPayload).digest('hex');
    if (expectedHmac !== decoded.sig) {
      return { valid: false, reason: 'Неверный код подтверждения из @VerificationCodes' };
    }
    return { valid: true, phone: decoded.phone };
  } catch (err) {
    return { valid: false, reason: 'Ошибка проверки кода' };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const action = body.action || 'send';
  const gatewayToken = process.env.TELEGRAM_GATEWAY_TOKEN || '';
  const signingSecret = process.env.TELEGRAM_GATEWAY_TOKEN || process.env.VERCEL_GIT_COMMIT_SHA || 'konveer_tg_gateway_secret_2026';

  // 1. SEND VERIFICATION CODE TO @VerificationCodes
  if (action === 'send') {
    const normalizedPhone = normalizePhone(body.phone);
    const digitsOnly = normalizedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return res.status(400).json({
        ok: false,
        error: 'Введите корректный номер телефона в международном формате (+7...)'
      });
    }

    const generatedCode = String(crypto.randomInt(100000, 999999));
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const sessionToken = createSignedToken(normalizedPhone, generatedCode, expiresAt, signingSecret);

    // If TELEGRAM_GATEWAY_TOKEN is configured in Vercel Environment Variables, call real Telegram Gateway API
    if (gatewayToken) {
      try {
        const tgRes = await fetch('https://gatewayapi.telegram.org/sendVerificationMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gatewayToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone_number: normalizedPhone,
            code: generatedCode,
            ttl: 300
          })
        });
        const tgData = await tgRes.json();

        if (tgData && tgData.ok && tgData.result) {
          return res.status(200).json({
            ok: true,
            mode: 'live',
            phone: normalizedPhone,
            request_id: tgData.result.request_id,
            session_token: sessionToken,
            channel: '@VerificationCodes'
          });
        } else {
          return res.status(400).json({
            ok: false,
            error: (tgData && tgData.error)
              ? `Шлюз Telegram (@VerificationCodes): ${tgData.error}`
              : 'Не удалось отправить код через Telegram Gateway API'
          });
        }
      } catch (err) {
        return res.status(502).json({
          ok: false,
          error: 'Ошибка соединения с gatewayapi.telegram.org'
        });
      }
    }

    // Sandbox / Demo fallback when TELEGRAM_GATEWAY_TOKEN is not yet added in Vercel settings
    return res.status(200).json({
      ok: true,
      mode: 'sandbox',
      phone: normalizedPhone,
      session_token: sessionToken,
      sandbox_code: generatedCode,
      channel: '@VerificationCodes',
      hint: 'Добавьте переменную TELEGRAM_GATEWAY_TOKEN в настройках Vercel для боевой отправки в чат @VerificationCodes'
    });
  }

  // 2. CHECK VERIFICATION CODE FROM @VerificationCodes
  if (action === 'check') {
    const code = String(body.code || '').trim();
    const sessionToken = body.session_token || '';
    const requestId = body.request_id || '';

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        ok: false,
        error: 'Код из @VerificationCodes должен состоять из 6 цифр'
      });
    }

    // Verify signed session token
    if (sessionToken) {
      const check = verifySignedToken(sessionToken, code, signingSecret);
      if (!check.valid) {
        return res.status(400).json({ ok: false, error: check.reason });
      }
      return res.status(200).json({
        ok: true,
        verified: true,
        phone: check.phone,
        channel: '@VerificationCodes'
      });
    }

    // Fallback check directly via Telegram Gateway API if request_id is used without sessionToken
    if (gatewayToken && requestId) {
      try {
        const tgRes = await fetch('https://gatewayapi.telegram.org/checkVerificationStatus', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gatewayToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            request_id: requestId,
            code
          })
        });
        const tgData = await tgRes.json();
        const status = tgData?.result?.verification_status?.status;
        if (tgData && tgData.ok && status === 'code_valid') {
          return res.status(200).json({
            ok: true,
            verified: true,
            channel: '@VerificationCodes'
          });
        }
        return res.status(400).json({
          ok: false,
          error: 'Неверный код подтверждения @VerificationCodes'
        });
      } catch (err) {
        return res.status(502).json({
          ok: false,
          error: 'Ошибка проверки статуса в Telegram Gateway'
        });
      }
    }

    return res.status(400).json({
      ok: false,
      error: 'Сессия верификации не найдена. Запросите код повторно'
    });
  }

  return res.status(400).json({ ok: false, error: 'Неизвестное действие' });
};
