# Telegram-бот авторизации Konveer

Бесплатный бот для подтверждения регистрации и мгновенной привязки Telegram-аккаунта к личным кабинетам **Клипера** и **Заказчика**.

---

## 🚀 Быстрый запуск за 2 минуты (Long Polling)

### 1. Получите токен бота в Telegram
1. Откройте в Telegram официального бота **[@BotFather](https://t.me/BotFather)**.
2. Отправьте команду `/newbot`.
3. Задайте имя (например, `Konveer Auth Bot`) и юзернейм (например, `konveer_auth_bot`).
4. Скопируйте полученный HTTP API токен (вида `7123456789:AAH...`).

### 2. Запуск бота
В терминале перейдите в папку бота и запустите его (работает на Node.js 18+ без установки дополнительных библиотек):

```bash
# Windows PowerShell
$env:TELEGRAM_BOT_TOKEN="ВАШ_ТОКЕН_ОТ_BOTFATHER"
$env:KONVEER_API_URL="https://konveer-clipper.vercel.app"
node bot/bot.js

# Linux / macOS / Bash
export TELEGRAM_BOT_TOKEN="ВАШ_ТОКЕН_ОТ_BOTFATHER"
export KONVEER_API_URL="https://konveer-clipper.vercel.app"
node bot/bot.js
```

---

## ⚡ Автодеплой на Vercel (через Webhook, без VPS)

Если вы не хотите держать запущенный скрипт на компьютере, бот может работать прямо как бессерверная функция на Vercel!

1. В настройках проекта `konveer-clipper` в Vercel добавьте переменные:
   - `TELEGRAM_BOT_TOKEN`: токен от `@BotFather`
   - `TELEGRAM_BOT_USERNAME`: имя вашего бота (без `@`, например `konveer_auth_bot`)
2. Привяжите вебхук одной командой в браузере или через curl:
   ```bash
   https://api.telegram.org/botВАШ_ТОКЕН/setWebhook?url=https://konveer-clipper.vercel.app/api/telegram-webhook
   ```
Всё! Telegram будет сам присылать обновления в Vercel, и бот будет мгновенно отвечать пользователям 24/7 совершенно бесплатно.
