export interface CarDoc {
  id: string
  name: string
  expiry_date: string
  cost: number
  car_id: string
  created_at: string
  updated_at: string
}

export interface CarDocInput {
  name: string
  expiry_date: string
  cost: number
  car_id: string
}
