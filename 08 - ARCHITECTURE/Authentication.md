---
title: "Архитектура Аутентификации (Authentication)"
type: architecture
status: approved
priority: critical
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - architecture
  - auth
  - jwt
  - telegram-initdata
  - security
---

# Архитектура Аутентификации (Authentication)

Документ описывает механизмы подтверждения личности пользователей платформы Konveer через Telegram Mini App и Web-кабинет.

---

## 1. Авторизация клипперов через Telegram Mini App (TMA)

Для клипперов полностью устранены формы регистрации, логины и пароли:

```mermaid
sequenceDiagram
    autonumber
    actor User as Клиппер
    participant TMA as Telegram Client
    participant Frontend as TMA Frontend (Next.js)
    participant Backend as NestJS API

    User->>TMA: Запуск @KonveerBot / Открытие Mini App
    TMA->>Frontend: Передача initData в query string
    Frontend->>Backend: POST /api/v1/auth/telegram { initData: "query_id=...&user=...&hash=..." }
    Backend->>Backend: 1. Парсинг параметров, сортировка по алфавиту<br/>2. HMAC-SHA256(bot_token, "WebAppData")<br/>3. HMAC-SHA256(data_check_string, secret_key)<br/>4. Проверка совпадения hash и срока auth_date (< 24ч)
    alt Подпись верна
        Backend->>Backend: Upsert пользователя по telegram_id
        Backend-->>Frontend: { accessToken (JWT 15m), refreshToken (HttpOnly Cookie 30d) }
        Frontend->>Frontend: Сохранение сессии в памяти
    else Подпись неверна
        Backend-->>Frontend: 401 Unauthorized
    end
```

---

## 2. Авторизация рекламодателей и администраторов в Web-кабинете
- **Рекламодатели**: Вход по Email + Одноразовый код (Magic Link / OTP) в Telegram-бот либо SMS + опционально вход через Telegram Login Widget.
- **Администраторы**: Вход строго по связке Логин/Пароль + Обязательная двухфакторная аутентификация (TOTP Google Authenticator) + привязка к белому списку IP-адресов VPN офиса.

---

## Связанные документы
- [[08 - ARCHITECTURE/Authorization (RBAC)|Авторизация (RBAC)]]
- [[05 - INTEGRATIONS/Telegram Bot API|Интеграция с Telegram Bot API]]
- [[08 - ARCHITECTURE/Security Architecture|Архитектура безопасности]]
