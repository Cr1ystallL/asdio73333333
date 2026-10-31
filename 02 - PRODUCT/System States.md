---
title: "Системные Состояния Сущностей (System States)"
type: product
status: approved
priority: high
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - product
  - state-machine
  - lifecycle
---

# Системные Состояния Сущностей (System States)

Документ описывает жизненные циклы ключевых доменных сущностей платформы Konveer.

---

## 1. Жизненный цикл Кампании (Campaign State Machine)

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Создание рекламодателем
    DRAFT --> MODERATION: Отправка на проверку
    MODERATION --> REJECTED: Нарушение 38-ФЗ
    MODERATION --> READY_FOR_FUNDING: Одобрена модератором
    READY_FOR_FUNDING --> ACTIVE: Оплата и резервирование Escrow
    ACTIVE --> CLOSING_SOON: Остаток бюджета <= 15%
    CLOSING_SOON --> EVALUATING: Бюджет исчерпан (100%)
    EVALUATING --> COMPLETED: 72ч холд завершен, остаток возвращен
    ACTIVE --> PAUSED: Приостановлена рекламодателем
    PAUSED --> ACTIVE: Возобновлена
    ACTIVE --> TERMINATED: Досрочно отменена
    TERMINATED --> COMPLETED: Финализация выплат
    COMPLETED --> [*]
```

---

## 2. Жизненный цикл Ролика (Submission State Machine)

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED: Клиппер отправил ссылку
    SUBMITTED --> VALIDATED: Проверка URL и API успешна
    SUBMITTED --> REJECTED_INVALID: Битый URL / чужой ролик
    VALIDATED --> TRACKING_ACTIVE: Первые замеры просмотров
    TRACKING_ACTIVE --> UNDER_INVESTIGATION: Подозрение на ботов (Risk Score < 75)
    UNDER_INVESTIGATION --> APPROVED: Ручное одобрение модератором
    UNDER_INVESTIGATION --> REJECTED_FRAUD: Подтвержденная накрутка
    TRACKING_ACTIVE --> SETTLED: 72ч холд истек, начисление выплачено
    SETTLED --> [*]
```

---

## Связанные документы
- [[04 - FINANCE/Financial States|Финансовые состояния]]
- [[02 - PRODUCT/Business Rules|Бизнес-правила]]
- [[06 - ANTI FRAUD/Risk Scoring|Скоринг рисков]]
