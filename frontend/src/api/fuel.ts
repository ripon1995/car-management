import { request, authHeaders } from './client'
import type { FuelRecord, FuelInput } from '../types/fuel'

export function listFuelRecords(): Promise<FuelRecord[]> {
  return request<FuelRecord[]>('/fuel', { headers: authHeaders() })
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
