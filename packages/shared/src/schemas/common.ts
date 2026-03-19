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
