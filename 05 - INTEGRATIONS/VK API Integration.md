---
title: Интеграция с VK API для VK Клипов (VK API Integration)
type: integration
status: active
priority: high
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - vk
  - api
  - tracking
---

# 🌐 Интеграция с VK API для VK Клипов

## 1. Технические характеристики интеграции

* **Протокол:** REST / JSON.
* **Базовый метод:** `video.get`
* **Аутентификация:** `Service Access Token` (Сервисный ключ доступа приложения ВКонтакте, создаваемого в кабинете разработчика VK ID).
* **Лимиты:** До 20 запросов в секунду (RPS) на сервисный ключ.

---

## 2. Спецификация запроса статистики видео/клипа

```http
POST https://api.vk.com/method/video.get
Content-Type: application/x-www-form-urlencoded

videos=-218491024_456239120&extended=1&v=5.199&access_token=VK_SERVICE_TOKEN
```

### Формат ответа VK API:
```json
{
  "response": {
    "count": 1,
    "items": [
      {
        "id": 456239120,
        "owner_id": -218491024,
        "title": "Шок нарезка со стрима",
        "description": "Смотри стрим по ссылке! #clip_77812",
        "date": 1730384400,
        "views": 32800,
        "likes": {
          "count": 1420
        },
        "reposts": {
          "count": 89
        }
      }
    ]
  }
}
```

---

## 3. Особенности VK Клипов:
* **Парсинг ID ролика:** ВКонтакте идентифицирует видео парой чисел: `owner_id` (владелец/сообщество) и `video_id`. Регулярное выражение: `/(?:video|clip)(-?\d+)_(\d+)/`.
* **Быстродействие:** VK API отвечает быстрее, чем YouTube (в среднем 40–80 мс из дата-центров в РФ).
* **Надежность:** Работает внутри контура РФ без риска замедлений или блокировок.

Связанные документы:
- [[05 - INTEGRATIONS/Social Media APIs Overview & Feasibility Matrix|Матрица API]]
- [[05 - INTEGRATIONS/YouTube Data API Integration|YouTube API]]
