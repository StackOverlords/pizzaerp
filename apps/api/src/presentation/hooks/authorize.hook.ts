import type { FastifyRequest, FastifyReply } from 'fastify'
import type { UserRole } from '../../domain/entities/user'
import { Errors } from '../../shared/errors/app-error'

export function authorize(roles: UserRole[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    if (!roles.includes(request.user.role)) {
      throw Errors.forbidden()
    }
  }
}
