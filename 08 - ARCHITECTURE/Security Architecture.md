---
title: "Архитектура Безопасности (Security Architecture)"
type: architecture
status: approved
priority: critical
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - architecture
  - security
  - owasp
  - encryption
  - protection
---

# Архитектура Безопасности (Security Architecture)

Документ описывает защитные меры против угроз информационной безопасности по стандарту OWASP Top-10.

---

## 1. Защита периметра и сетевой уровень

1. **DDoS-защита и WAF (Web Application Firewall)**:
   - Весь публичный трафик проходит через WAF (StormWall / Cloudflare) для фильтрации атак уровней L3/L4/L7.
   - Строгий Rate Limiting на уровне Nginx/Fastify: не более 60 запросов в минуту с одного IP для публичных эндпоинтов.
2. **Изоляция административного контура**:
   - Панель управления администратора (`/admin`) физически закрыта от внешнего интернета и доступна исключительно через корпоративный WireGuard VPN с авторизацией по сертификатам.

---

## 2. Защита на уровне приложения и данных

- **SQL Injection**: Исключена благодаря использованию параметризованных запросов через Prisma и Kysely. Сырые SQL-конкатенации строго запрещены на уровне линтера (ESLint rule).
- **XSS (Cross-Site Scripting)**: React автоматически экранирует весь выводимый контент. Использование `dangerouslySetInnerHTML` запрещено.
- **CSRF (Cross-Site Request Forgery)**: Для API используется заголовочная модель аутентификации `Authorization: Bearer <token>`, невосприимчивая к межсайтовой подделке запросов.
- **Шифрование конфиденциальных данных**: Поля с ИНН, номерами телефонов и банковскими счетами хранятся в БД в зашифрованном виде (AES-256).

---

## Связанные документы
- [[08 - ARCHITECTURE/Authentication|Аутентификация]]
- [[08 - ARCHITECTURE/Authorization (RBAC)|Авторизация]]
- [[04 - FINANCE/Financial Security|Финансовая безопасность]]
