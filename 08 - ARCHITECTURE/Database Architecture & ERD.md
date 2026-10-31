---
title: Архитектура базы данных и ERD (Database Architecture & ERD)
type: architecture
status: active
priority: critical
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - database
  - erd
  - postgresql
---

# 🗄️ Архитектура базы данных и ER-диаграмма (PostgreSQL)

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ CAMPAIGNS : "creates (as advertiser)"
    USERS ||--o{ SUBMISSIONS : "submits (as clipper)"
    USERS ||--o1 WALLETS : "owns"
    
    CAMPAIGNS ||--o{ SUBMISSIONS : "receives"
    CAMPAIGNS ||--o{ CAMPAIGN_POOLS : "funded_by"
    
    SUBMISSIONS ||--o{ SUBMISSION_METRICS_LOG : "has_snapshots"
    SUBMISSIONS ||--o{ DISPUTES : "can_have"
    
    WALLETS ||--o{ LEDGER_ENTRIES : "contains_records"
    WALLETS ||--o{ PAYOUT_REQUESTS : "initiates"

    USERS {
        uuid id PK
        string role "CLIPPER | ADVERTISER | ADMIN"
        string email
        bigint telegram_id
        string username
        string full_name
        string inn_self_employed
        string verification_code "e.g. #clip_7781"
        int trust_score "default 100"
        timestamp created_at
    }

    CAMPAIGNS {
        uuid id PK
        uuid advertiser_id FK
        string title
        text description
        string category
        string source_materials_url
        string target_url
        string status "DRAFT | ACTIVE | CLOSING_SOON | COMPLETED | REFUNDED"
        bigint gross_budget_cents
        bigint net_bounty_pool_cents
        int cpm_cents
        int max_payout_per_video_cents
        string erid_token
        timestamp starts_at
        timestamp ends_at
    }

    SUBMISSIONS {
        uuid id PK
        uuid campaign_id FK
        uuid clipper_id FK
        string platform "YOUTUBE_SHORTS | VK_CLIPS | TIKTOK"
        string video_url
        string video_id
        string status "SUBMITTED | TRACKING | ON_HOLD | APPROVED | REJECTED"
        bigint initial_views
        bigint final_views
        bigint paid_views
        bigint pending_reward_cents
        int risk_score "0 to 100"
        timestamp hold_until
        timestamp submitted_at
    }

    SUBMISSION_METRICS_LOG {
        uuid id PK
        uuid submission_id FK
        bigint view_count
        bigint like_count
        bigint comment_count
        timestamp fetched_at
    }

    LEDGER_ENTRIES {
        uuid id PK
        uuid transaction_id
        string account_id
        string account_type
        bigint amount_cents
        string direction "DEBIT | CREDIT"
        string reference_type
        uuid reference_id
        timestamp created_at
    }

    PAYOUT_REQUESTS {
        uuid id PK
        uuid user_id FK
        bigint amount_cents
        string sbp_phone
        string sbp_bank_id
        string status "PENDING | PROCESSING | SUCCESS | FAILED"
        string fns_receipt_url
        timestamp created_at
    }
```

---

## 2. Индексная стратегия PostgreSQL

1. **Защита от дубликатов сабмитов:**
   ```sql
   CREATE UNIQUE INDEX idx_unique_active_video ON submissions (video_url) 
   WHERE status NOT IN ('REJECTED', 'FRAUD_BLOCKED');
   ```
2. **Оптимизация выборки активных задач воркером мониторинга:**
   ```sql
   CREATE INDEX idx_tracking_submissions ON submissions (status, hold_until) 
   WHERE status = 'TRACKING';
   ```
3. **Быстрый расчет баланса в Ledger:**
   ```sql
   CREATE INDEX idx_ledger_account_balance ON ledger_entries (account_id, direction, amount_cents);
   ```

Связанные документы:
- [[04 - FINANCE/Wallet & Double-Entry Ledger System|Ledger архитектура]]
- [[08 - ARCHITECTURE/Backend Architecture & Tech Stack Selection|Бэкенд архитектура]]
- [[08 - ARCHITECTURE/Queue Architecture & Background Workers|Воркеры и очереди]]
