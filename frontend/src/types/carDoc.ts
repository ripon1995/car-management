export const DOC_TYPES = ['tax_token', 'fitness', 'route_permit', 'registration_certificate'] as const

export type DocType = (typeof DOC_TYPES)[number]

export interface CarDoc {
  id: string
  doc_type: DocType
  expiry_date: string
  cost: number
  car_id: string
  created_at: string
  updated_at: string
}

export interface CarDocInput {
  doc_type: DocType
  expiry_date: string
  cost: number
  car_id: string
}
