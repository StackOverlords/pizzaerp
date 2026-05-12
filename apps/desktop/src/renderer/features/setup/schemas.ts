import { z } from 'zod'

export const setupSchema = z.object({
  tenantName:    z.string().min(1, 'Requerido'),
  slug:          z
    .string()
    .min(1, 'Requerido')
    .max(60, 'Máximo 60 caracteres')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones'),
  username: z.string().min(3, 'Mínimo 3 caracteres'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export type SetupPayload = z.infer<typeof setupSchema>
