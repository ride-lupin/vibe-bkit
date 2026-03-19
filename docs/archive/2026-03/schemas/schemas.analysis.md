# schemas — Gap Analysis Report

**Date**: 2026-03-19
**Match Rate**: 100%
**Phase**: Check (Complete)

---

## Executive Summary

| 항목                | 결과     |
| ------------------- | -------- |
| Match Rate          | **100%** |
| Total Exports       | 37       |
| Matched             | 37/37    |
| Gaps                | 0        |
| Iterations Required | 0        |

## Comparison Summary

| Category              |     Items      |   Match   |  Status  |
| --------------------- | :------------: | :-------: | :------: |
| File structure        |    6 files     |    6/6    |    ✅    |
| Schema exports        |   22 schemas   |   22/22   |    ✅    |
| Type exports          |    15 types    |   15/15   |    ✅    |
| Plan FR coverage      | 8 requirements |    8/8    |    ✅    |
| Dependency direction  |    4 rules     |    4/4    |    ✅    |
| Convention compliance |    6 rules     |    6/6    |    ✅    |
| **Overall**           | **37 exports** | **37/37** | **100%** |

## File-by-File Comparison

### common.ts

| Export                    | Design                                                                      | Implementation | Status |
| ------------------------- | --------------------------------------------------------------------------- | -------------- | ------ |
| `IdSchema`                | `z.string().uuid()`                                                         | identical      | ✅     |
| `DateStringSchema`        | `z.string().datetime()`                                                     | identical      | ✅     |
| `BaseEntitySchema`        | `z.object({ id, createdAt, updatedAt })`                                    | identical      | ✅     |
| `PaginationParamsSchema`  | `page: coerce.min(1).default(1), limit: coerce.min(1).max(100).default(20)` | identical      | ✅     |
| `PaginationMetaSchema`    | `page, limit, total, totalPages`                                            | identical      | ✅     |
| `apiResponseSchema`       | `<T>(dataSchema) => z.object({ data, meta? })`                              | identical      | ✅     |
| `paginatedResponseSchema` | `<T>(itemSchema) => z.object({ data: array, meta })`                        | identical      | ✅     |
| `ApiErrorSchema`          | `z.object({ error: { code, message, details? } })`                          | identical      | ✅     |
| `BaseEntity` (type)       | `z.infer<typeof BaseEntitySchema>`                                          | identical      | ✅     |
| `PaginationParams` (type) | `z.infer<typeof PaginationParamsSchema>`                                    | identical      | ✅     |
| `PaginationMeta` (type)   | `z.infer<typeof PaginationMetaSchema>`                                      | identical      | ✅     |
| `ApiError` (type)         | `z.infer<typeof ApiErrorSchema>`                                            | identical      | ✅     |

### health.ts

| Export          | Status |
| --------------- | ------ |
| `HealthSchema`  | ✅     |
| `Health` (type) | ✅     |

### user.ts

| Export             | Status                            |
| ------------------ | --------------------------------- |
| `USER_ROLES`       | ✅ `['admin', 'user'] as const`   |
| `UserRoleSchema`   | ✅ `z.enum(USER_ROLES)`           |
| `UserSchema`       | ✅ `BaseEntitySchema.extend(...)` |
| `CreateUserSchema` | ✅                                |
| `UpdateUserSchema` | ✅                                |
| `LoginSchema`      | ✅                                |
| 5 inferred types   | ✅                                |

### todo.ts

| Export               | Status                                           |
| -------------------- | ------------------------------------------------ |
| `TODO_STATUSES`      | ✅ `['pending', 'in_progress', 'done'] as const` |
| `TodoStatusSchema`   | ✅ `z.enum(TODO_STATUSES)`                       |
| `TODO_PRIORITIES`    | ✅ `['low', 'medium', 'high'] as const`          |
| `TodoPrioritySchema` | ✅ `z.enum(TODO_PRIORITIES)`                     |
| `TodoSchema`         | ✅                                               |
| `CreateTodoSchema`   | ✅                                               |
| `UpdateTodoSchema`   | ✅                                               |
| `TodoFilterSchema`   | ✅                                               |
| 6 inferred types     | ✅                                               |

### schemas/index.ts

37개 re-export 전체 일치 ✅

### types/index.ts

| Export                 | Status |
| ---------------------- | ------ |
| `ApiResponse<T>`       | ✅     |
| `PaginatedResponse<T>` | ✅     |

## Convention Compliance

| Rule                      | Result           |
| ------------------------- | ---------------- |
| `enum` keyword usage      | 0 occurrences ✅ |
| `interface` keyword usage | 0 occurrences ✅ |
| `any` type usage          | 0 occurrences ✅ |
| `console.log` usage       | 0 occurrences ✅ |
| File names kebab-case     | 6/6 ✅           |
| All types via `z.infer`   | 15/15 ✅         |

## Gaps Found

**없음.** 누락, 추가, 변경 항목 전무.

## Next Steps

Match Rate ≥ 90% → `/pdca report schemas` 실행 권장
