export interface Car {
  id: string
  brand: string
  model_name: string | null
  model_year: number
  registration_number: string | null
  engine_number: string
  chassis_number: string
  tyre_size: string
  owner_id: string
  vendor_id: string | null
  driver_id: string | null
  created_at: string
  updated_at: string
}

export interface CarInput {
  brand: string
  model_name?: string | null
  model_year: number
  registration_number?: string | null
  engine_number: string
  chassis_number: string
  tyre_size: string
  owner_id: string
  vendor_id?: string | null
  driver_id?: string | null
}
