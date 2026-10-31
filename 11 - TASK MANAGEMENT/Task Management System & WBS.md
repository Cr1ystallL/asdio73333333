---
title: Система управления задачами и WBS (Task Management & WBS)
type: task-management
status: active
priority: critical
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - tasks
  - wbs
  - management
---

# 📋 Система управления задачами и Work Breakdown Structure (WBS)

## 1. Архитектура Work Breakdown Structure (WBS)

Проект декомпозирован на 6 сквозных операционных потоков (Workstreams):

```mermaid
graph TD
    Project["Konveer Launch"]
    
    W1["1.0 PRODUCT & UX<br/>- PRD & User Stories<br/>- Figma UI Kit & Prototypes<br/>- Copywriting & Guidelines"]
    W2["2.0 ENGINEERING (TECH)<br/>- NestJS Monolith & PostgreSQL<br/>- Next.js TMA & Web Portal<br/>- YouTube/VK Trackers & BullMQ"]
    W3["3.0 FINTECH & LEDGER<br/>- Double-Entry Engine<br/>- Эквайринг ЮKassa<br/>- Выплаты СБП (Т-Банк / ФНС)"]
    W4["4.0 ANTI-FRAUD & OPS<br/>- Risk Scoring 5-Factor Model<br/>- Панель модератора<br/>- Система апелляций"]
    W5["5.0 LEGAL & COMPLIANCE<br/>- Регистрация ООО УСН 6%<br/>- Оферта и соглашения<br/>- Интеграция с ОРД (347-ФЗ)"]
    W6["6.0 MARKETING & GROWTH<br/>- Консьерж-кампании Stage 1<br/>- Community клипперов в TG<br/>- B2B воронка для стримеров/E-com"]

    Project --> W1
    Project --> W2
    Project --> W3
    Project --> W4
    Project --> W5
    Project --> W6
```

---

## 2. Модель статусов и жизненный цикл задачи

Каждая задача проходит строгий цикл смены состояний:

```mermaid
stateDiagram-v2
    [*] --> Backlog: Создание задачи
    Backlog --> Planned: Включение в спринт
    Planned --> In_Progress: Взята в разработку
    In_Progress --> Review: Код-ревью / Приемка
    Review --> Done: Критерии готовности выполнены
    
    In_Progress --> Blocked: Возник блокер
    Blocked --> In_Progress: Блокер устранен
    Done --> [*]
```

### Статусы:
* `Backlog` — Задача зафиксирована в бэклоге, ожидает планирования.
* `Planned` — Задача оценена и назначена на текущий рабочий цикл.
* `In Progress` — Находится в активной работе у ответственного.
* `Review` — Задача реализована, проходит тестирование, аудит безопасности или приемку Product Owner.
* `Blocked` — Работа остановлена из-за внешней зависимости (указывается `blocked_by: TSK-XXX`).
* `Done` — Все Acceptance Criteria выполнены, артефакт в проде или в базе знаний.

---

## 3. Модель приоритетов

| Приоритет | Метка | Регламент реакции | Описание |
| :--- | :---: | :---: | :--- |
| **Critical** | `🔴 Critical` | Немедленно | Блокирует запуск, несет финансовые риски (Ledger, антифрод, безопасность). |
| **High** | `🟠 High` | Текущий спринт | Ключевая функциональность MVP (TMA экраны, API парсеры). |
| **Medium** | `🟡 Medium` | По плану | Вспомогательные функции, улучшение интерфейса, второстепенные метрики. |
| **Low** | `🟢 Low` | При наличии ресурса | Косметические правки, оптимизации, расширенные анимации. |

Связанные документы:
- [[11 - TASK MANAGEMENT/Sprint Backlog & Task Registry|Реестр задач и Бэклог]]
- [[10 - ROADMAP/Master Roadmap & Phased Execution|Мастер-роадмап]]
