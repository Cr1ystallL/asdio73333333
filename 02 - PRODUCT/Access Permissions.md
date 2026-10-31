---
title: "Права Доступа в Системе (Access Permissions)"
type: product
status: approved
priority: high
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - product
  - permissions
  - security
---

# Права Доступа в Системе (Access Permissions)

Документ формализует гранулярные права доступа (Permissions) и правила разграничения между ролями.

---

## 1. Реестр системных разрешений

```typescript
export enum Permission {
  // Кампании
  CAMPAIGN_VIEW = 'campaign:view',
  CAMPAIGN_CREATE = 'campaign:create',
  CAMPAIGN_EDIT = 'campaign:edit',
  CAMPAIGN_FUND = 'campaign:fund',
  CAMPAIGN_TERMINATE = 'campaign:terminate',

  // Ролики
  SUBMISSION_CREATE = 'submission:create',
  SUBMISSION_VIEW_OWN = 'submission:view_own',
  SUBMISSION_VIEW_ALL = 'submission:view_all',
  SUBMISSION_MODERATE = 'submission:moderate',

  // Финансы
  BALANCE_VIEW_OWN = 'balance:view_own',
  PAYOUT_REQUEST = 'payout:request',
  LEDGER_VIEW_GLOBAL = 'ledger:view_global',
  PAYOUT_MANUAL_APPROVE = 'payout:manual_approve',

  // Управление
  USER_BAN = 'user:ban',
  SYSTEM_CONFIG_EDIT = 'system_config:edit',
}
```

---

## 2. Безопасность контекста данных (Multi-Tenancy & Data Scoping)
- Рекламодатель имеет доступ `CAMPAIGN_EDIT` строго для записей, где `advertiser_id === current_user.id`.
- Клиппер имеет доступ к просмотру начислений строго для своих записей `clipper_id === current_user.id`.
- Попытка доступа к чужим идентификаторам блокируется на уровне контроллеров и возвращает `403 Forbidden`.

---

## Связанные документы
- [[02 - PRODUCT/User Roles|Пользовательские роли]]
- [[08 - ARCHITECTURE/Authorization (RBAC)|Авторизация RBAC]]
- [[08 - ARCHITECTURE/Security Architecture|Архитектура безопасности]]
