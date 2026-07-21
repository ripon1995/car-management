import { request, authHeaders } from './client'
import type { DuePayments, Enrollment, EnrollmentInput } from '../types/enrollment'
import type { Payment } from '../types/payment'

export interface EnrollmentFilters {
  carId?: string
  vendorId?: string
  active?: boolean
}

export function listEnrollments(filters: EnrollmentFilters = {}): Promise<Enrollment[]> {
  const params = new URLSearchParams()
  if (filters.carId) params.set('car_id', filters.carId)
  if (filters.vendorId) params.set('vendor_id', filters.vendorId)
  if (filters.active !== undefined) params.set('active', String(filters.active))
  const query = params.toString()
  return request<Enrollment[]>(`/enrollments${query ? `?${query}` : ''}`, { headers: authHeaders() })
}

export function createEnrollment(input: EnrollmentInput): Promise<Enrollment> {
  return request<Enrollment>('/enrollments', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function getEnrollment(id: string): Promise<Enrollment> {
  return request<Enrollment>(`/enrollments/${id}`, { headers: authHeaders() })
}

export function updateEnrollment(
  id: string,
  input: Partial<EnrollmentInput>
): Promise<Enrollment> {
  return request<Enrollment>(`/enrollments/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function deleteEnrollment(id: string): Promise<void> {
  return request<void>(`/enrollments/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}

export function getDuePayments(id: string): Promise<DuePayments> {
  return request<DuePayments>(`/enrollments/${id}/due-payments`, { headers: authHeaders() })
}

export function generateDuePayments(id: string): Promise<Payment[]> {
  return request<Payment[]>(`/enrollments/${id}/generate-payments`, {
    method: 'POST',
    headers: authHeaders(),
  })
}
