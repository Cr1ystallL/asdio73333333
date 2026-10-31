---
title: "Архитектура Логирования и Аудита (Logging Architecture)"
type: architecture
status: approved
priority: high
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - architecture
  - logging
  - audit
  - opentelemetry
  - pino
---

# Архитектура Логирования и Аудита (Logging Architecture)

Документ описывает структуру структурированных логов, трейсинга и журнала аудита действий пользователей платформы Konveer.

---

## 1. Стандарт структурированного логирования (JSON Logs)

Все сервисы бэкенда используют логгер **Pino** со структурированным JSON-выводом в `stdout`:
```json
{
  "level": 30,
  "time": 1798729200000,
  "pid": 12450,
  "hostname": "backend-prod-01",
  "reqId": "req_8f1a9b2c",
  "userId": "usr_9981",
  "role": "CLIPPER",
  "module": "tracking",
  "action": "SYNC_VIDEO_VIEWS",
  "videoId": "yt_dQw4w9WgXcQ",
  "viewsDelta": 1250,
  "msg": "Successfully synced YouTube Shorts views"
}
```

---

## 2. Неизменяемый журнал аудита действий (Audit Log)

Все критические действия (вход в аккаунт, изменение параметров кампании, отклонение роликов модератором, ручная корректировка балансов) фиксируются в специальной таблице базы данных `audit_logs`:
- `id`: UUID.
- `actor_id`: ID пользователя или администратора.
- `action`: Код действия (`MODERATOR_APPROVE_VIDEO`, `CAMPAIGN_UPDATE_CPM`, `PAYOUT_FREEZE`).
- `entity_type` и `entity_id`: Сущность, над которой совершено действие.
- `before_state` и `after_state`: JSONB-снапшоты состояния сущности до и после изменения.
- `ip_address` и `user_agent`.

Запрещено удаление или модификация записей из `audit_logs` (права на `UPDATE/DELETE` отозваны на уровне PostgreSQL).

---

## Связанные документы
- [[08 - ARCHITECTURE/Monitoring & Alerting|Мониторинг и алертинг]]
- [[08 - ARCHITECTURE/Security Architecture|Архитектура безопасности]]
- [[02 - PRODUCT/Admin Panel Specification|Спецификация админ-панели (Аудит)]]
