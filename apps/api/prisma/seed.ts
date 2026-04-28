import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { TenantSchemaService } from '../src/infrastructure/database/tenant-schema.service'

const prisma = new PrismaClient()
const tenantSchemaService = new TenantSchemaService(prisma)

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12)

  const plan = await prisma.plan.upsert({
    where: { name: 'Licencia' },
    update: {},
    create: { name: 'Licencia', maxBranches: null, maxUsers: null },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'maxpizza' },
    update: {},
    create: {
      name: 'Pizzería Max',
      slug: 'maxpizza',
      schema: 'maxpizza',
      status: 'ACTIVE',
      subscription: {
        create: { planId: plan.id, status: 'ACTIVE' },
      },
    },
  })

  await tenantSchemaService.provision(tenant.schema)

  const branch = await prisma.branch.upsert({
    where: { id: 'branch-maxpizza-central' },
    update: {},
    create: { id: 'branch-maxpizza-central', name: 'Sucursal Central', tenantId: tenant.id },
  })

  await prisma.user.upsert({
    where: { username_tenantId: { username: 'admin', tenantId: tenant.id } },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
      tenantId: tenant.id,
      branchId: branch.id,
    },
  })

  console.log('Seed OK')
  console.log(`  tenantId: ${tenant.id}`)
  console.log('  username: admin')
  console.log('  password: admin123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
