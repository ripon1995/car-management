import { request, authHeaders } from './client'
import type { Payment, PaymentInput } from '../types/payment'

export function listPayments(): Promise<Payment[]> {
  return request<Payment[]>('/payments', { headers: authHeaders() })
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
