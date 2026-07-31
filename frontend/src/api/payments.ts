import { request, authHeaders } from './client'
import type { Payment, PaymentInput } from '../types/payment'

export interface PaymentFilters {
  carId?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  status?: string
}

export function listPayments(filters: PaymentFilters = {}): Promise<Payment[]> {
  const params = new URLSearchParams()
  if (filters.carId) params.set('car_id', filters.carId)
  if (filters.type) params.set('type', filters.type)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  if (filters.status) params.set('status', filters.status)
  const query = params.toString()
  return request<Payment[]>(`/payments${query ? `?${query}` : ''}`, { headers: authHeaders() })
}

export function createPayment(input: PaymentInput): Promise<Payment> {
  return request<Payment>('/payments', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function updatePayment(id: string, input: PaymentInput): Promise<Payment> {
  return request<Payment>(`/payments/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function deletePayment(id: string): Promise<void> {
  return request<void>(`/payments/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}
