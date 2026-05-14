export interface ITenantSettingsRepository {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  getAll(): Promise<Record<string, string>>
}
