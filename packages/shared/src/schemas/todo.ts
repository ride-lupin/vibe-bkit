import { z } from 'zod'
import { BaseEntitySchema } from './common'

// ============================================================
// Constants (Literal Unions)
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
