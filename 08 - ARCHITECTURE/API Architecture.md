---
title: "Архитектура API и Контракты (API Architecture)"
type: architecture
status: approved
priority: high
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - architecture
  - api
  - rest
  - openapi
  - idempotency
---

# Архитектура API и Контракты (API Architecture)

Документ регламентирует стандарты проектирования RESTful API платформы Konveer, правила версионирования, обработки ошибок и защиты от перегрузок.

---

## 1. Стандарты и Версионирование

- **Формат протокола**: REST поверх HTTPS (TLS 1.3), JSON payloads.
- **Версионирование**: Через URI префикс `/api/v1/...`.
- **Спецификация**: Полная автогенерация контрактов OpenAPI 3.1 / Swagger (`/api/docs`).
- **Заголовки идемпотентности**: Для всех `POST` и `PUT` мутаций финансовых сущностей обязателен заголовок `X-Idempotency-Key: <UUIDv4>`.

---

## 2. Группы эндпоинтов

### 1. Авторизация и Профиль (`/api/v1/auth`, `/api/v1/profile`)
- `POST /api/v1/auth/telegram`: Валидация `initData` от TMA, выдача пары Access/Refresh JWT.
- `GET /api/v1/profile/me`: Получение текущей роли, балансов и репутации.
- `POST /api/v1/profile/bind-tax-id`: Привязка и верификация ИНН самозанятого.

### 2. Кампании (`/api/v1/campaigns`)
- `GET /api/v1/campaigns`: Каталог открытых кампаний с фильтрацией по ставке, тематике и платформе.
- `GET /api/v1/campaigns/:id`: Детальная страница кампании, бриф, ссылки на скачивание исходников.
- `POST /api/v1/campaigns`: Создание новой кампании (только для рекламодателя).
- `POST /api/v1/campaigns/:id/fund`: Пополнение пула кампании из доступного баланса.

### 3. Сдача роликов и Статистика (`/api/v1/submissions`)
- `POST /api/v1/submissions`: Отправка ссылки на ролик (YouTube / VK) на проверку.
- `GET /api/v1/submissions/my`: Список отправленных роликов клиппера с текущими просмотрами и статусом холда.

### 4. Финансы и Выплаты (`/api/v1/finance`, `/api/v1/payouts`)
- `POST /api/v1/finance/deposit`: Инициализация пополнения счета через Т-Кассу / СБП.
- `POST /api/v1/payouts/request`: Запрос на вывод средств через СБП.
- `GET /api/v1/payouts/history`: История выплат со ссылками на фискальные чеки ФНС.

---

## Связанные документы
- [[08 - ARCHITECTURE/Authentication|Аутентификация]]
- [[08 - ARCHITECTURE/Authorization (RBAC)|Авторизация (RBAC)]]
- [[04 - FINANCE/Payment Processing|Процессинг платежей]]
