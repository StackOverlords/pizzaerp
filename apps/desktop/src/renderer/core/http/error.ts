import axios from 'axios'

export interface AppError {
  message: string
  status?: number
  code?: string
}

export function extractApiMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data === 'string' && data.length > 0) return data
    if (data?.message) return String(data.message)
    if (data?.error) return String(data.error)
    if (data?.detail) return String(data.detail)
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Error desconocido'
}

export function toAppError(error: unknown): AppError {
  if (axios.isAxiosError(error)) {
    return {
      message: extractApiMessage(error),
      status: error.response?.status,
      code: error.code,
    }
  }
  if (error instanceof Error) {
    return { message: error.message }
  }
  return { message: 'Error desconocido' }
}
