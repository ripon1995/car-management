import { request, authHeaders } from './client'
import type { FuelRecord, FuelInput } from '../types/fuel'

export interface FuelFilters {
  carId?: string
  fuelType?: string
  dateFrom?: string
  dateTo?: string
}

export function listFuelRecords(filters: FuelFilters = {}): Promise<FuelRecord[]> {
  const params = new URLSearchParams()
  if (filters.carId) params.set('car_id', filters.carId)
  if (filters.fuelType) params.set('fuel_type', filters.fuelType)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  const query = params.toString()
  return request<FuelRecord[]>(`/fuel${query ? `?${query}` : ''}`, { headers: authHeaders() })
}

export function createFuelRecord(input: FuelInput): Promise<FuelRecord> {
  return request<FuelRecord>('/fuel', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function updateFuelRecord(id: string, input: FuelInput): Promise<FuelRecord> {
  return request<FuelRecord>(`/fuel/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function deleteFuelRecord(id: string): Promise<void> {
  return request<void>(`/fuel/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}
