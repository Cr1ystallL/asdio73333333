---
title: Финансовая безопасность и инварианты (Financial Security & Invariants)
type: finance
status: active
priority: critical
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - security
  - fintech
  - invariants
---

# 🔒 Финансовая безопасность и системные инварианты

## 1. Фундаментальные математические инварианты системы

В системе действуют 4 обязательных финансовых инварианта. Нарушение любого из них вызывает немедленный `ASSERTION_FAILURE`, остановку выплат и отправку алерта в Telegram службе безопасности.

### Инвариант 1: Сохранение баланса Ledger (Zero-Sum Invariant)
В любой транзакции сумма всех дебетовых проводок обязана до копейки равняться сумме всех кредитовых проводок:
$$\sum_{j=1}^{M} \text{Debit}_j - \sum_{j=1}^{M} \text{Credit}_j = 0$$

### Инвариант 2: Запрет отрицательного баланса (Non-Negative Balances)
Для любого пассивного счета клиппера или эскроу-пула кампании в любой момент времени баланс обязан быть неотрицательным:
$$\forall \text{account} \in \{\text{CLIPPER\_AVAILABLE}, \; \text{CAMPAIGN\_ESCROW}, \; \text{ADV\_DEPOSITS}\}: \quad \text{Balance}(\text{account}) \ge 0$$
*(В базе данных обеспечивается ограничением на уровне БД: `CHECK (balance_cents >= 0)`).*

### Инвариант 3: Платежеспособность платформы (Solvency Invariant)
Фактический остаток на расчетных счетах компании в банках обязан полностью покрывать все внешние обязательства перед пользователями:
$$\text{Cash}_{\text{bank}} \ge \sum \text{Balance}(\text{ADV\_DEPOSITS}) + \sum \text{Balance}(\text{CAMPAIGN\_ESCROW}) + \sum \text{Balance}(\text{CLIPPER\_AVAILABLE}) + \sum \text{Balance}(\text{CLIPPER\_PENDING})$$

### Инвариант 4: Лимит пула кампании (Bounty Pool Cap)
Сумма всех фактически выплаченных средств клипперам по кампании $k$ плюс текущие средства в холде никогда не могут превысить первоначальный чистый пул:
$$\sum \text{Paid}_{k} + \sum \text{Pending}_{k} \le P_{\text{pool}, k}$$

---

## 2. Защита от состояний гонки (Race Conditions & Double-Spend)

* **Проблема:** Клиппер быстро отправляет два одновременных запроса на вывод средств (`/api/cashout`) по 3 000 ₽ при общем балансе 3 000 ₽. В плохой системе оба запроса считывают баланс `3000` и отправляют 6 000 ₽.
* **Решение:**
  1. **Транзакции уровня `SERIALIZABLE`:** В PostgreSQL транзакция вывода выполняется с уровнем изоляции `SERIALIZABLE`.
  2. **Пессимистическая блокировка:** `SELECT balance_cents FROM user_wallets WHERE user_id = $1 FOR UPDATE`. Второй запрос блокируется до завершения первого и видит баланс `0`.
  3. **Idempotency Key (Ключ идемпотентности):** Каждый запрос на вывод содержит уникальный UUID, генерируемый клиентом. Повторный запрос с тем же ключом не создает новую транзакцию, а возвращает статус предыдущей.

Связанные документы:
- [[04 - FINANCE/Wallet & Double-Entry Ledger System|Ledger архитектура]]
- [[04 - FINANCE/Financial Edge Cases & Scenarios|Краевые финансовые случаи]]
- [[08 - ARCHITECTURE/Database Architecture & ERD|Схема базы данных]]
