import { PrismaClient } from '@prisma/client'

// Returns a Prisma client that sets search_path to the tenant schema
// for every operation. Use this inside request handlers, NOT at startup.
export function createTenantClient(schemaName: string): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: `${process.env.DATABASE_URL}?schema=${encodeURIComponent(schemaName)}`,
      },
    },
    log: ['warn', 'error'],
  })
}

// For queries that span tenant schema + public, use SET LOCAL search_path
// inside a $transaction:
//
//   await prisma.$transaction(async (tx) => {
//     await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}", public`)
//     return tx.$queryRaw`SELECT * FROM shifts`
//   })
