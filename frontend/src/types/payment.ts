export const PAYMENT_TYPES = ['monthly_fair', 'service', 'document', 'fuel', 'other'] as const

export type PaymentType = (typeof PAYMENT_TYPES)[number]

export interface Payment {
  id: string
  type: PaymentType
  associated_maintenance: string | null
  associated_cardocs: string | null
  associated_fuel: string | null
  associated_lease: string | null
  car_id: string
  amount: number
  payment_date: string
  paid_by: string
  paid_to: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface PaymentInput {
  type: PaymentType
  associated_maintenance?: string | null
  associated_cardocs?: string | null
  associated_fuel?: string | null
  associated_lease?: string | null
  car_id: string
  amount: number
  payment_date: string
  paid_by: string
  paid_to: string
  description?: string | null
}
