import { request, authHeaders } from './client'
import type { RevenueFilters, RevenueSummary } from '../types/revenue'

export function getRevenue(filters: RevenueFilters = {}): Promise<RevenueSummary> {
  const params = new URLSearchParams()
  if (filters.carId) params.set('car_id', filters.carId)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  const query = params.toString()
  return request<RevenueSummary>(`/revenue${query ? `?${query}` : ''}`, { headers: authHeaders() })
}
