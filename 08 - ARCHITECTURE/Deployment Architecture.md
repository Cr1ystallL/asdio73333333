---
title: "Архитектура Развертывания и CI/CD (Deployment Architecture)"
type: architecture
status: approved
priority: high
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - architecture
  - deployment
  - docker
  - cicd
  - gitlab
  - selectel
---

# Архитектура Развертывания и CI/CD (Deployment Architecture)

Документ регламентирует инфраструктуру хостинга, контейнеризацию, конвейер непрерывной интеграции и доставки (CI/CD) платформы Konveer.

---

## 1. Инфраструктурный контур хостинга (Selectel VPC, РФ)

Все серверные мощности развертываются в защищенном облаке Selectel (Москва / Санкт-Петербург), соответствующем требованиям 152-ФЗ (УЗ-1):

```mermaid
flowchart TD
    Internet[Интернет / Telegram / Браузеры] --> WAF[WAF / DDoS Guard / HTTPS Reverse Proxy]
    
    subgraph VPC [Selectel Virtual Private Cloud]
        WAF --> LB[Балансировщик нагрузки HAProxy]
        
        subgraph AppCluster [Docker Swarm / Kubernetes Cluster]
            LB --> Web1[Next.js Web / TMA (Node 1)]
            LB --> Web2[Next.js Web / TMA (Node 2)]
            LB --> API1[NestJS API Backend (Node 1)]
            LB --> API2[NestJS API Backend (Node 2)]
            API1 --> Workers[BullMQ Background Workers]
            API2 --> Workers
        end
        
        subgraph DataCluster [Data Layer]
            API1 --> Redis[(Redis 7 Sentinel Cluster)]
            API2 --> Redis
            Workers --> Redis
            API1 --> DBPrimary[(PostgreSQL 16 Primary)]
            API2 --> DBPrimary
            Workers --> DBPrimary
            DBPrimary -.->|Streaming Replication| DBStandby[(PostgreSQL 16 Read Replica)]
        end
    end
    
    API1 -.-> S3[Selectel S3 Object Storage]
```

---

## 2. Конвейер CI/CD (GitHub Actions / GitLab CI)

1. **Этап Lint & Typecheck**: Проверка ESLint, Prettier, `tsc --noEmit`.
2. **Этап Тестирования**: Запуск Unit-тестов (Vitest) и интеграционных тестов финансового Ledger на тестовой базе PostgreSQL.
3. **Этап Сборки**: Сборка оптимизированных multi-stage Docker образов.
4. **Этап Развертывания (Zero-Downtime Rolling Update)**:
   - Автоматический запуск миграций БД (`prisma migrate deploy`).
   - Поочередный перезапуск контейнеров бэкенда без прерывания обслуживания пользователей (Rolling Update).

---

## Связанные документы
- [[08 - ARCHITECTURE/System Architecture|Общая системная архитектура]]
- [[08 - ARCHITECTURE/Scalability|Масштабируемость]]
- [[08 - ARCHITECTURE/Database Architecture|Архитектура базы данных]]
