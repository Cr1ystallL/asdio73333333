---
title: Архитектура фронтенда (Frontend Architecture)
type: architecture
status: active
priority: high
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - frontend
  - nextjs
  - tma
---

# 💻 Архитектура веб-фронтенда (Next.js Web Portal)

## 1. Монорепозиторий фронтенда (Turborepo Structure)

Фронтенд платформы Konveer организован в виде легковесного монорепозитория:
```
apps/
  ├── web/               # Единый веб-портал (Next.js 15 App Router, Responsive)
  │   ├── app/(auth)/    # Модуль авторизации (Telegram OAuth, SMS, Email)
  │   ├── app/(clipper)/ # Кабинет нарезчика (Desktop & Mobile Web)
  │   ├── app/(advert)/  # Кабинет рекламодателя (Desktop-first)
  │   └── app/(admin)/   # Внутренняя панель модератора (Backoffice)
packages/
  ├── ui/                # Общая дизайн-система (Tailwind + Radix Primitives)
  ├── api-client/        # Автогенерируемый TypeScript SDK (TanStack Query)
  └── types/             # Общие DTO и интерфейсы
```

---

## 2. Специфика веб-кабинета клиппера (Clipper Web App)

1. **Кроссплатформенность:** Полноценная поддержка ПК (Chrome/Firefox/Edge для монтажеров на CapCut PC, Premiere Pro) и мобильных устройств (Safari/Chrome для авторов на смартфонах).
2. **PWA-поддержка:** Возможность установки на главный экран смартфона с офлайн-кэшированием статики.
3. **Авторизация в 1 клик:** Использование Telegram Login Widget / Telegram OAuth (без необходимости придумывать и запоминать пароли).
4. **Управление состоянием сервера:** **TanStack Query (React Query v5)** с оптимистичными обновлениями (Optimistic Mutations) и кэшированием ленты офферов на 60 секунд.

Связанные документы:
- [[03 - UX UI DESIGN/Mobile UX|Мобильный UX клиппера]]
- [[05 - INTEGRATIONS/Telegram Bot & Mini App Integration|Интеграция Telegram]]
