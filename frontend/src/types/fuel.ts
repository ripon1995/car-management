export const FUEL_TYPES = ['octane', 'petrol', 'diesel', 'cng', 'other'] as const

export type FuelType = (typeof FUEL_TYPES)[number]

export interface FuelRecord {
  id: string
  fuel_type: FuelType
  quantity_liters: number
  cost: number
  odometer_reading: number | null
  fuel_station: string
  fuel_date: string
  description: string | null
  car_id: string
  created_at: string
  updated_at: string
}

export interface FuelInput {
  fuel_type: FuelType
  quantity_liters: number
  cost: number
  odometer_reading?: number | null
  fuel_station: string
  fuel_date: string
  description?: string | null
  car_id: string
}
