import { request, authHeaders } from './client'
import type { MaintenanceRecord, MaintenanceInput } from '../types/maintenance'

export interface MaintenanceFilters {
  carId?: string
  type?: string
  dateFrom?: string
  dateTo?: string
}

export function listMaintenance(filters: MaintenanceFilters = {}): Promise<MaintenanceRecord[]> {
  const params = new URLSearchParams()
  if (filters.carId) params.set('car_id', filters.carId)
  if (filters.type) params.set('type', filters.type)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  const query = params.toString()
  return request<MaintenanceRecord[]>(`/maintenance${query ? `?${query}` : ''}`, {
    headers: authHeaders(),
  })
}

export function createMaintenance(input: MaintenanceInput): Promise<MaintenanceRecord> {
  return request<MaintenanceRecord>('/maintenance', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function updateMaintenance(id: string, input: MaintenanceInput): Promise<MaintenanceRecord> {
  return request<MaintenanceRecord>(`/maintenance/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function deleteMaintenance(id: string): Promise<void> {
  return request<void>(`/maintenance/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}
