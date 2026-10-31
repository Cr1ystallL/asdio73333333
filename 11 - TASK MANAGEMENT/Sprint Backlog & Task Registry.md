---
title: Реестр задач и Бэклог (Sprint Backlog & Task Registry)
type: task-management
status: active
priority: critical
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - tasks
  - backlog
  - registry
---

# 📌 Реестр задач и Спринт-бэклог (Task Registry)

Ниже представлен детализированный реестр проектных задач для запуска Konveer от текущего момента до релиза MVP.

---

## 1. Сводный реестр задач (Master Task Table)

| ID | Название задачи | Поток | Приоритет | Статус | Зависимости | Ответственная роль |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **TSK-001** | Формирование Obsidian Knowledge Base | 1.0 Product | `🔴 Critical` | `Done` | — | Product Architect |
| **TSK-002** | Проведение 10 интервью с рекламодателями | 6.0 Marketing | `🔴 Critical` | `Planned` | TSK-001 | Head of Growth |
| **TSK-003** | Проведение 20 интервью с клипперами | 6.0 Marketing | `🟠 High` | `Planned` | TSK-001 | Community Lead |
| **TSK-004** | Запуск ручной пилотной кампании (Stage 1) | 6.0 Marketing | `🔴 Critical` | `Planned` | TSK-002, TSK-003 | Founder |
| **TSK-005** | Подготовка юридического заключения (347-ФЗ, НПД) | 5.0 Legal | `🔴 Critical` | `Planned` | TSK-001 | Legal Counsel |
| **TSK-006** | Отрисовка Figma UI Kit и компонентов TMA | 1.0 UX/UI | `🟠 High` | `Planned` | TSK-001 | Senior Product Designer |
| **TSK-007** | Отрисовка десктопного портала рекламодателя | 1.0 UX/UI | `🟠 High` | `Planned` | TSK-006 | Senior Product Designer |
| **TSK-008** | Финализация OpenAPI/Swagger контрактов | 2.0 Tech | `🟠 High` | `Planned` | TSK-006, TSK-007 | Lead Backend Dev |
| **TSK-009** | Инициализация репозитория и NestJS модулей | 2.0 Tech | `🔴 Critical` | `Planned` | TSK-008 | Lead Backend Dev |
| **TSK-010** | Проектирование миграций Prisma (PostgreSQL ERD) | 2.0 Tech | `🔴 Critical` | `Planned` | TSK-009 | Backend Dev |
| **TSK-011** | Реализация авторизации через Telegram `initData` | 2.0 Tech | `🔴 Critical` | `Planned` | TSK-010 | Backend Dev |
| **TSK-012** | Разработка ядра Double-Entry Ledger (Kysely) | 3.0 Fintech | `🔴 Critical` | `Planned` | TSK-010 | FinTech Architect |
| **TSK-013** | Unit-тестирование инвариантов Ledger (100% coverage) | 3.0 Fintech | `🔴 Critical` | `Planned` | TSK-012 | QA Automation |
| **TSK-014** | Интеграция с YouTube Data API v3 (Batching 50 ID) | 2.0 Tech | `🔴 Critical` | `Planned` | TSK-009 | Backend Dev |
| **TSK-015** | Интеграция с VK API (`video.get`) | 2.0 Tech | `🟠 High` | `Planned` | TSK-009 | Backend Dev |
| **TSK-016** | Настройка очередей BullMQ для фонового трекинга | 2.0 Tech | `🔴 Critical` | `Planned` | TSK-014, TSK-015 | Backend Dev |
| **TSK-017** | Реализация 5-факторного алгоритма Risk Score | 4.0 AntiFraud | `🔴 Critical` | `Planned` | TSK-016 | Data/Security Eng |
| **TSK-018** | Фронтенд Telegram Mini App (Next.js 15) | 2.0 Tech | `🔴 Critical` | `Planned` | TSK-006, TSK-011 | Lead Frontend Dev |
| **TSK-019** | Фронтенд кабинета рекламодателя (Web Portal) | 2.0 Tech | `🟠 High` | `Planned` | TSK-007, TSK-009 | Frontend Dev |
| **TSK-020** | Фронтенд панели модератора и очереди апелляций | 4.0 AntiFraud | `🟠 High` | `Planned` | TSK-017 | Frontend Dev |
| **TSK-021** | Интеграция платежного шлюза ЮKassa (Pay-In) | 3.0 Fintech | `🔴 Critical` | `Planned` | TSK-012 | Backend Dev |
| **TSK-022** | Интеграция СБП выплат самозанятым (Т-Бизнес API) | 3.0 Fintech | `🔴 Critical` | `Planned` | TSK-012, TSK-021 | Backend Dev |
| **TSK-023** | Развертывание Staging в Selectel (Docker/Compose) | 2.0 Tech | `🟠 High` | `Planned` | TSK-018, TSK-019 | DevOps Engineer |
| **TSK-024** | E2E тестирование сквозного сценария кампании | 1.0 Product | `🔴 Critical` | `Planned` | TSK-023 | QA Lead |
| **TSK-025** | Запуск закрытого бета-теста на 300 клипперах | 6.0 Marketing | `🔴 Critical` | `Planned` | TSK-024 | Head of Growth |

---

## 2. Спринт 0 (Текущие чек-листы)

- [x] Спроектировать полную бизнес-модель, юнит-экономику и P&L.
- [x] Разработать детальный PRD и спецификации трех интерфейсов.
- [x] Сформировать дизайн-систему, архитектуру токенов и экраны TMA.
- [x] Разработать математику финансового Ledger двойной бухгалтерской записи.
- [x] Проанализировать официальные ограничения YouTube Data API, VK API, TikTok и Instagram.
- [x] Создать 5-факторную модель антифрода и правила 72-часового холда.
- [x] Согласовать правовую модель агентского договора, ЕРИР/ОРД (347-ФЗ) и налога НПД (422-ФЗ).
- [x] Спроектировать системную архитектуру (C4), ERD базу данных и очереди BullMQ.
- [x] Сформировать стратегию решения проблемы курицы и яйца и GTM-план.
- [x] Составить полный реестр рисков с триггерами и планами реагирования.

Связанные документы:
- [[11 - TASK MANAGEMENT/Task Management System & WBS|Методология WBS]]
- [[10 - ROADMAP/Master Roadmap & Phased Execution|Мастер-роадмап]]
- [[12 - RISK REGISTER/Risk Register & Mitigation Matrix|Реестр рисков]]
