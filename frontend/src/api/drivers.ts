import { request, authHeaders } from './client'
import type { Driver, DriverInput } from '../types/driver'

export function listDrivers(): Promise<Driver[]> {
  return request<Driver[]>('/drivers', { headers: authHeaders() })
}

export function createDriver(input: DriverInput): Promise<Driver> {
  return request<Driver>('/drivers', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function updateDriver(id: string, input: DriverInput): Promise<Driver> {
  return request<Driver>(`/drivers/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function deleteDriver(id: string): Promise<void> {
  return request<void>(`/drivers/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}
