---
title: "Архитектура Файлового Хранилища (File Storage S3)"
type: architecture
status: approved
priority: high
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - architecture
  - storage
  - s3
  - cdn
  - presigned-urls
---

# Архитектура Файлового Хранилища (File Storage S3)

Документ регламентирует принципы хранения, загрузки и раздачи медиаконтента платформы Konveer.

---

## 1. Прямая загрузка через Pre-signed URLs (Direct Upload)

Для предотвращения перегрузки бэкенда терабайтами тяжелого видео исходников (стримов 1080p/4K) загрузка осуществляется напрямую в S3:

```mermaid
sequenceDiagram
    autonumber
    actor Adv as Рекламодатель
    participant API as Backend API
    participant S3 as Selectel S3 Storage
    actor Clip as Клиппер

    Adv->>API: POST /api/v1/storage/upload-intent { fileName: "stream.mp4", sizeBytes: ... }
    API->>API: Проверка прав и размера файла (< 20 ГБ)
    API->>S3: Генерация S3 Pre-signed PUT URL (срок жизни 60 мин)
    API-->>Adv: { uploadUrl: "https://s3.selectel.ru/..." }
    Adv->>S3: Прямая бинарная загрузка файла (Direct PUT / Multipart)
    Adv->>API: POST /api/v1/storage/upload-complete { fileKey: "..." }
    API->>S3: Проверка наличия объекта (HeadObject)
    
    Note over API,Clip: Раздача клипперам для монтажа
    Clip->>API: GET /api/v1/campaigns/:id/assets/:assetId/download
    API->>S3: Генерация S3 Pre-signed GET URL (срок жизни 2 часа)
    API-->>Clip: Redirect на защищенный CDN-URL
```

---

## 2. Структура бакетов и политики жизненного цикла (Lifecycle Policies)
- `konveer-campaign-raw`: Приватный бакет исходников. Правило жизненного цикла: автоматическое удаление тяжелых исходников через 30 дней после финализации кампании для оптимизации расходов на хранение.
- `konveer-public-assets`: Публичный бакет для логотипов кампаний, аватаров и статических изображений (раздача через кэширующий CDN).
- `konveer-legal-archives`: Архивы чеков ФНС, договоров и актов (холодное хранение, бессрочно).

---

## Связанные документы
- [[05 - INTEGRATIONS/S3 Storage Providers|Провайдеры S3]]
- [[02 - PRODUCT/Advertiser Cabinet Specification|Кабинет рекламодателя]]
