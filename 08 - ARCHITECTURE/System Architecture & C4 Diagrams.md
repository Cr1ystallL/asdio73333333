---
title: Системная архитектура и C4 диаграммы (System Architecture & C4)
type: architecture
status: active
priority: critical
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - architecture
  - c4-model
  - diagrams
---

# 🏗️ Системная архитектура и диаграммы C4 (System Architecture)

## 1. C4 Контекстная диаграмма (Context Diagram — Level 1)

```mermaid
C4Context
    title C4 Level 1: Контекст системы Konveer
    
    Person(clipper, "Клиппер", "Создатель коротких вертикальных видео (TMA)")
    Person(advertiser, "Рекламодатель", "Заказчик кампаний: блогер, стример, бренд (Web)")
    Person(admin, "Администратор / СБ", "Сотрудник платформы (модерация, антифрод)")

    System(clipper_system, "Konveer Platform", "Двусторонняя платформа эскроу-дистрибуции контента и учета просмотров")

    System_Ext(youtube, "YouTube Data API v3", "Официальный сбор статистики публичных Shorts")
    System_Ext(vk, "VK API", "Официальный сбор просмотров VK Клипов")
    System_Ext(tbank, "Т-Бизнес / СБП API", "Прием оплат и мгновенные выплаты самозанятым")
    System_Ext(ord, "ОРД API (ЕРИР)", "Регистрация креативов и маркировка рекламы")
    System_Ext(tg, "Telegram Bot API", "Авторизация пользователей и push-уведомления")
    System_Ext(s3, "Selectel S3 Storage", "Хранение исходников и медиа-файлов")

    Rel(clipper, clipper_system, "Просматривает офферы, сдает ролики, выводит деньги", "HTTPS / Telegram TMA")
    Rel(advertiser, clipper_system, "Создает кампании, вносит депозит, смотрит аналитику", "HTTPS / Web Portal")
    Rel(admin, clipper_system, "Разбирает споры, управляет антифродом и Ledger", "HTTPS / Admin Console")

    Rel(clipper_system, youtube, "Опрос просмотров и лайков", "REST HTTPS")
    Rel(clipper_system, vk, "Опрос статистики клипов", "REST HTTPS")
    Rel(clipper_system, tbank, "Платежи и проверка чеков ФНС", "REST HTTPS / Webhooks")
    Rel(clipper_system, ord, "Регистрация erid и передача актов", "REST HTTPS")
    Rel(clipper_system, tg, "Отправка сообщений и пушей", "Bot API HTTPS")
    Rel(clipper_system, s3, "Хранение медиа", "S3 API HTTPS")
```

---

## 2. C4 Диаграмма контейнеров (Container Diagram — Level 2)

```mermaid
C4Container
    title C4 Level 2: Контейнерная архитектура платформы
    
    Container(tma_client, "Telegram Mini App", "Next.js / React / Tailwind", "Мобильный интерфейс клиппера")
    Container(web_client, "Advertiser Web Portal", "Next.js 15 / Shadcn UI", "Десктопный кабинет заказчика")
    Container(admin_client, "Admin Console", "React / Vite / Tailwind", "Интерфейс модерации и антифрода")

    Container(api_gateway, "API Gateway / NGINX", "NGINX / Cloudflare", "SSL, Rate Limiting, роутинг запросов")
    Container(backend_app, "Modular Monolith Backend", "Node.js / NestJS / TypeScript", "Бизнес-логика, RBAC, Ledger, авторизация")
    
    Container(queue_engine, "Queue Engine", "BullMQ / Redis", "Управление фоновыми задачами мониторинга")
    Container(tracking_workers, "Tracking & Scraper Workers", "Node.js Workers", "Периодический опрос YouTube / VK / TikTok")
    Container(antifraud_service, "Anti-Fraud Engine", "In-Process Module", "Скоринг рисков, валидация ER и velocity")

    ContainerDb(db_postgres, "Primary Database", "PostgreSQL 16", "Хранение пользователей, кампаний, сабмитов и Ledger")
    ContainerDb(cache_redis, "Cache & In-Memory Store", "Redis 7", "Кэш сессий, идемпотентность, очереди задач")
    ContainerDb(object_storage, "S3 Media Store", "Selectel S3", "Исходники видео, превью, аватары")

    Rel(tma_client, api_gateway, "API-запросы", "JSON / HTTPS")
    Rel(web_client, api_gateway, "API-запросы", "JSON / HTTPS")
    Rel(admin_client, api_gateway, "API-запросы", "JSON / HTTPS")

    Rel(api_gateway, backend_app, "Reverse Proxy", "HTTP")
    Rel(backend_app, db_postgres, "Чтение / Запись", "Prisma / SQL (TCP)")
    Rel(backend_app, cache_redis, "Кэш и события", "RESP (TCP)")
    Rel(backend_app, queue_engine, "Постановка задач на проверку", "BullMQ")

    Rel(queue_engine, tracking_workers, "Распределение задач", "Redis Jobs")
    Rel(tracking_workers, db_postgres, "Обновление счетчиков и снапшотов", "SQL")
    Rel(tracking_workers, antifraud_service, "Передача метрик на анализ", "Internal Call")
    Rel(antifraud_service, backend_app, "Триггер начислений / алертов", "Events")
```

Связанные документы:
- [[08 - ARCHITECTURE/Backend Architecture & Tech Stack Selection|Выбор технологического стека]]
- [[08 - ARCHITECTURE/Database Architecture & ERD|Схема БД]]
- [[08 - ARCHITECTURE/Queue Architecture & Background Workers|Архитектура очередей]]
