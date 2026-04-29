import type { IUserRepository } from '../../domain/repositories/i-user-repository'
import { Errors } from '../../shared/errors/app-error'
import { bcryptService } from '../../infrastructure/auth/bcrypt.service'

interface Dependencies {
  userRepository: IUserRepository
}

export function createSetPinUseCase({ userRepository }: Dependencies) {
  return async function setPin(userId: string, pin: string): Promise<void> {
    if (!/^\d{4,6}$/.test(pin)) {
      throw Errors.badRequest('El PIN debe ser de 4 a 6 dígitos numéricos')
    }
    const pinHash = await bcryptService.hash(pin)
    await userRepository.updatePin(userId, pinHash)
  }
}
