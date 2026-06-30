import { z } from 'zod'

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  password: z.string().min(6).optional(),
})

export const userResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const userIdParamSchema = z.object({ id: z.string() })

export type UpdateUserInput = z.infer<typeof updateUserSchema>
