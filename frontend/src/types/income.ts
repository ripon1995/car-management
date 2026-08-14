import type { PaymentStatus } from './payment'

export interface Income {
  id: string
  lease_id: string
  car_id: string
  amount: number
  // The rent month this row covers — fixed at creation, unrelated to payment_date (the actual
  // date the money moved). Use this, not payment_date, to bucket a row into a calendar month.
  period: string
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
