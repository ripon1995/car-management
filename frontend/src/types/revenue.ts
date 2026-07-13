export interface RevenueTypeBreakdown {
  type: string
  amount: number
}

export interface RevenuePeriodBreakdown {
  period: string
  income: number
  expense: number
  net: number
}

export interface RevenueCarBreakdown {
  car_id: string
  income: number
  expense: number
  net: number
}

export interface RevenueSummary {
  total_income: number
  total_expense: number
  net_revenue: number
  by_type: RevenueTypeBreakdown[]
  by_period: RevenuePeriodBreakdown[]
  by_car: RevenueCarBreakdown[] | null
}

export interface RevenueFilters {
  carId?: string
  from?: string
  to?: string
}
