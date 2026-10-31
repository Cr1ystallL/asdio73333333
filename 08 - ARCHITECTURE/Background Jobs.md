---
title: "Фоновые Периодические Задачи и Кроны (Background Jobs)"
type: architecture
status: approved
priority: high
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - architecture
  - cron
  - background-jobs
  - scheduled-tasks
---

# Фоновые Периодические Задачи и Кроны (Background Jobs)

Документ регламентирует расписание и назначение регулярных фоновых процессов платформы Konveer.

---

## 1. Реестр Cron-задач платформы

| Задача (Job Name) | Расписание (Cron) | Назначение и логика |
| :--- | :--- | :--- |
| **`sync-active-videos`** | `*/15 * * * *` (каждые 15 мин) | Опрос роликов, опубликованных менее 72 часов назад, пакетными вызовами YouTube/VK API. |
| **`sync-cooling-videos`** | `0 */4 * * *` (каждые 4 часа) | Опрос роликов старше 72 часов (затухающий хвост просмотров). |
| **`release-payout-holds`** | `0 * * * *` (каждый час) | Поиск начислений `PENDING`, у которых `hold_expires_at <= NOW()` и `risk_score >= 75`, с автоматическим переводом средств в `AVAILABLE`. |
| **`campaign-budget-watchdog`**| `*/5 * * * *` (каждые 5 мин) | Проверка остатков бюджетов кампаний. Перевод в `CLOSING_SOON` при остатке $\le 15\%$ и в `COMPLETED` при 0%. |
| **`nightly-ledger-reconciliation`**| `0 3 * * *` (еженощно в 03:00) | Автоматическая сверка проводок Ledger с банковскими выписками Т-Банка. |
| **`clean-expired-temp-uploads`**| `0 4 * * *` (еженощно в 04:00) | Удаление брошенных временных файлов из S3. |

---

## Связанные документы
- [[08 - ARCHITECTURE/Queue Architecture|Архитектура очередей BullMQ]]
- [[04 - FINANCE/Ledger Architecture|Архитектура Ledger]]
- [[04 - FINANCE/Campaign Budget|Управление бюджетом кампании]]
