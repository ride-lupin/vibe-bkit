import { z } from 'zod'
import { BaseEntitySchema } from './common'

// ============================================================
// Constants (Literal Unions)
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
