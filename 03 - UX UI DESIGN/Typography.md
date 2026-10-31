---
title: Шрифтовая система и типографика (Typography)
type: design
status: active
priority: high
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - design
  - typography
---

# 🔤 Шрифтовая система и типографика (Typography)

## 1. Гарнитуры и назначения

* **Основной шрифт UI:** **Inter** (Google Fonts). Идеальная читаемость на мобильных экранах смартфонов, нейтральный современный характер.
* **Финансовый моноширинный шрифт:** **JetBrains Mono** / **Geist Mono**. Применяется для всех балансов, ставок CPM, счетчиков просмотров, таймеров холда и проверочных кодов.

---

## 2. Иерархия стилей текста (Type Scale)

```css
/* Крупный баланс в кошельке клиппера */
.text-display-balance {
  font-family: 'JetBrains Mono', monospace;
  font-size: 32px;
  line-height: 38px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* Заголовки экранов и страниц */
.text-heading-1 {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  line-height: 30px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Заголовки карточек и модулей */
.text-heading-2 {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
}

/* Основной текст описаний и ТЗ */
.text-body-regular {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 20px;
  font-weight: 400;
}

/* Мелкие подписи и таймштампы */
.text-caption {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
}

/* Проверочный код автора */
.text-verification-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
  color: var(--accent-money);
}
```

Связанные документы:
- [[03 - UX UI DESIGN/Color Palette|Цветовая палитра]]
- [[03 - UX UI DESIGN/Components|Компоненты]]
