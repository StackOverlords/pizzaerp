import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { TenantSchemaService } from '../src/infrastructure/database/tenant-schema.service'

const prisma = new PrismaClient()
const tenantSchemaService = new TenantSchemaService(prisma)

// IDs fijos para idempotencia: el seed puede correr N veces sin duplicar datos
const INGREDIENT_IDS = {
  masa:        'ing-masa-pizza',
  salsa:       'ing-salsa-tomate',
  queso:       'ing-queso-mozzarella',
  jamon:       'ing-jamon',
  pepperoni:   'ing-pepperoni',
  champinones: 'ing-champinones',
  cebolla:     'ing-cebolla',
  pimiento:    'ing-pimiento',
}

const CATEGORY_IDS = {
  pizzas:   'cat-pizzas',
  bebidas:  'cat-bebidas',
  postres:  'cat-postres',
}

const DISH_IDS = {
  margarita: 'dish-pizza-margarita',
  hawaiana:  'dish-pizza-hawaiana',
  pepperoni: 'dish-pizza-pepperoni',
  refresco:  'dish-refresco',
  brownie:   'dish-brownie',
}

async function seedIngredients(s: string) {
  const ingredients = [
    { id: INGREDIENT_IDS.masa,        name: 'Masa de pizza',      purchase_unit: 'kg', consumption_unit: 'kg', conversion_factor: 1, wastage_percentage: 5 },
    { id: INGREDIENT_IDS.salsa,       name: 'Salsa de tomate',    purchase_unit: 'kg', consumption_unit: 'kg', conversion_factor: 1, wastage_percentage: 3 },
    { id: INGREDIENT_IDS.queso,       name: 'Queso mozzarella',   purchase_unit: 'kg', consumption_unit: 'kg', conversion_factor: 1, wastage_percentage: 2 },
    { id: INGREDIENT_IDS.jamon,       name: 'Jamón',              purchase_unit: 'kg', consumption_unit: 'kg', conversion_factor: 1, wastage_percentage: 2 },
    { id: INGREDIENT_IDS.pepperoni,   name: 'Pepperoni',          purchase_unit: 'kg', consumption_unit: 'kg', conversion_factor: 1, wastage_percentage: 2 },
    { id: INGREDIENT_IDS.champinones, name: 'Champiñones',        purchase_unit: 'kg', consumption_unit: 'kg', conversion_factor: 1, wastage_percentage: 10 },
    { id: INGREDIENT_IDS.cebolla,     name: 'Cebolla',            purchase_unit: 'kg', consumption_unit: 'kg', conversion_factor: 1, wastage_percentage: 5 },
    { id: INGREDIENT_IDS.pimiento,    name: 'Pimiento',           purchase_unit: 'kg', consumption_unit: 'kg', conversion_factor: 1, wastage_percentage: 5 },
  ]

  for (const ing of ingredients) {
    await prisma.$queryRawUnsafe(
      `INSERT INTO "${s}".ingredients
         (id, name, purchase_unit, consumption_unit, conversion_factor, wastage_percentage)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      ing.id, ing.name, ing.purchase_unit, ing.consumption_unit, ing.conversion_factor, ing.wastage_percentage,
    )
  }
}

async function seedCategories(s: string) {
  const categories = [
    { id: CATEGORY_IDS.pizzas,  name: 'Pizzas',  order_index: 1 },
    { id: CATEGORY_IDS.bebidas, name: 'Bebidas', order_index: 2 },
    { id: CATEGORY_IDS.postres, name: 'Postres', order_index: 3 },
  ]

  for (const cat of categories) {
    await prisma.$queryRawUnsafe(
      `INSERT INTO "${s}".categories (id, name, order_index)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      cat.id, cat.name, cat.order_index,
    )
  }
}

