import type { PaymentStatus } from './payment'

export interface Income {
  id: string
  lease_id: string
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

export interface IncomeInput {
  lease_id: string
  payment_date: string
  paid_by: string
  paid_to: string
  status: PaymentStatus
  description?: string | null
}
