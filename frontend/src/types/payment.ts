export const PAYMENT_TYPES = ['service', 'document', 'fuel', 'other'] as const
export const MANUAL_PAYMENT_TYPES = ['other'] as const
export const PAYMENT_STATUSES = ['paid', 'unpaid'] as const
export const PAID_BY_METHODS = ['EBL', 'DBBL', 'UCB', 'CASH'] as const

export type PaymentType = (typeof PAYMENT_TYPES)[number]
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export interface Payment {
  id: string
  type: PaymentType
  associated_maintenance: string | null
  associated_cardocs: string | null
  associated_fuel: string | null
  car_id: string
  amount: number
  payment_date: string
  paid_by: string
  paid_to: string
  status: PaymentStatus
  description: string | null
  created_at: string
  updated_at: string
}

export interface PaymentInput {
  type: PaymentType
  associated_maintenance?: string | null
  associated_cardocs?: string | null
  associated_fuel?: string | null
  car_id: string
  amount: number
  payment_date: string
  paid_by: string
  paid_to: string
  status: PaymentStatus
  description?: string | null
}
