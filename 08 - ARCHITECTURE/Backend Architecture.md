---
title: "Архитектура Бэкенда (Backend Architecture)"
type: architecture
status: approved
priority: critical
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - architecture
  - backend
  - nestjs
  - fastify
  - nodejs
  - typescript
---

# Архитектура Бэкенда (Backend Architecture)

Документ описывает технический стек, паттерны проектирования и внутреннюю организацию серверной части платформы Konveer.

---

## 1. Выбор технологического стека

| Компонент | Выбранная технология | Обоснование выбора | Альтернативы и причина отклонения |
| :--- | :--- | :--- | :--- |
| **Среда выполнения** | **Node.js 22 LTS / TypeScript 5.x** | Единый язык (TS) для фронта и бэка, богатая экосистема API соцсетей | Go/Rust (избыточная сложность разработки для фазы MVP) |
| **Фреймворк** | **NestJS (на движке Fastify)** | Встроенный Dependency Injection, модульная структура, валидация DTO (class-validator), автогенерация Swagger/OpenAPI | Express (устарел, слабая типизация), чистый Fastify (нет стандартной архитектуры) |
| **ORM / Query Builder** | **Prisma + Kysely (для сложных финансовых запросов)** | Строгая типобезопасность, автогенерация миграций, поддержка сложных транзакций `tx.$transaction` | TypeORM (устарел, баги в миграциях) |
| **Очереди задач** | **BullMQ + Redis 7** | Надежная доставка задач, поддержка задержек (72h hold), повторов (backoff), rate limiting для внешних API | RabbitMQ/Kafka (слишком сложная поддержка для старта) |

---

## 2. Слоистая архитектура модуля (Clean / Onion Architecture)

Каждый доменный модуль организован по единому стандарту:
```
src/modules/campaign/
├── controllers/       # HTTP / Webhook эндпоинты, трансформация DTO
├── services/          # Бизнес-логика, транзакционные границы
├── domain/            # Чистые сущности, бизнес-правила, инварианты
├── repositories/      # Работа с БД через Prisma / SQL-запросы
├── queues/            # Обработчики фоновых очередей BullMQ
└── dto/               # Входные и выходные схемы с валидацией
```

---

## Связанные документы
- [[08 - ARCHITECTURE/System Architecture|Общая системная архитектура]]
- [[08 - ARCHITECTURE/API Architecture|Архитектура API]]
- [[08 - ARCHITECTURE/Queue Architecture|Архитектура очередей BullMQ]]
