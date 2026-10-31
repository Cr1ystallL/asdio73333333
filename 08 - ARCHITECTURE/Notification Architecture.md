---
title: "Архитектура Системы Уведомлений (Notification Architecture)"
type: architecture
status: approved
priority: high
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - architecture
  - notifications
  - telegram-push
  - email
  - websocket
---

# Архитектура Системы Уведомлений (Notification Architecture)

Документ описывает матрицу доставки, шаблоны и каналы коммуникации с пользователями платформы Konveer.

---

## 1. Каналы доставки по сегментам аудитории

- **Клипперы**: **Telegram Bot Push** (основной канал, открываемость 95%+) + In-App уведомления в шторке Mini App.
- **Рекламодатели**: **Email** (счета, акты, закрытие кампаний) + **Telegram-бот** (оперативные алерты о всплесках просмотров) + In-App колокольчик на веб-портале.
- **Администраторы / СБ**: Защищенный **Telegram-канал службы безопасности** + PagerDuty / Sentry алерты.

---

## 2. Матрица триггерных уведомлений

```mermaid
flowchart TD
    Event[Бизнес-событие] --> Router{Тип события}
    Router -->|Новый ролик одобрен| T1[Клиппер: Telegram "Ролик принят в кампанию!"]
    Router -->|10 000 просмотров набрано| T2[Клиппер: Telegram "Ваш ролик набрал 10k!"]
    Router -->|Холд 72ч завершен| T3[Клиппер: Telegram "800 ₽ переведены на баланс вывода"]
    Router -->|Остаток бюджета 15%| T4[Рекламодатель: Email + Telegram "Кампания почти завершена!"]
    Router -->|Финансовое расхождение| T5[Безопасность: Telegram Alert "CRITICAL LEDGER MISMATCH"]
```

---

## Связанные документы
- [[05 - INTEGRATIONS/Telegram Bot API|Интеграция с Telegram Bot API]]
- [[05 - INTEGRATIONS/Email Services|Интеграция с Email]]
- [[08 - ARCHITECTURE/Queue Architecture|Очереди уведомлений]]
