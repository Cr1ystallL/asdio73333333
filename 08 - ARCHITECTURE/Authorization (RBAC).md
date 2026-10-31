---
title: "Архитектура Авторизации и Роли (Authorization RBAC)"
type: architecture
status: approved
priority: critical
created: 2026-10-31
updated: 2026-10-31
tags:
  - konveer
  - architecture
  - rbac
  - permissions
  - security
---

# Архитектура Авторизации и Роли (Role-Based Access Control)

Документ формализует ролевую модель доступа (RBAC), разграничение прав и защиту API-эндпоинтов платформы Konveer.

---

## 1. Матрица ролей и разрешений

| Разрешение (Permission) | GUEST | CLIPPER | ADVERTISER | MODERATOR | FIN_ADMIN | SUPER_ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Просмотр каталога кампаний | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Скачивание исходников кампании | ❌ | ✅ | ✅ (своих) | ✅ | ✅ | ✅ |
| Сдача ссылки на видео | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Создание / редактирование кампании | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Пополнение баланса | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Запрос вывода средств | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ручное одобрение/отклонение ролика | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Разрешение апелляций | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Просмотр банковских проводок Ledger | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Принудительная заморозка выплат | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Управление ролями сотрудников | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 2. Реализация Guards в NestJS

Проверка прав выполняется на уровне контроллеров с помощью декораторов:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MODERATOR, UserRole.SUPER_ADMIN)
@Post('submissions/:id/reject')
async rejectSubmission(@Param('id') id: string, @Body() dto: RejectDto) {
  return this.moderationService.reject(id, dto);
}
```

---

## Связанные документы
- [[08 - ARCHITECTURE/Authentication|Аутентификация]]
- [[02 - PRODUCT/Roles, Permissions & System States|Системные роли в PRD]]
- [[02 - PRODUCT/Admin Panel Specification|Спецификация админ-панели]]
