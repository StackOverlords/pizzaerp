export type Locale = 'es' | 'en'

const translations: Record<string, Record<Locale, string>> = {
  // Auth
  'Invalid credentials': {
    en: 'Invalid credentials',
    es: 'Credenciales inválidas',
  },
  'Incorrect admin PIN': {
    en: 'Incorrect admin PIN',
    es: 'PIN de administrador incorrecto',
  },
  'Admin has no PIN configured': {
    en: 'Admin has no PIN configured',
    es: 'El administrador no tiene PIN configurado',
  },
  'PIN must be 4 to 6 numeric digits': {
    en: 'PIN must be 4 to 6 numeric digits',
    es: 'El PIN debe ser de 4 a 6 dígitos numéricos',
  },
  'Invalid or expired refresh token': {
    en: 'Invalid or expired refresh token',
    es: 'Token de refresco inválido o expirado',
  },
  'Invalid token type': {
    en: 'Invalid token type',
    es: 'Tipo de token inválido',
  },
  'Subscription not found': {
    en: 'Subscription not found',
    es: 'Suscripción no encontrada',
  },
  // Generic
  'Unauthorized': {
    en: 'Unauthorized',
    es: 'No autorizado',
  },
  'Forbidden': {
    en: 'Forbidden',
    es: 'Sin permisos',
  },
  'Resource not found': {
    en: 'Resource not found',
    es: 'Recurso no encontrado',
  },
  'Internal server error': {
    en: 'Internal server error',
    es: 'Error interno del servidor',
  },
  // Tenant / Setup
  'Tenant not found': {
    en: 'Tenant not found',
    es: 'Negocio no encontrado',
  },
  'Setup already completed': {
    en: 'Setup already completed',
    es: 'La configuración ya fue completada',
  },
  // Users
  'User not found': {
    en: 'User not found',
    es: 'Usuario no encontrado',
  },
  'Admin not found': {
    en: 'Admin not found',
    es: 'Administrador no encontrado',
  },
  // Branches
  'Branch not found': {
    en: 'Branch not found',
    es: 'Sucursal no encontrada',
  },
  'Branch does not belong to this tenant': {
    en: 'Branch does not belong to this tenant',
    es: 'La sucursal no pertenece a este negocio',
  },
  'Destination branch must differ from origin branch': {
    en: 'Destination branch must differ from origin branch',
    es: 'La sucursal destino debe ser diferente a la sucursal origen',
  },
  'Only the destination branch can confirm receipt': {
    en: 'Only the destination branch can confirm receipt',
    es: 'Solo la sucursal destino puede confirmar la recepción',
  },
  // Shifts
  'An open shift already exists for this cashier at this branch': {
    en: 'An open shift already exists for this cashier at this branch',
    es: 'Ya existe un turno abierto para este cajero en esta sucursal',
  },
  'No open shift for this cashier at this branch': {
    en: 'No open shift for this cashier at this branch',
    es: 'No hay turno abierto para este cajero en esta sucursal',
  },
  'No open shift to close': {
    en: 'No open shift to close',
    es: 'No hay turno abierto para cerrar',
  },
  'Shift is already closed': {
    en: 'Shift is already closed',
    es: 'El turno ya está cerrado',
  },
  // Orders
  'Order must have at least one item': {
    en: 'Order must have at least one item',
    es: 'El pedido debe tener al menos un ítem',
  },
  'Each item quantity must be >= 1': {
    en: 'Each item quantity must be >= 1',
    es: 'La cantidad de cada ítem debe ser >= 1',
  },
  'Discount cannot exceed order total': {
    en: 'Discount cannot exceed order total',
    es: 'El descuento no puede superar el total del pedido',
  },
  'Discount value must be greater than 0': {
    en: 'Discount value must be greater than 0',
    es: 'El valor del descuento debe ser mayor a 0',
  },
  'Percentage cannot exceed 100%': {
    en: 'Percentage cannot exceed 100%',
    es: 'El porcentaje no puede superar el 100%',
  },
  'A note is required when reason is other': {
    en: 'A note is required when reason is "other"',
    es: 'Se requiere una nota cuando el motivo es "otro"',
  },
  // Menu
  'Category not found': {
    en: 'Category not found',
    es: 'Categoría no encontrada',
  },
  'Category is already inactive': {
    en: 'Category is already inactive',
    es: 'La categoría ya está inactiva',
  },
  'Dish not found': {
    en: 'Dish not found',
    es: 'Plato no encontrado',
  },
  'Dish is already inactive': {
    en: 'Dish is already inactive',
    es: 'El plato ya está inactivo',
  },
  'Dish is already an option for this slot': {
    en: 'Dish is already an option for this slot',
    es: 'El plato ya es una opción para este slot',
  },
  'Combo not found': {
    en: 'Combo not found',
    es: 'Combo no encontrado',
  },
  'Combo is already inactive': {
    en: 'Combo is already inactive',
    es: 'El combo ya está inactivo',
  },
  'Slot not found': {
    en: 'Slot not found',
    es: 'Slot no encontrado',
  },
  'Option not found': {
    en: 'Option not found',
    es: 'Opción no encontrada',
  },
  // Ingredients
  'Ingredient not found': {
    en: 'Ingredient not found',
    es: 'Ingrediente no encontrado',
  },
  'Ingredient is already inactive': {
    en: 'Ingredient is already inactive',
    es: 'El ingrediente ya está inactivo',
  },
  'Ingredient is already associated with this dish': {
    en: 'Ingredient is already associated with this dish',
    es: 'El ingrediente ya está asociado a este plato',
  },
  'Association not found': {
    en: 'Association not found',
    es: 'Asociación no encontrada',
  },
  // Supply types
  'Supply type not found': {
    en: 'Supply type not found',
    es: 'Tipo de insumo no encontrado',
  },
  'Supply type is already inactive': {
    en: 'Supply type is already inactive',
    es: 'El tipo de insumo ya está inactivo',
  },
  'Supply type name is required': {
    en: 'Supply type name is required',
    es: 'El nombre del tipo de insumo es requerido',
  },
  // Supply transfers
  'Transfer has already been received or is not in transit': {
    en: 'Transfer has already been received or is not in transit',
    es: 'El envío ya fue recibido o no está en tránsito',
  },
  'Sent quantity must be greater than 0': {
    en: 'Sent quantity must be greater than 0',
    es: 'La cantidad enviada debe ser mayor a 0',
  },
  'An observation is required when sent and received quantities differ': {
    en: 'An observation is required when sent and received quantities differ',
    es: 'Se requiere una observación cuando hay diferencia entre lo enviado y lo recibido',
  },
  // Supply closings & wastages
  'Physical count cannot be negative': {
    en: 'Physical count cannot be negative',
    es: 'El conteo físico no puede ser negativo',
  },
  'An observation is required when physical and theoretical counts differ': {
    en: 'An observation is required when physical and theoretical counts differ',
    es: 'Se requiere una observación cuando hay diferencia entre el conteo físico y el teórico',
  },
  'An observation is required when there is a balance discrepancy': {
    en: 'An observation is required when there is a balance discrepancy',
    es: 'Se requiere una observación cuando hay diferencia en el cuadre',
  },
  'Sold quantity cannot be negative': {
    en: 'Sold quantity cannot be negative',
    es: 'La cantidad vendida no puede ser negativa',
  },
  'Quantity must be greater than 0': {
    en: 'Quantity must be greater than 0',
    es: 'La cantidad debe ser mayor a 0',
  },
  // Supply
  'Must confirm at least one dough type': {
    en: 'Must confirm at least one supply type',
    es: 'Debe confirmar al menos un tipo de insumo',
  },
  'Must include at least one dough type': {
    en: 'Must include at least one supply type',
    es: 'Debe incluir al menos un tipo de insumo',
  },
  // Numeric validations (from Zod / domain)
  'baseQuantity must be greater than 0': {
    en: 'Base quantity must be greater than 0',
    es: 'La cantidad base debe ser mayor a 0',
  },
  'conversionFactor must be greater than 0': {
    en: 'Conversion factor must be greater than 0',
    es: 'El factor de conversión debe ser mayor a 0',
  },
  'salePrice must be greater than 0': {
    en: 'Sale price must be greater than 0',
    es: 'El precio de venta debe ser mayor a 0',
  },
  'wastagePercentage must be between 0 and 100': {
    en: 'Wastage percentage must be between 0 and 100',
    es: 'El porcentaje de merma debe estar entre 0 y 100',
  },
  'declaredCash must be >= 0': {
    en: 'Declared cash must be >= 0',
    es: 'El efectivo declarado debe ser >= 0',
  },
  'declaredQrCount must be >= 0': {
    en: 'Declared QR count must be >= 0',
    es: 'El conteo de QR declarado debe ser >= 0',
  },
  'initialCash must be >= 0': {
    en: 'Initial cash must be >= 0',
    es: 'El efectivo inicial debe ser >= 0',
  },
}

export function translateMessage(message: string, locale: Locale): string {
  return translations[message]?.[locale] ?? message
}
