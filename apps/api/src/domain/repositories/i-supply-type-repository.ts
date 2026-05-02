import type { SupplyType } from '../entities/supply-type'

export interface CreateSupplyTypeData {
  name: string
}

export interface UpdateSupplyTypeData {
  name: string
}

export interface ISupplyTypeRepository {
  findById(id: string): Promise<SupplyType | null>
  findByName(name: string): Promise<SupplyType | null>
  list(): Promise<SupplyType[]>
  listActive(): Promise<SupplyType[]>
  create(data: CreateSupplyTypeData): Promise<SupplyType>
  update(id: string, data: UpdateSupplyTypeData): Promise<SupplyType>
  deactivate(id: string): Promise<SupplyType>
}
