---
title: "Диаграмма Сущностей и Связей Базы Данных (Database ERD)"
type: architecture
status: approved
priority: critical
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - architecture
  - database
  - erd
  - mermaid
  - schemas
---

# Диаграмма Сущностей и Связей Базы Данных (Database ERD)

Документ содержит полную Mermaid Entity-Relationship диаграмму реляционной модели данных платформы Konveer.

---

## 1. Схема сущностей (Mermaid ERD)

```mermaid
erDiagram
    USERS ||--o{ SOCIAL_ACCOUNTS : owns
    USERS ||--o{ CAMPAIGNS : creates_as_adv
    USERS ||--o{ SUBMISSIONS : submits_as_clipper
    USERS ||--o{ PAYOUT_REQUESTS : requests
    USERS ||--o{ LEDGER_ENTRIES : has_entries

    CAMPAIGNS ||--o{ SUBMISSIONS : contains
    CAMPAIGNS ||--o{ CAMPAIGN_ASSETS : includes
    CAMPAIGNS ||--o{ LEDGER_ENTRIES : has_escrow_entries

    SUBMISSIONS ||--o{ VIEW_SNAPSHOTS : tracks
    SUBMISSIONS ||--o{ MODERATION_REVIEWS : reviewed_by

    LEDGER_TRANSACTIONS ||--|{ LEDGER_ENTRIES : composes

    USERS {
        uuid id PK
        string role "ADVERTISER | CLIPPER | ADMIN"
        bigint telegram_id UK
        string email UK
        string phone UK
        string tax_id "ИНН"
        string npd_status "ACTIVE | INACTIVE"
        int reputation_score
        timestamp created_at
    }

    CAMPAIGNS {
        uuid id PK
        uuid advertiser_id FK
        string title
        text description
        string status "DRAFT | ACTIVE | CLOSING | FINISHED"
        bigint budget_total_cents
        bigint budget_remaining_cents
        int cpm_rate_cents "Ставка за 1к просмотров"
        bigint per_video_cap_cents "Лимит на 1 ролик"
        string erid "Маркировка ОРД"
        timestamp starts_at
        timestamp ends_at
    }

    SUBMISSIONS {
        uuid id PK
        uuid campaign_id FK
        uuid clipper_id FK
        string platform "YOUTUBE | VK | TIKTOK"
        string video_url UK
        string external_video_id
        string status "PENDING | APPROVED | REJECTED | FROZEN"
        bigint last_view_count
        bigint payable_view_count
        bigint earned_cents
        float risk_score
        timestamp hold_expires_at
        timestamp created_at
    }

    VIEW_SNAPSHOTS {
        uuid id PK
        uuid submission_id FK
        bigint view_count
        int like_count
        int comment_count
        timestamp recorded_at
    }

    LEDGER_TRANSACTIONS {
        uuid id PK
        string reference_type
        uuid reference_id
        string idempotency_key UK
        string status
        timestamp created_at
    }

    LEDGER_ENTRIES {
        uuid id PK
        uuid transaction_id FK
        string account_code
        uuid user_id FK
        uuid campaign_id FK
        bigint amount_cents
        string entry_type "DEBIT | CREDIT"
        timestamp created_at
    }

    PAYOUT_REQUESTS {
        uuid id PK
        uuid user_id FK
        bigint amount_cents
        string payout_method "SBP"
        string phone_number
        string sbp_bank_id
        string fns_receipt_url
        string status "PENDING | SUCCESS | REJECTED"
        timestamp created_at
    }
```

---

## Связанные документы
- [[08 - ARCHITECTURE/Database Architecture|Архитектура базы данных]]
- [[04 - FINANCE/Ledger Architecture|Архитектура Ledger]]
- [[02 - PRODUCT/Roles, Permissions & System States|Системные роли и состояния]]
