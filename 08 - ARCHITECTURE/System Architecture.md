---
title: "Общая Системная Архитектура (System Architecture)"
type: architecture
status: approved
priority: critical
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - architecture
  - c4-model
  - modular-monolith
  - overview
---

# Общая Системная Архитектура Платформы (System Architecture)

Документ описывает глобальное устройство платформы **Konveer** с использованием модели C4 (Context, Containers).

---

## 1. Системный контекст (C4 Context Diagram)

```mermaid
C4Context
    title C4 Context: Экосистема маркетплейса коротких видео Konveer

    Person(clipper, "Клиппер", "Создает Shorts/Reels/VK Clips, зарабатывает на просмотрах")
    Person(advertiser, "Рекламодатель", "Выделяет рекламный бюджет, загружает исходники")
    Person(admin, "Администратор / Модератор", "Управляет спорами, антифродом и выплатами")

    System(konveer, "Платформа Konveer", "Управляет кампаниями, эскроу-бюджетами, трекингом просмотров и выплатами")

    System_Ext(telegram, "Telegram Cloud", "Авторизация пользователей, Mini App, бот уведомлений")
    System_Ext(youtube, "YouTube Data API", "Публичная статистика Shorts (просмотры, лайки)")
    System_Ext(vk, "VK API", "Статистика VK Клипов")
    System_Ext(tbank, "Т-Банк (Т-Касса & СБП)", "Эквайринг B2C/B2B и моментальные выплаты самозанятым")
    System_Ext(fns, "ФНС РФ (Мой налог)", "Автоматическая регистрация чеков самозанятых")
    System_Ext(selectel, "Selectel S3", "Хранилище видеоисходников и медиа-ассетов")

    Rel(clipper, telegram, "Работает через", "Telegram Mini App")
    Rel(telegram, konveer, "Передает initData и Webhook", "HTTPS / JSON")
    Rel(advertiser, konveer, "Управляет кампаниями", "HTTPS / Web Dashboard")
    Rel(admin, konveer, "Модерирует и разрешает споры", "Admin Panel")

    Rel(konveer, youtube, "Опрашивает статистику видео", "HTTPS / REST API v3")
    Rel(konveer, vk, "Опрашивает просмотры клипов", "HTTPS / VK API execute")
    Rel(konveer, tbank, "Инициализирует платежи и выплаты", "mTLS / REST API")
    Rel(konveer, fns, "Регистрирует чеки", "API через Т-Банк")
    Rel(konveer, selectel, "Генерирует pre-signed URLs", "S3 SigV4")
```

---

## 2. Архитектурный стиль: Модульный монолит (Modular Monolith)

Для стадии MVP и масштабирования до 100 000 активных пользователей выбран **Модульный Монолит** вместо микросервисов:
- Единая кодовая база на TypeScript / Node.js (NestJS или Fastify).
- Строгая изоляция модулей по принципам Domain-Driven Design (DDD):
  - `modules/auth`: Авторизация TMA, JWT, RBAC.
  - `modules/campaigns`: Жизненный цикл рекламных заданий и эскроу.
  - `modules/submissions`: Учет видео, дедупликация, метаданные.
  - `modules/tracking`: Фоновый опрос API YouTube / VK.
  - `modules/anti-fraud`: Скоринг, расчет ER, детекция ботов.
  - `modules/ledger`: Двойная запись, балансы, финансовые инварианты.
  - `modules/payouts`: Интеграция со шлюзом СБП и ФНС.
- Межмодульное взаимодействие строго через типизированные интерфейсы (Services/Facades) и события (In-process Event Bus / Redis Streams).

---

## Связанные документы
- [[08 - ARCHITECTURE/Backend Architecture|Архитектура бэкенда]]
- [[08 - ARCHITECTURE/Frontend Architecture|Архитектура фронтенда]]
- [[08 - ARCHITECTURE/Database Architecture|Архитектура базы данных]]
- [[08 - ARCHITECTURE/Deployment Architecture|Архитектура развертывания]]
