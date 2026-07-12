import { request, authHeaders } from './client'
import type { CarOwner, CarOwnerInput } from '../types/carOwner'

export function listCarOwners(): Promise<CarOwner[]> {
  return request<CarOwner[]>('/car-owners', { headers: authHeaders() })
}

export function createCarOwner(input: CarOwnerInput): Promise<CarOwner> {
  return request<CarOwner>('/car-owners', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function updateCarOwner(id: string, input: CarOwnerInput): Promise<CarOwner> {
  return request<CarOwner>(`/car-owners/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function deleteCarOwner(id: string): Promise<void> {
  return request<void>(`/car-owners/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}
