import { request, authHeaders } from './client'
import type { Car, CarInput } from '../types/car'

export function listCars(): Promise<Car[]> {
  return request<Car[]>('/cars', { headers: authHeaders() })
}

export function createCar(input: CarInput): Promise<Car> {
  return request<Car>('/cars', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function updateCar(id: string, input: CarInput): Promise<Car> {
  return request<Car>(`/cars/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
}

export function deleteCar(id: string): Promise<void> {
  return request<void>(`/cars/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}
