import { PrismaClient } from '@prisma/client'
import { TenantSchemaService } from '../tenant-schema.service'

// Integration test — requires a real PostgreSQL connection (DATABASE_URL)
// Run with: pnpm test

const prisma = new PrismaClient()
const tenantService = new TenantSchemaService(prisma)

const TENANT_A = { slug: 'test-tenant-a', schema: 'tenant_test_a' }
const TENANT_B = { slug: 'test-tenant-b', schema: 'tenant_test_b' }

beforeAll(async () => {
  await prisma.$connect()

  // Seed tenants
  await prisma.tenant.upsert({
    where: { slug: TENANT_A.slug },
    update: {},
    create: { name: 'Tenant A', slug: TENANT_A.slug, schema: TENANT_A.schema },
  })
  await prisma.tenant.upsert({
    where: { slug: TENANT_B.slug },
    update: {},
    create: { name: 'Tenant B', slug: TENANT_B.slug, schema: TENANT_B.schema },
  })

  await tenantService.provision(TENANT_A.schema)
  await tenantService.provision(TENANT_B.schema)
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TENANT_A.schema}" CASCADE`)
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TENANT_B.schema}" CASCADE`)
  await prisma.tenant.deleteMany({ where: { slug: { in: [TENANT_A.slug, TENANT_B.slug] } } })
  await prisma.$disconnect()
})

describe('Tenant schema isolation (CA-05)', () => {
  it('provisions independent schemas for each tenant', async () => {
    const existsA = await tenantService.schemaExists(TENANT_A.schema)
    const existsB = await tenantService.schemaExists(TENANT_B.schema)
    expect(existsA).toBe(true)
    expect(existsB).toBe(true)
  })

  it('tenant A data is not visible in tenant B schema', async () => {
    // Insert a shift in tenant A's schema
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${TENANT_A.schema}".shifts (branch_id, user_id, initial_cash)
      VALUES ('branch-1', 'user-1', 100)
    `)

    // Query from tenant B's schema — should return 0 rows
    const rows = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT * FROM "${TENANT_B.schema}".shifts`,
    )
    expect(rows).toHaveLength(0)
  })

  it('schemas exist independently in information_schema', async () => {
    const schemas = await prisma.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name IN (${TENANT_A.schema}, ${TENANT_B.schema})
    `
    expect(schemas).toHaveLength(2)
  })
})
