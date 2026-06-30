import { z } from 'zod'

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  password: z.string().min(6).optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