async function seedDishes(s: string) {
  const dishes = [
    { id: DISH_IDS.margarita, category_id: CATEGORY_IDS.pizzas,  name: 'Pizza Margarita',  sale_price: 100 },
    { id: DISH_IDS.hawaiana,  category_id: CATEGORY_IDS.pizzas,  name: 'Pizza Hawaiana',   sale_price: 120 },
    { id: DISH_IDS.pepperoni, category_id: CATEGORY_IDS.pizzas,  name: 'Pizza Pepperoni',  sale_price: 130 },
    { id: DISH_IDS.refresco,  category_id: CATEGORY_IDS.bebidas, name: 'Refresco',          sale_price: 30  },
    { id: DISH_IDS.brownie,   category_id: CATEGORY_IDS.postres, name: 'Brownie',           sale_price: 50  },
  ]

  for (const dish of dishes) {
    await prisma.$queryRawUnsafe(
      `INSERT INTO "${s}".dishes (id, category_id, name, sale_price)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      dish.id, dish.category_id, dish.name, dish.sale_price,
    )
  }
}

async function seedDishIngredients(s: string) {
  // IDs fijos para dish_ingredients de Pizza Margarita
  const dishIngredients = [
    { id: 'di-margarita-masa',      dish_id: DISH_IDS.margarita, ingredient_id: INGREDIENT_IDS.masa,        behavior: 'INCLUDED', base_quantity: 1, extra_cost: 0    },
    { id: 'di-margarita-salsa',     dish_id: DISH_IDS.margarita, ingredient_id: INGREDIENT_IDS.salsa,       behavior: 'INCLUDED', base_quantity: 1, extra_cost: 0    },
    { id: 'di-margarita-queso',     dish_id: DISH_IDS.margarita, ingredient_id: INGREDIENT_IDS.queso,       behavior: 'INCLUDED', base_quantity: 1, extra_cost: 0    },
    { id: 'di-margarita-cebolla',   dish_id: DISH_IDS.margarita, ingredient_id: INGREDIENT_IDS.cebolla,     behavior: 'OPTIONAL', base_quantity: 1, extra_cost: 0    },
    { id: 'di-margarita-jamon',     dish_id: DISH_IDS.margarita, ingredient_id: INGREDIENT_IDS.jamon,       behavior: 'EXTRA',    base_quantity: 1, extra_cost: 15   },
    { id: 'di-margarita-pepperoni', dish_id: DISH_IDS.margarita, ingredient_id: INGREDIENT_IDS.pepperoni,   behavior: 'EXTRA',    base_quantity: 1, extra_cost: 15   },
    { id: 'di-margarita-champ',     dish_id: DISH_IDS.margarita, ingredient_id: INGREDIENT_IDS.champinones, behavior: 'EXTRA',    base_quantity: 1, extra_cost: 10   },
  ]

  for (const di of dishIngredients) {
    await prisma.$queryRawUnsafe(
      `INSERT INTO "${s}".dish_ingredients (id, dish_id, ingredient_id, behavior, base_quantity, extra_cost)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      di.id, di.dish_id, di.ingredient_id, di.behavior, di.base_quantity, di.extra_cost,
    )
  }
}

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12)

  const plan = await prisma.plan.upsert({
    where: { name: 'Licencia' },
    update: {},
    create: { name: 'Licencia', maxBranches: null, maxUsers: null },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'fooderp' },
    update: {},
    create: {
      name: 'FoodERP Demo',
      slug: 'fooderp',
      schema: 'fooderp',
      status: 'ACTIVE',
      subscription: {
        create: { planId: plan.id, status: 'ACTIVE' },
      },
    },
  })

  await tenantSchemaService.provision(tenant.schema)

  const branch = await prisma.branch.upsert({
    where: { id: 'branch-fooderp-central' },
    update: {},
    create: { id: 'branch-fooderp-central', name: 'Sucursal Central', tenantId: tenant.id },
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

  const s = tenant.schema

  await seedIngredients(s)
  await seedCategories(s)
  await seedDishes(s)
  await seedDishIngredients(s)

  console.log('Seed OK')
  console.log(`  tenantId:  ${tenant.id}`)
  console.log(`  schema:    ${s}`)
  console.log('  username:  admin')
  console.log('  password:  admin123')
  console.log('  categorías: Pizzas, Bebidas, Postres')
  console.log('  platillos:  Pizza Margarita, Pizza Hawaiana, Pizza Pepperoni, Refresco, Brownie')
  console.log('  ingredientes: 8 (con dish_ingredients para Pizza Margarita)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
