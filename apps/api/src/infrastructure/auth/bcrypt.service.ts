import bcrypt from 'bcryptjs'

const COST = 12

export const bcryptService = {
  hash: (password: string): Promise<string> => bcrypt.hash(password, COST),
  compare: (password: string, hash: string): Promise<boolean> => bcrypt.compare(password, hash),
}
