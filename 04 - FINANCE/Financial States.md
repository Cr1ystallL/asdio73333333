---
title: "Финансовые Состояния и Граф Переходов (Financial States)"
type: finance
status: approved
priority: high
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - finance
  - state-machine
  - transactions
---

# Финансовые Состояния и Граф Переходов (Financial States)

Документ формализует конечный автомат (State Machine) движения средств на платформе **Konveer**. Никакие деньги не могут перейти в статус без явного бизнес-события и валидированной записи в Ledger.

---

## 1. Стейт-машина транзакций и средств

```mermaid
stateDiagram-v2
    [*] --> DEPOSITED: Оплата рекламодателя подтверждена
    
    DEPOSITED --> ESCROW_LOCKED: Запуск рекламной кампании
    ESCROW_LOCKED --> DEPOSITED: Досрочная отмена (возврат остатка)
    
    ESCROW_LOCKED --> VIEWS_PENDING_HOLD: Видео набрало просмотры (API Sync)
    
    VIEWS_PENDING_HOLD --> AVAILABLE_FOR_WITHDRAWAL: Успешный 72ч антифрод-холд
    VIEWS_PENDING_HOLD --> DISPUTED_FRAUD_REVERSED: Срез накрутки / бан ролика
    DISPUTED_FRAUD_REVERSED --> ESCROW_LOCKED: Возврат в бюджет кампании
    
    AVAILABLE_FOR_WITHDRAWAL --> WITHDRAWAL_QUEUED: Запрос клиппера на вывод
    WITHDRAWAL_QUEUED --> WITHDRAWAL_IN_TRANSIT: Отправка в шлюз СБП
    
    WITHDRAWAL_IN_TRANSIT --> WITHDRAWN_SUCCESS: Подтверждение СБП + Чек ФНС
    WITHDRAWAL_IN_TRANSIT --> AVAILABLE_FOR_WITHDRAWAL: Ошибка банка (отклонен получателем)
    
    WITHDRAWN_SUCCESS --> [*]
```

---

## 2. Матрица состояний и разрешенные переходы

| Состояние | Описание | Счет в Ledger | Доступные действия |
| :--- | :--- | :--- | :--- |
| **`DEPOSITED`** | Средства зачислены на баланс рекламодателя | `2000:ADV_DEPOSIT_LIABILITY` | Запуск кампаний, возврат на расчетный счет |
| **`ESCROW_LOCKED`** | Бюджет заморожен под запущенную кампанию | `2100:CAMPAIGN_ESCROW_HOLD` | Начисление клипперам, остановка кампании |
| **`VIEWS_PENDING_HOLD`** | Награда клиппера за просмотры на 72ч холде | `2200:CLIPPER_PENDING_HOLD` | Антифрод-скоринг, апелляция, срез ботов |
| **`AVAILABLE_FOR_WITHDRAWAL`** | Средства доступны к выводу | `2300:CLIPPER_AVAILABLE_BALANCE` | Подача заявки на вывод через СБП |
| **`WITHDRAWAL_QUEUED`** | Заявка ожидает обработки шлюзом | `2400:WITHDRAWAL_PROCESSING_HOLD` | Валидация ИНН в ФНС |
| **`WITHDRAWAL_IN_TRANSIT`** | Пакет отправлен в банк по СБП | `2400:WITHDRAWAL_PROCESSING_HOLD` | Ожидание callback от шлюза |
| **`WITHDRAWN_SUCCESS`** | Деньги зачислены на счет клиппера | `1002:PAYMENT_GATEWAY_PAYOUT` | Скачивание чека ФНС |
| **`DISPUTED_FRAUD_REVERSED`**| Накрутка срезана, выплата аннулирована | `2100:CAMPAIGN_ESCROW_HOLD` | Возврат в бюджет рекламодателя |

---

## Связанные документы
- [[04 - FINANCE/Ledger Architecture|Архитектура Ledger]]
- [[04 - FINANCE/Transaction Lifecycle|Жизненный цикл транзакции]]
- [[06 - ANTI FRAUD/Payout Freezing|Заморозка начислений]]
