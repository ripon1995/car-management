import { request, authHeaders } from './client'
import type { MaintenanceRecord, MaintenanceInput } from '../types/maintenance'

export function listMaintenance(): Promise<MaintenanceRecord[]> {
  return request<MaintenanceRecord[]>('/maintenance', { headers: authHeaders() })
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
