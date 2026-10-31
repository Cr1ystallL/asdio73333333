---
title: Роли, права доступа и системные состояния (RBAC & State Machines)
type: product
status: active
priority: high
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - rbac
  - state-machine
---

# 🔐 Роли, права доступа и системные состояния

## 1. Ролевая модель доступа (Role-Based Access Control — RBAC)

Система определяет 4 основные пользовательские роли:
1. `GUEST` — Неавторизованный посетитель (просмотр лендинга и публичной витрины).
2. `CLIPPER` — Создатель контента (доступ только к Telegram Mini App, сабмитам и балансу).
3. `ADVERTISER` — Заказчик кампаний (доступ к веб-кабинету, созданию кампаний, биллингу и аналитике).
4. `MODERATOR` — Операционный сотрудник (проверка сабмитов с высоким Risk Score, разбор жалоб).
5. `ADMIN` — Полный доступ к финансовому Ledger, управлению комиссиями, блокировкам и системным настройкам.

---

## 2. Конечный автомат состояний кампании (Campaign State Machine)

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Создание рекламодателем
    DRAFT --> PENDING_PAYMENT: Нажатие "Оплатить"
    PENDING_PAYMENT --> ACTIVE: Успешный платеж (Escrow locked)
    PENDING_PAYMENT --> CANCELLED: Таймаут оплаты / Отмена
    
    ACTIVE --> CLOSING_SOON: Остаток бюджета < 15% (Сабмиты закрыты)
    CLOSING_SOON --> COMPLETED: Завершен холд всех роликов
    
    ACTIVE --> PAUSED: Ручная пауза заказчиком
    PAUSED --> ACTIVE: Возобновление
    
    ACTIVE --> REFUNDED: Досрочный возврат остатка
    CLOSING_SOON --> REFUNDED: Возврат неизрасходованных средств
    
    COMPLETED --> [*]
    REFUNDED --> [*]
```

### Описание состояний кампании:
* `DRAFT` — Черновик, редактируется заказчиком, не виден клипперам.
* `PENDING_PAYMENT` — Ожидание подтверждения транзакции от платежного шлюза.
* `ACTIVE` — Кампания открыта в каталоге, клипперы могут брать материалы и сдавать ссылки.
* `CLOSING_SOON` — Новые сабмиты заблокированы, воркеры докручивают просмотры уже принятых роликов.
* `PAUSED` — Временная приостановка приема ссылок заказчиком.
* `COMPLETED` — Все ролики отлежались, бюджет распределен, отчет сформирован.
* `REFUNDED` — Кампания закрыта, остаток средств возвращен на баланс заказчика.

---

## 3. Конечный автомат состояний публикации / ролика (Submission State Machine)

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED: Клиппер отправил URL
    SUBMITTED --> REJECTED_AUTO: Неверный формат / Чужой код
    SUBMITTED --> TRACKING: Initial snapshot зафиксирован
    
    TRACKING --> ON_HOLD: Достигнуто 72 часа от публикации
    TRACKING --> REJECTED_MANUAL: Мотивированный отказ рекламодателя
    TRACKING --> REMOVED: Видео удалено / Приватно
    
    ON_HOLD --> APPROVED: Проверка антифродом пройдена (Risk < 50)
    ON_HOLD --> MANUAL_REVIEW: Подозрение на накрутку (Risk >= 50)
    
    MANUAL_REVIEW --> APPROVED: Модератор подтвердил чистоту
    MANUAL_REVIEW --> FRAUD_BLOCKED: Подтверждена накрутка (Страйк)
    
    APPROVED --> PAID: Средства переведены в статус Available
    PAID --> [*]
```

Связанные документы:
- [[02 - PRODUCT/PRD — Product Requirements Document|PRD]]
- [[04 - FINANCE/Campaign Budget Lifecycle|Жизненный цикл бюджета]]
- [[06 - ANTI FRAUD/Fraud Detection Model & Risk Scoring|Модель антифрода]]
