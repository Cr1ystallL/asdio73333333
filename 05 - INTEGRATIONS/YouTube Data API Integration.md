---
title: Интеграция с YouTube Data API v3 (YouTube Data API Integration)
type: integration
status: active
priority: critical
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - youtube
  - api
  - tracking
---

# 📺 Интеграция с YouTube Data API v3

## 1. Технические характеристики интеграции

* **Протокол:** REST / JSON.
* **Базовый URL:** `https://www.googleapis.com/youtube/v3/videos`
* **Метод аутентификации:** Простой API Key (Google Cloud Console). **OAuth 2.0 не требуется** для публичных роликов.
* **Стоимость квоты:** 1 единица квоты за запрос метода `videos.list`.
* **Лимиты:** 10 000 единиц в сутки по умолчанию на проект.

---

## 2. Спецификация запроса и пакетная оптимизация (Batching)

Чтобы эффективно утилизировать суточную квоту, воркер группирует до **50 идентификаторов видео** в один HTTP-запрос:

```http
GET https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=VIDEO_ID_1,VIDEO_ID_2,...,VIDEO_ID_50&key=AIzaSy...
```

### Формат ответа:
```json
{
  "kind": "youtube#videoListResponse",
  "items": [
    {
      "id": "dQw4w9WgXcQ",
      "snippet": {
        "publishedAt": "2026-10-30T14:20:00Z",
        "title": "Лучший момент подкаста #44",
        "description": "Смотри полный выпуск по ссылке в коме! #clip_88421 #лебедев",
        "channelId": "UC...",
        "tags": ["лебедев", "дизайн", "шортс"]
      },
      "statistics": {
        "viewCount": "48210",
        "likeCount": "3210",
        "commentCount": "142"
      }
    }
  ]
}
```

---

## 3. Алгоритм валидации сабмита:
1. Извлечение `video_id` из URL регулярным выражением: `/(?:shorts\/|v=)([a-zA-Z0-9_-]{11})/`.
2. Запрос к `videos.list`:
   * Если `items` пустой $\rightarrow$ ролик удален или сделан приватным (`REJECTED_404`).
   * Проверка даты `snippet.publishedAt`: разница с текущим временем не более 24 часов.
   * Поиск персонального токена клиппера в `snippet.description` (например, `#clip_USERID`).
   * Сохранение стартовых просмотров $V_0 = \text{parseInt}(items[0].statistics.viewCount)$.

Связанные документы:
- [[05 - INTEGRATIONS/Social Media APIs Overview & Feasibility Matrix|Матрица API]]
- [[06 - ANTI FRAUD/Automated Verification Rules|Антифрод правила]]
