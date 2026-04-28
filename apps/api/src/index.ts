import { createServer } from './app'
import { prisma } from './infrastructure/database/prisma'
import { TenantSchemaService } from './infrastructure/database/tenant-schema.service'

const start = async () => {
  const tenantSchemaService = new TenantSchemaService(prisma)
  await tenantSchemaService.migrateAllTenants()

  const server = await createServer()
  const port = Number(process.env.PORT ?? 3000)
  await server.listen({ port, host: '0.0.0.0' })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
