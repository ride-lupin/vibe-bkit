---
template: design
version: 1.2
feature: schemas
date: 2026-03-19
author: CTO Lead (Enterprise Team -- Council: architect + developer)
project: vibe-bkit
status: Approved
---

# Shared Zod Schemas Design Document

> **Summary**: packages/shared에 도메인별 Zod 스키마 카탈로그 상세 설계 -- 파일 구조, 스키마 명세, 타입 export 전략
>
> **Project**: vibe-bkit
> **Version**: 0.0.1
> **Author**: CTO Lead (Enterprise Team)
> **Date**: 2026-03-19
> **Status**: Approved
> **Planning Doc**: [schemas.plan.md](../01-plan/features/schemas.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 도메인별 Zod 스키마를 모듈화하여 확장 가능한 구조 확보
- 공통 패턴(타임스탬프, 페이지네이션, API 래퍼)을 재사용 가능한 유틸리티로 추출
- z.infer 기반 타입 추론으로 스키마-타입 동기화 100% 보장
- FE(react-hook-form) / BE(Hono.js validator) 양쪽 사용 패턴 지원

### 1.2 Design Principles

- **Single Source of Truth**: 하나의 Zod 스키마에서 타입과 검증 로직 모두 도출
- **Composition over Duplication**: 공통 필드는 compose/merge/extend로 재사용
- **Convention Compliance**: CLAUDE.md 규칙 100% 준수 (type only, no enum, kebab-case)
- **Progressive Enhancement**: 기존 HealthSchema 깨뜨리지 않고 확장

---

## 2. Architecture

### 2.1 파일 구조

```
packages/shared/
  src/
    schemas/
      common.ts        # 공통 필드, API 래퍼, 페이지네이션, 에러
      user.ts          # User 도메인 스키마
      todo.ts          # Todo 도메인 스키마
      health.ts        # 기존 HealthSchema (index.ts에서 이동)
      index.ts         # barrel export
    types/
      index.ts         # 기존 ApiResponse 타입 + 추가 유틸리티 타입
    index.ts           # 루트 barrel export (변경 없음)
```

### 2.2 의존성 방향

```
index.ts (barrel)
  |
  +-- schemas/index.ts (barrel)
  |     |
  |     +-- schemas/common.ts     <-- 외부 의존: zod만
  |     +-- schemas/health.ts     <-- 의존: common.ts
  |     +-- schemas/user.ts       <-- 의존: common.ts
  |     +-- schemas/todo.ts       <-- 의존: common.ts
  |
  +-- types/index.ts
```

**규칙**: 도메인 스키마 파일은 `common.ts`만 import 가능. 도메인 간 상호 참조 금지.

### 2.3 데이터 흐름 (FE/BE 사용 패턴)

```
[BE: Hono.js Route]
  Request Body --> CreateUserSchema.parse(body) --> 검증된 데이터 --> DB 저장
  DB 결과 --> UserSchema.parse(result) --> 검증된 응답 --> Client

[FE: react-hook-form]
  <Form> --> zodResolver(CreateUserSchema) --> 실시간 검증 --> Submit
  API Response --> UserSchema.parse(json) --> 타입 안전한 상태 관리
```

---

## 3. Data Model -- Schema Catalog

### 3.1 common.ts -- 공통 스키마

```typescript
import { z } from 'zod'

// ============================================================
// Common Field Schemas
// ============================================================

/** UUID v4 형식 ID */
export const IdSchema = z.string().uuid()

/** ISO 8601 날짜 문자열 */
export const DateStringSchema = z.string().datetime()

/** 모든 엔티티의 기본 필드 (DB row 공통) */
export const BaseEntitySchema = z.object({
  id: IdSchema,
  createdAt: DateStringSchema,
  updatedAt: DateStringSchema,
})

// ============================================================
// API Response Wrapper Schemas
// ============================================================

/** 페이지네이션 요청 파라미터 */
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/** 페이지네이션 메타 정보 */
export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})

/** 단일 아이템 API 응답 래퍼 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: z.record(z.unknown()).optional(),
  })

/** 페이지네이션 목록 API 응답 래퍼 */
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  })

/** API 에러 응답 */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
})

// ============================================================
// Inferred Types
// ============================================================

export type BaseEntity = z.infer<typeof BaseEntitySchema>
export type PaginationParams = z.infer<typeof PaginationParamsSchema>
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>
export type ApiError = z.infer<typeof ApiErrorSchema>
```

### 3.2 health.ts -- Health 스키마 (기존 코드 이동)

```typescript
import { z } from 'zod'

export const HealthSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
})

export type Health = z.infer<typeof HealthSchema>
```

### 3.3 user.ts -- User 도메인 스키마

```typescript
import { z } from 'zod'
import { BaseEntitySchema } from './common'

// ============================================================
// Constants (Literal Unions -- enum 대신)
// ============================================================

export const USER_ROLES = ['admin', 'user'] as const
export const UserRoleSchema = z.enum(USER_ROLES)

// ============================================================
// User Schemas
// ============================================================

/** 이메일 검증 */
const emailSchema = z.string().email().max(255)

/** 비밀번호 검증 (최소 8자, 영문+숫자) */
const passwordSchema = z
  .string()
  .min(8)
  .max(100)
  .regex(/^(?=.*[A-Za-z])(?=.*\d)/, '영문과 숫자를 모두 포함해야 합니다')

/** User 기본 엔티티 */
export const UserSchema = BaseEntitySchema.extend({
  email: emailSchema,
  name: z.string().min(1).max(100),
  role: UserRoleSchema.default('user'),
})

/** User 생성 입력 (회원가입) */
export const CreateUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(100),
  password: passwordSchema,
})

/** User 수정 입력 (프로필 업데이트) */
export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  password: passwordSchema.optional(),
})

/** 로그인 입력 */
export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})

// ============================================================
// Inferred Types
// ============================================================

export type UserRole = z.infer<typeof UserRoleSchema>
export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
export type Login = z.infer<typeof LoginSchema>
```

### 3.4 todo.ts -- Todo 도메인 스키마

```typescript
import { z } from 'zod'
import { BaseEntitySchema } from './common'

// ============================================================
// Constants (Literal Unions -- enum 대신)
// ============================================================

export const TODO_STATUSES = ['pending', 'in_progress', 'done'] as const
export const TodoStatusSchema = z.enum(TODO_STATUSES)

export const TODO_PRIORITIES = ['low', 'medium', 'high'] as const
export const TodoPrioritySchema = z.enum(TODO_PRIORITIES)

// ============================================================
// Todo Schemas
// ============================================================

/** Todo 기본 엔티티 */
export const TodoSchema = BaseEntitySchema.extend({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: TodoStatusSchema.default('pending'),
  priority: TodoPrioritySchema.default('medium'),
  dueDate: z.string().datetime().optional(),
  userId: z.string().uuid(),
})

/** Todo 생성 입력 */
export const CreateTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: TodoPrioritySchema.default('medium'),
  dueDate: z.string().datetime().optional(),
})

/** Todo 수정 입력 */
export const UpdateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: TodoStatusSchema.optional(),
  priority: TodoPrioritySchema.optional(),
  dueDate: z.string().datetime().nullable().optional(),
})

/** Todo 필터 쿼리 파라미터 */
export const TodoFilterSchema = z.object({
  status: TodoStatusSchema.optional(),
  priority: TodoPrioritySchema.optional(),
  search: z.string().max(200).optional(),
})

// ============================================================
// Inferred Types
// ============================================================

export type TodoStatus = z.infer<typeof TodoStatusSchema>
export type TodoPriority = z.infer<typeof TodoPrioritySchema>
export type Todo = z.infer<typeof TodoSchema>
export type CreateTodo = z.infer<typeof CreateTodoSchema>
export type UpdateTodo = z.infer<typeof UpdateTodoSchema>
export type TodoFilter = z.infer<typeof TodoFilterSchema>
```

### 3.5 schemas/index.ts -- Barrel Export

```typescript
// Common
export {
  IdSchema,
  DateStringSchema,
  BaseEntitySchema,
  PaginationParamsSchema,
  PaginationMetaSchema,
  apiResponseSchema,
  paginatedResponseSchema,
  ApiErrorSchema,
} from './common'

export type { BaseEntity, PaginationParams, PaginationMeta, ApiError } from './common'

// Health
export { HealthSchema } from './health'
export type { Health } from './health'

// User
export {
  USER_ROLES,
  UserRoleSchema,
  UserSchema,
  CreateUserSchema,
  UpdateUserSchema,
  LoginSchema,
} from './user'

export type { UserRole, User, CreateUser, UpdateUser, Login } from './user'

// Todo
export {
  TODO_STATUSES,
  TODO_PRIORITIES,
  TodoStatusSchema,
  TodoPrioritySchema,
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoFilterSchema,
} from './todo'

export type { TodoStatus, TodoPriority, Todo, CreateTodo, UpdateTodo, TodoFilter } from './todo'
```

---

## 4. types/index.ts 업데이트

기존 `ApiResponse` 제네릭 타입을 유지하면서, Zod 스키마 기반 타입과 공존.

```typescript
/** 제네릭 API 응답 타입 (Zod 스키마 없이 간단히 사용할 때) */
export type ApiResponse<T> = {
  data: T
  meta?: Record<string, unknown>
}

/** 페이지네이션 API 응답 타입 */
export type PaginatedResponse<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

---

## 5. API Specification (스키마 사용 예시)

### 5.1 BE (Hono.js) 사용 패턴

```typescript
// apps/api/src/routes/users.ts
import { Hono } from 'hono'
import { CreateUserSchema, UserSchema } from '@vibe-bkit/shared'

const usersRoute = new Hono()

usersRoute.post('/', async (c) => {
  const body = await c.req.json()
  const input = CreateUserSchema.parse(body) // 런타임 검증
  // ... DB 저장 로직
  const user = UserSchema.parse(savedUser) // 응답 검증
  return c.json({ data: user }, 201)
})
```

### 5.2 FE (react-hook-form + Zod) 사용 패턴

```typescript
// apps/web/src/features/auth/components/login-form.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema } from '@vibe-bkit/shared'
import type { Login } from '@vibe-bkit/shared'

export function LoginForm() {
  const form = useForm<Login>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  })
  // ...
}
```

### 5.3 FE (React Query + Zod) 사용 패턴

```typescript
// apps/web/src/features/todos/hooks/use-todos.ts
import { useQuery } from '@tanstack/react-query'
import { TodoSchema } from '@vibe-bkit/shared'
import type { Todo } from '@vibe-bkit/shared'
import { api } from '@/lib/api'
import { z } from 'zod'

