export interface Enrollment {
  id: string
  car_id: string
  vendor_id: string
  monthly_fare: number
  start_date: string
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface EnrollmentInput {
  car_id: string
  vendor_id: string
  monthly_fare: number
  start_date: string
  end_date?: string | null
}

export interface DuePayments {
  due_months: string[]
  generated_months: string[]
}
