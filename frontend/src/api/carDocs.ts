import { request, authHeaders } from './client'
import type { CarDoc, CarDocInput } from '../types/carDoc'

export function listCarDocs(): Promise<CarDoc[]> {
  return request<CarDoc[]>('/car-docs', { headers: authHeaders() })
}

export function createCarDoc(input: CarDocInput): Promise<CarDoc> {
  return request<CarDoc>('/car-docs', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function updateCarDoc(id: string, input: CarDocInput): Promise<CarDoc> {
  return request<CarDoc>(`/car-docs/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function deleteCarDoc(id: string): Promise<void> {
  return request<void>(`/car-docs/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}
