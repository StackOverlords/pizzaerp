import type { FastifyRequest, FastifyReply } from 'fastify'
import { Errors } from '../../shared/errors/app-error'

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify()
    if (request.user.type !== 'access') {
      throw Errors.unauthorized('Invalid token type')
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AppError') throw err
    throw Errors.unauthorized()
  }
}
