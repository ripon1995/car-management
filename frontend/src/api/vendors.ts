import { request, authHeaders } from './client'
import type { Vendor, VendorInput } from '../types/vendor'

export function listVendors(): Promise<Vendor[]> {
  return request<Vendor[]>('/vendors', { headers: authHeaders() })
}

export function createVendor(input: VendorInput): Promise<Vendor> {
  return request<Vendor>('/vendors', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function updateVendor(id: string, input: VendorInput): Promise<Vendor> {
  return request<Vendor>(`/vendors/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function deleteVendor(id: string): Promise<void> {
  return request<void>(`/vendors/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}
