import type { FastifyRequest, FastifyReply } from 'fastify'
import { Errors } from '../../shared/errors/app-error'

export async function adminAuth(_request: FastifyRequest, _reply: FastifyReply) {
  const expected = process.env.SUPER_ADMIN_KEY
  if (!expected) throw Errors.forbidden('Admin access is not configured on this server')

  const provided = _request.headers['x-admin-key']
  if (provided !== expected) throw Errors.unauthorized('Invalid admin key')
}