export function useTodos() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const json = await api.get('api/todos').json()
      return z.array(TodoSchema).parse((json as { data: unknown }).data)
    },
  })
}
```

---

## 6. Error Handling

### 6.1 Zod 검증 에러 변환

```typescript
// BE에서 Zod 에러를 API 에러 형식으로 변환
import { ZodError } from 'zod'

function formatZodError(error: ZodError) {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Input validation failed',
      details: error.flatten().fieldErrors,
    },
  }
}
```

### 6.2 에러 코드 정의

| Code             | Message                  | Cause                | Handling               |
| ---------------- | ------------------------ | -------------------- | ---------------------- |
| VALIDATION_ERROR | Input validation failed  | Zod parse 실패       | 400 + fieldErrors 반환 |
| NOT_FOUND        | Resource not found       | 존재하지 않는 리소스 | 404                    |
| UNAUTHORIZED     | Authentication required  | 인증 누락            | 401                    |
| FORBIDDEN        | Insufficient permissions | 권한 부족            | 403                    |
| INTERNAL_ERROR   | Internal server error    | 서버 에러            | 500                    |

---

## 7. Security Considerations

- [x] 이메일 형식 검증 (`z.string().email()`)
- [x] 비밀번호 복잡도 검증 (최소 8자, 영문+숫자 필수)
- [x] 문자열 최대 길이 제한 (DoS 방지)
- [x] 페이지네이션 limit 상한 (max: 100)
- [x] UUID 형식 검증 (`z.string().uuid()`)
- [ ] XSS 방지: 향후 sanitize 유틸리티 추가 검토 (별도 PDCA)

---

## 8. Test Plan

### 8.1 Test Scope

| Type        | Target                    | Tool         |
| ----------- | ------------------------- | ------------ |
| Unit Test   | 각 스키마 parse/safeParse | Vitest       |
| Type Test   | z.infer 타입 추론 정확성  | tsc --noEmit |
| Integration | FE/BE import 가능 여부    | pnpm build   |

### 8.2 Test Cases (Key)

- [ ] Happy path: 유효한 데이터로 모든 스키마 parse 성공
- [ ] Error scenario: 필수 필드 누락 시 ZodError 발생
- [ ] Error scenario: 형식 불일치 (이메일, UUID, datetime) 시 에러
- [ ] Edge case: optional 필드 누락 시 정상 parse
- [ ] Edge case: 문자열 최대 길이 초과 시 에러
- [ ] Edge case: 페이지네이션 limit=0, limit=101 시 에러
- [ ] Edge case: UpdateSchema에서 빈 객체 전달 시 정상 parse

---

## 9. Implementation Guide

### 9.1 구현 순서 (Do 단계 체크리스트)

1. [ ] `packages/shared/src/schemas/common.ts` 생성
2. [ ] `packages/shared/src/schemas/health.ts` 생성 (기존 HealthSchema 이동)
3. [ ] `packages/shared/src/schemas/user.ts` 생성
4. [ ] `packages/shared/src/schemas/todo.ts` 생성
5. [ ] `packages/shared/src/schemas/index.ts` barrel export로 교체
6. [ ] `packages/shared/src/types/index.ts` PaginatedResponse 추가
7. [ ] `pnpm typecheck` 통과 확인
8. [ ] `pnpm build` 성공 확인
9. [ ] apps/api에서 import 정상 확인
10. [ ] apps/web에서 import 정상 확인

### 9.2 Migration Notes

기존 `schemas/index.ts`에 HealthSchema가 직접 정의되어 있음.
이를 `health.ts`로 이동하고 `index.ts`를 barrel export로 교체.
`@vibe-bkit/shared`의 public API는 변경 없음 (하위 호환).

---

## Version History

| Version | Date       | Changes                                        | Author   |
| ------- | ---------- | ---------------------------------------------- | -------- |
| 0.1     | 2026-03-19 | Initial draft (Council: architect + developer) | CTO Lead |
| 1.0     | 2026-03-19 | Approved -- proceeding to Do                   | CTO Lead |
