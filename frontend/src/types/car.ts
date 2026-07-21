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

// Label used everywhere a Car is picked or displayed by another feature
// (select options, table cells, view modals) — appends the last 4 digits
// of the registration number so cars sharing a brand/model are still easy
// to tell apart at a glance.
export function carDisplayLabel(car: Car): string {
  const nameLabel = `${car.brand} ${car.model_name ?? ''}`.trim()
  if (!car.registration_number) return nameLabel
  return `${nameLabel} (${car.registration_number.slice(-4)})`
}
