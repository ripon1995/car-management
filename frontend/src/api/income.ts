import { request, authHeaders } from './client'
import type { Income, IncomeInput } from '../types/income'

export interface IncomeFilters {
  carId?: string
  leaseId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export function listIncome(filters: IncomeFilters = {}): Promise<Income[]> {
  const params = new URLSearchParams()
  if (filters.carId) params.set('car_id', filters.carId)
  if (filters.leaseId) params.set('lease_id', filters.leaseId)
  if (filters.status) params.set('status', filters.status)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  const query = params.toString()
  return request<Income[]>(`/income${query ? `?${query}` : ''}`, { headers: authHeaders() })
}

export function createIncome(input: IncomeInput): Promise<Income> {
  return request<Income>('/income', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function getIncome(id: string): Promise<Income> {
  return request<Income>(`/income/${id}`, { headers: authHeaders() })
}

export function updateIncome(id: string, input: Partial<IncomeInput>): Promise<Income> {
  return request<Income>(`/income/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function deleteIncome(id: string): Promise<void> {
  return request<void>(`/income/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}
