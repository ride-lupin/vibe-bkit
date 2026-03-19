import { z } from 'zod'
import { BaseEntitySchema, apiResponseSchema } from './common'

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

/** 휴대폰 번호 검증 (한국 형식: 010-XXXX-XXXX) */
const phoneSchema = z.string().regex(/^010-\d{4}-\d{4}$/, '010-XXXX-XXXX 형식으로 입력해 주세요')

/** User 기본 엔티티 */
export const UserSchema = BaseEntitySchema.extend({
  email: emailSchema,
  name: z.string().min(1).max(100),
  role: UserRoleSchema.default('user'),
  phone: phoneSchema,
})

/** User 생성 입력 (회원가입) */
export const CreateUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(100),
  password: passwordSchema,
  phone: phoneSchema,
})

/** User 수정 입력 (프로필 업데이트) */
export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  password: passwordSchema.optional(),
  phone: phoneSchema.optional(),
})

/** 로그인 입력 */
export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})

// --- Auth Response Schemas ---

/** 로그인 응답에 포함되는 공개 유저 정보 (createdAt/updatedAt 제외) */
export const PublicUserSchema = UserSchema.pick({
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
})

/** 로그인 성공 응답 */
export const LoginResponseSchema = apiResponseSchema(
  z.object({
    accessToken: z.string(),
    user: PublicUserSchema,
  }),
)

/** 프로필 조회 응답 */
export const ProfileResponseSchema = apiResponseSchema(PublicUserSchema)

// ============================================================
// Inferred Types
// ============================================================

export type UserRole = z.infer<typeof UserRoleSchema>
export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
export type Login = z.infer<typeof LoginSchema>
export type PublicUser = z.infer<typeof PublicUserSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>
