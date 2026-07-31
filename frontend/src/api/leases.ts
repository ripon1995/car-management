import { request, authHeaders } from './client'
import type { DuePayments, Lease, LeaseInput } from '../types/lease'
import type { Income } from '../types/income'

export interface LeaseFilters {
  carId?: string
  vendorId?: string
  active?: boolean
}

export function listLeases(filters: LeaseFilters = {}): Promise<Lease[]> {
  const params = new URLSearchParams()
  if (filters.carId) params.set('car_id', filters.carId)
  if (filters.vendorId) params.set('vendor_id', filters.vendorId)
  if (filters.active !== undefined) params.set('active', String(filters.active))
  const query = params.toString()
  return request<Lease[]>(`/leases${query ? `?${query}` : ''}`, { headers: authHeaders() })
}

export function createLease(input: LeaseInput): Promise<Lease> {
  return request<Lease>('/leases', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function getLease(id: string): Promise<Lease> {
  return request<Lease>(`/leases/${id}`, { headers: authHeaders() })
}

export function updateLease(id: string, input: Partial<LeaseInput>): Promise<Lease> {
  return request<Lease>(`/leases/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function deleteLease(id: string): Promise<void> {
  return request<void>(`/leases/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}

export function getDuePayments(id: string): Promise<DuePayments> {
  return request<DuePayments>(`/leases/${id}/due-payments`, { headers: authHeaders() })
}

export function generateDuePayments(id: string): Promise<Income[]> {
  return request<Income[]>(`/leases/${id}/generate-payments`, {
    method: 'POST',
    headers: authHeaders(),
  })
}
