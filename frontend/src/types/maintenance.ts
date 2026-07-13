export const MAINTENANCE_TYPES = ['service', 'battery', 'tyre', 'spare_parts', 'engine_oil'] as const

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number]

export interface MaintenanceRecord {
  id: string
  type: MaintenanceType
  cost: number
  service_place: string
  service_by: string
  description: string | null
  car_id: string
  created_at: string
  updated_at: string
}

export interface MaintenanceInput {
  type: MaintenanceType
  cost: number
  service_place: string
  service_by: string
  description?: string | null
  car_id: string
}
