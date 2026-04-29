import type { PrismaClient } from '@prisma/client'

// Un statement por tabla — Prisma no acepta múltiples comandos en $executeRawUnsafe.
// Orden de creación respeta dependencias de FK.
const TENANT_DDL_STATEMENTS = (s: string): string[] => [

  // ─── MENÚ ────────────────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS "${s}".categories (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name        TEXT NOT NULL,
    order_index INT  NOT NULL DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".ingredients (
    id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name               TEXT NOT NULL,
    purchase_unit      TEXT NOT NULL,
    consumption_unit   TEXT NOT NULL,
    conversion_factor  NUMERIC(10,4) NOT NULL,
    wastage_percentage NUMERIC(5,2)  NOT NULL DEFAULT 0,
    active             BOOLEAN NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".dishes (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    category_id    TEXT REFERENCES "${s}".categories(id),
    name           TEXT NOT NULL,
    description    TEXT,
    sale_price     NUMERIC(10,2) NOT NULL,
    image_url      TEXT,
    active         BOOLEAN NOT NULL DEFAULT true,
    available_from TIME,
    available_to   TIME,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Migración idempotente: agrega columnas de disponibilidad horaria a schemas existentes
  `ALTER TABLE IF EXISTS "${s}".dishes ADD COLUMN IF NOT EXISTS available_from TIME`,
  `ALTER TABLE IF EXISTS "${s}".dishes ADD COLUMN IF NOT EXISTS available_to TIME`,

  `CREATE TABLE IF NOT EXISTS "${s}".dish_ingredients (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    dish_id       TEXT NOT NULL REFERENCES "${s}".dishes(id),
    ingredient_id TEXT NOT NULL REFERENCES "${s}".ingredients(id),
    base_quantity NUMERIC(10,4) NOT NULL,
    behavior      TEXT NOT NULL CHECK (behavior IN ('INCLUDED', 'OPTIONAL', 'EXTRA')),
    extra_cost    NUMERIC(10,2),
    UNIQUE (dish_id, ingredient_id)
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".combos (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name           TEXT NOT NULL,
    description    TEXT,
    sale_price     NUMERIC(10,2) NOT NULL,
    active         BOOLEAN NOT NULL DEFAULT true,
    available_from TIME,
    available_to   TIME,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".combo_slots (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    combo_id    TEXT NOT NULL REFERENCES "${s}".combos(id),
    name        TEXT NOT NULL,
    category_id TEXT REFERENCES "${s}".categories(id),
    required    BOOLEAN NOT NULL DEFAULT true,
    order_index INT NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".combo_slot_options (
    id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slot_id TEXT NOT NULL REFERENCES "${s}".combo_slots(id),
    dish_id TEXT NOT NULL REFERENCES "${s}".dishes(id),
    UNIQUE (slot_id, dish_id)
  )`,

  // ─── CAJA ─────────────────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS "${s}".shifts (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    branch_id    TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    opened_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at    TIMESTAMPTZ,
    initial_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED'))
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".shift_closures (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shift_id            TEXT NOT NULL REFERENCES "${s}".shifts(id),
    declared_cash       NUMERIC(10,2) NOT NULL,
    declared_qr_count   INT NOT NULL DEFAULT 0,
    expected_cash       NUMERIC(10,2) NOT NULL,
    expected_qr_total   NUMERIC(10,2) NOT NULL,
    expected_qr_count   INT NOT NULL DEFAULT 0,
    cash_difference     NUMERIC(10,2) NOT NULL,
    qr_count_difference INT NOT NULL,
    notes               TEXT,
    closed_at           TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".orders (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_number    INT NOT NULL DEFAULT 1,
    shift_id        TEXT NOT NULL REFERENCES "${s}".shifts(id),
    branch_id       TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
    subtotal        NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total           NUMERIC(10,2) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Migración idempotente: agrega order_number a schemas existentes
  `ALTER TABLE IF EXISTS "${s}".orders ADD COLUMN IF NOT EXISTS order_number INT NOT NULL DEFAULT 1`,

  `CREATE TABLE IF NOT EXISTS "${s}".order_items (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id   TEXT NOT NULL REFERENCES "${s}".orders(id),
    dish_id    TEXT REFERENCES "${s}".dishes(id),
    dish_name  TEXT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    quantity   INT NOT NULL,
    subtotal   NUMERIC(10,2) NOT NULL,
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".order_item_extras (
    id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_item_id      TEXT NOT NULL REFERENCES "${s}".order_items(id),
    dish_ingredient_id TEXT REFERENCES "${s}".dish_ingredients(id),
    ingredient_name    TEXT NOT NULL,
    quantity           NUMERIC(10,4) NOT NULL,
    unit_cost          NUMERIC(10,2) NOT NULL,
    subtotal           NUMERIC(10,2) NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".order_item_exclusions (
    id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_item_id      TEXT NOT NULL REFERENCES "${s}".order_items(id),
    dish_ingredient_id TEXT REFERENCES "${s}".dish_ingredients(id),
    ingredient_name    TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".payments (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id      TEXT NOT NULL REFERENCES "${s}".orders(id),
    method        TEXT NOT NULL CHECK (method IN ('CASH', 'QR')),
    amount        NUMERIC(10,2) NOT NULL,
    change_amount NUMERIC(10,2),
    reference     TEXT,
    paid_at       TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".order_cancellations (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id       TEXT NOT NULL REFERENCES "${s}".orders(id),
    admin_user_id  TEXT NOT NULL,
    cajero_user_id TEXT NOT NULL,
    reason         TEXT,
    cancelled_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Migración idempotente: agrega cajero_user_id a schemas existentes
  `ALTER TABLE IF EXISTS "${s}".order_cancellations ADD COLUMN IF NOT EXISTS cajero_user_id TEXT NOT NULL DEFAULT ''`,

  `CREATE TABLE IF NOT EXISTS "${s}".order_discounts (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id      TEXT NOT NULL REFERENCES "${s}".orders(id),
    admin_user_id TEXT NOT NULL,
    type          TEXT NOT NULL CHECK (type IN ('AMOUNT', 'PERCENTAGE')),
    value         NUMERIC(10,2) NOT NULL,
    amount        NUMERIC(10,2) NOT NULL,
    reason        TEXT,
    applied_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // ─── TRANSFERENCIAS ───────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS "${s}".dough_transfers (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    from_branch_id  TEXT NOT NULL,
    to_branch_id    TEXT NOT NULL,
    sent_by_user_id TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'IN_TRANSIT' CHECK (status IN ('IN_TRANSIT', 'RECEIVED')),
    transfer_date   DATE NOT NULL,
    notes           TEXT,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_at     TIMESTAMPTZ
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".dough_transfer_items (
    id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    transfer_id       TEXT NOT NULL REFERENCES "${s}".dough_transfers(id),
    dough_type        TEXT NOT NULL CHECK (dough_type IN ('SMALL', 'MEDIUM', 'LARGE')),
    quantity_sent     INT NOT NULL,
    quantity_received INT,
    notes             TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".dough_wastages (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    branch_id   TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    dough_type  TEXT NOT NULL CHECK (dough_type IN ('SMALL', 'MEDIUM', 'LARGE')),
    quantity    INT NOT NULL,
    reason      TEXT NOT NULL,
    notes       TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".dough_day_closures (
    id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    branch_id             TEXT NOT NULL,
    closure_date          DATE NOT NULL,
    dough_type            TEXT NOT NULL CHECK (dough_type IN ('SMALL', 'MEDIUM', 'LARGE')),
    initial_count         INT NOT NULL,
    sold_count            INT NOT NULL,
    wastage_count         INT NOT NULL,
    theoretical_remaining INT NOT NULL,
    actual_remaining      INT NOT NULL,
    difference            INT NOT NULL,
    notes                 TEXT,
    closed_by_user_id     TEXT NOT NULL,
    closed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (branch_id, closure_date, dough_type)
  )`,
]

export class TenantSchemaService {
  constructor(private readonly db: PrismaClient) {}

  async provision(schemaName: string): Promise<void> {
    await this.db.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)
    for (const stmt of TENANT_DDL_STATEMENTS(schemaName)) {
      await this.db.$executeRawUnsafe(stmt)
    }
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

  async migrateAllTenants(): Promise<void> {
    const tenants = await this.db.tenant.findMany({ select: { schema: true } })
    for (const tenant of tenants) {
      await this.provision(tenant.schema)
    }
  }
}
