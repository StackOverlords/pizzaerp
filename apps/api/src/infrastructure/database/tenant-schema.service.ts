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

  `CREATE TABLE IF NOT EXISTS "${s}".cash_movements (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shift_id            TEXT NOT NULL REFERENCES "${s}".shifts(id),
    type                TEXT NOT NULL CHECK (type IN ('INGRESO', 'RETIRO')),
    amount              NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    reason              TEXT NOT NULL,
    created_by_user_id  TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_cash_movements_shift_created
  ON "${s}".cash_movements (shift_id, created_at DESC)`,

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

  // Índices compuestos para consultas paginadas de pedidos
  `CREATE INDEX IF NOT EXISTS idx_orders_branch_created
  ON "${s}".orders (branch_id, created_at DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_orders_shift_created
  ON "${s}".orders (shift_id, created_at DESC)`,

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

  // ─── TIPOS DE INSUMO ──────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS "${s}".supply_types (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name       TEXT NOT NULL UNIQUE,
    active     BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // ─── TRANSFERENCIAS DE INSUMOS ────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS "${s}".supply_transfers (
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

  `CREATE TABLE IF NOT EXISTS "${s}".supply_transfer_items (
    id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    transfer_id       TEXT NOT NULL REFERENCES "${s}".supply_transfers(id),
    supply_type       TEXT NOT NULL,
    quantity_sent     INT NOT NULL,
    quantity_received INT,
    notes             TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".supply_wastages (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    branch_id   TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    supply_type TEXT NOT NULL,
    quantity    INT NOT NULL,
    reason      TEXT NOT NULL,
    notes       TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "${s}".supply_day_closures (
    id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    branch_id             TEXT NOT NULL,
    closure_date          DATE NOT NULL,
    supply_type           TEXT NOT NULL,
    initial_count         INT NOT NULL,
    sold_count            INT NOT NULL,
    wastage_count         INT NOT NULL,
    theoretical_remaining INT NOT NULL,
    actual_remaining      INT NOT NULL,
    difference            INT NOT NULL,
    notes                 TEXT,
    closed_by_user_id     TEXT NOT NULL,
    closed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (branch_id, closure_date, supply_type)
  )`,

  // Migración idempotente para tenants existentes: renombrar tablas y columnas
  // (solo ejecuta si el origen existe y el destino todavía no)
  `DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='${s}' AND table_name='dough_transfers')
        AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='${s}' AND table_name='supply_transfers')
     THEN EXECUTE 'ALTER TABLE "${s}".dough_transfers RENAME TO supply_transfers'; END IF;
   END $$`,
  `DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='${s}' AND table_name='dough_transfer_items')
        AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='${s}' AND table_name='supply_transfer_items')
     THEN EXECUTE 'ALTER TABLE "${s}".dough_transfer_items RENAME TO supply_transfer_items'; END IF;
   END $$`,
  `DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='${s}' AND table_name='dough_wastages')
        AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='${s}' AND table_name='supply_wastages')
     THEN EXECUTE 'ALTER TABLE "${s}".dough_wastages RENAME TO supply_wastages'; END IF;
   END $$`,
  `DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='${s}' AND table_name='dough_day_closures')
        AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='${s}' AND table_name='supply_day_closures')
     THEN EXECUTE 'ALTER TABLE "${s}".dough_day_closures RENAME TO supply_day_closures'; END IF;
   END $$`,
  `DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='${s}' AND table_name='supply_transfer_items' AND column_name='dough_type') THEN
       EXECUTE 'ALTER TABLE "${s}".supply_transfer_items RENAME COLUMN dough_type TO supply_type';
     END IF;
   END $$`,
  `DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='${s}' AND table_name='supply_wastages' AND column_name='dough_type') THEN
       EXECUTE 'ALTER TABLE "${s}".supply_wastages RENAME COLUMN dough_type TO supply_type';
     END IF;
   END $$`,
  `DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='${s}' AND table_name='supply_day_closures' AND column_name='dough_type') THEN
       EXECUTE 'ALTER TABLE "${s}".supply_day_closures RENAME COLUMN dough_type TO supply_type';
     END IF;
   END $$`,

  // Migración idempotente: ON DELETE SET NULL en dish_ingredient_id de order_item_extras
  `ALTER TABLE IF EXISTS "${s}".order_item_extras
     DROP CONSTRAINT IF EXISTS order_item_extras_dish_ingredient_id_fkey`,
  `ALTER TABLE IF EXISTS "${s}".order_item_extras
     ADD CONSTRAINT order_item_extras_dish_ingredient_id_fkey
     FOREIGN KEY (dish_ingredient_id) REFERENCES "${s}".dish_ingredients(id) ON DELETE SET NULL`,

  // Migración idempotente: ON DELETE SET NULL en dish_ingredient_id de order_item_exclusions
  `ALTER TABLE IF EXISTS "${s}".order_item_exclusions
     DROP CONSTRAINT IF EXISTS order_item_exclusions_dish_ingredient_id_fkey`,
  `ALTER TABLE IF EXISTS "${s}".order_item_exclusions
     ADD CONSTRAINT order_item_exclusions_dish_ingredient_id_fkey
     FOREIGN KEY (dish_ingredient_id) REFERENCES "${s}".dish_ingredients(id) ON DELETE SET NULL`,

  // ─── CONFIGURACIÓN DEL TENANT ────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS "${s}".tenant_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,

  `INSERT INTO "${s}".tenant_settings (key, value) VALUES
    ('require_pin_for_cancel',   'true'),
    ('require_pin_for_discount', 'true'),
    ('blind_close_enabled',      'true')
   ON CONFLICT (key) DO NOTHING`,
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
