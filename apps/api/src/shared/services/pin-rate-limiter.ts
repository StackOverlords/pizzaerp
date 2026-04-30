// In-memory rate limiter for admin PIN attempts.
// Key: `${tenantId}:${adminUsername}` — per admin user within a tenant.
// 3 failed attempts → blocked for 5 minutes.

interface AttemptRecord {
  count: number
  blockedUntil: number | null
}

const BLOCK_AFTER = 3
const BLOCK_DURATION_MS = 5 * 60 * 1000

const attempts = new Map<string, AttemptRecord>()

function key(tenantId: string, adminUsername: string): string {
  return `${tenantId}:${adminUsername}`
}

export const pinRateLimiter = {
  isBlocked(tenantId: string, adminUsername: string): boolean {
    const record = attempts.get(key(tenantId, adminUsername))
    if (!record || record.blockedUntil === null) return false
    if (Date.now() < record.blockedUntil) return true
    // Block expired — reset
    attempts.delete(key(tenantId, adminUsername))
    return false
  },

  recordFailure(tenantId: string, adminUsername: string): void {
    const k = key(tenantId, adminUsername)
    const record = attempts.get(k) ?? { count: 0, blockedUntil: null }
    record.count += 1
    record.blockedUntil = record.count >= BLOCK_AFTER ? Date.now() + BLOCK_DURATION_MS : null
    attempts.set(k, record)
  },

  reset(tenantId: string, adminUsername: string): void {
    attempts.delete(key(tenantId, adminUsername))
  },

  remainingSeconds(tenantId: string, adminUsername: string): number {
    const record = attempts.get(key(tenantId, adminUsername))
    if (!record?.blockedUntil) return 0
    return Math.ceil((record.blockedUntil - Date.now()) / 1000)
  },
}
