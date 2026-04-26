import type { PrismaClient } from '@prisma/client'

// SQL que define las tablas del schema de cada tenant.
// Se ejecuta al provisionar un nuevo tenant y al correr migraciones.
const TENANT_SCHEMA_DDL = (schema: string) => `
  CREATE TABLE IF NOT EXISTS "${schema}".shifts (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    branch_id   TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    opened_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at   TIMESTAMPTZ,
    initial_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED'))
  );
`

export class TenantSchemaService {
  constructor(private readonly db: PrismaClient) {}

  async provision(schemaName: string): Promise<void> {
    await this.db.$transaction([
      this.db.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`),
      this.db.$executeRawUnsafe(TENANT_SCHEMA_DDL(schemaName)),
    ])
  }

  async schemaExists(schemaName: string): Promise<boolean> {
    const result = await this.db.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata
        WHERE schema_name = ${schemaName}
      ) AS exists
    `
    return result[0]?.exists ?? false
  }

  // Aplica el DDL más reciente a todos los schemas de tenants existentes (CA-04)
  async migrateAllTenants(): Promise<void> {
    const tenants = await this.db.tenant.findMany({ select: { schema: true } })
    for (const tenant of tenants) {
      await this.db.$executeRawUnsafe(TENANT_SCHEMA_DDL(tenant.schema))
    }
  }
}
