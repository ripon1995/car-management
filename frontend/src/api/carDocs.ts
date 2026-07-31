import { request, authHeaders } from './client'
import type { CarDoc, CarDocInput } from '../types/carDoc'

export interface CarDocFilters {
  carId?: string
  docType?: string
  dateFrom?: string
  dateTo?: string
}

export function listCarDocs(filters: CarDocFilters = {}): Promise<CarDoc[]> {
  const params = new URLSearchParams()
  if (filters.carId) params.set('car_id', filters.carId)
  if (filters.docType) params.set('doc_type', filters.docType)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  const query = params.toString()
  return request<CarDoc[]>(`/car-docs${query ? `?${query}` : ''}`, { headers: authHeaders() })
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
