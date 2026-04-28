import type { FastifyInstance } from 'fastify'
import jwtPlugin from '@fastify/jwt'
import fp from 'fastify-plugin'
import type { UserRole } from '../../domain/entities/user'

export interface JwtPayload {
  user_id: string
  tenant_id: string
  branch_id: string | null
  role: UserRole
  type: 'access' | 'refresh'
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

export const jwtFastifyPlugin = fp(async function jwtFastifyPlugin(fastify: FastifyInstance) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET env var is required')

  await fastify.register(jwtPlugin, {
    secret,
    sign: { expiresIn: '15m' },
  })
})
