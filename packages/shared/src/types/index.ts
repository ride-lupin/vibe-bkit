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
