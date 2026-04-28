import type { FastifyRequest, FastifyReply } from 'fastify'
import type { UserRole } from '../../domain/entities/user'
import { Errors } from '../../shared/errors/app-error'

export function authorize(roles: UserRole[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    // ADMIN tiene acceso universal — no necesita estar en la lista de roles
    if (request.user.role === 'ADMIN') return
    if (!roles.includes(request.user.role)) {
      throw Errors.forbidden()
    }
  }
}
