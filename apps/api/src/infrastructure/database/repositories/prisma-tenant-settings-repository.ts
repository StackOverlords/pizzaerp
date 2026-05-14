import type { PrismaClient } from '@prisma/client'
import type { ITenantSettingsRepository } from '../../../domain/repositories/i-tenant-settings-repository'

type RawSetting = { key: string; value: string }

export class PrismaTenantSettingsRepository implements ITenantSettingsRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async get(key: string): Promise<string | null> {
    try {
      const rows = await this.db.$queryRawUnsafe<RawSetting[]>(
        `SELECT value FROM "${this.schema}".tenant_settings WHERE key = $1`,
        key,
      )
      return rows[0]?.value ?? null
    } catch {
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    await this.db.$executeRawUnsafe(
      `INSERT INTO "${this.schema}".tenant_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      key,
      value,
    )
  }

  async getAll(): Promise<Record<string, string>> {
    try {
      const rows = await this.db.$queryRawUnsafe<RawSetting[]>(
        `SELECT key, value FROM "${this.schema}".tenant_settings`,
      )
      return Object.fromEntries(rows.map(r => [r.key, r.value]))
    } catch {
      return {}
    }
  }
}
