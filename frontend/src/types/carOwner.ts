export interface CarOwner {
  id: string
  name: string
  phone_number: string
  created_at: string
  updated_at: string
}

export interface CarOwnerInput {
  name: string
  phone_number: string
}
