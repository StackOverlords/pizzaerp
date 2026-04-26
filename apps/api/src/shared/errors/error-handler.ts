import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { AppError } from './app-error'

interface ErrorResponse {
  error: {
    code: string
    message: string
    statusCode: number
  }
}

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  request.log.error({ err: error }, error.message)

  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message, statusCode: error.statusCode },
    } satisfies ErrorResponse)
    return
  }

  const fastifyError = error as FastifyError

  if (fastifyError.validation) {
    reply.status(400).send({
      error: { code: 'VALIDATION_ERROR', message: error.message, statusCode: 400 },
    } satisfies ErrorResponse)
    return
  }

  const statusCode = fastifyError.statusCode ?? 500
  const message =
    process.env.NODE_ENV === 'production' && statusCode >= 500
      ? 'Internal server error'
      : error.message

  reply.status(statusCode).send({
    error: { code: 'INTERNAL_ERROR', message, statusCode },
  } satisfies ErrorResponse)
}
