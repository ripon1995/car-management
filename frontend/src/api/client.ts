import { API_URL, TOKEN_STORAGE_KEY } from '../constants/config'
import { ApiError } from '../errors/api'

export function authHeaders(): HeadersInit {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      unauthorizedHandler?.()
    }
    const body = await response.json().catch(() => null)
    const message = body?.message ?? response.statusText
    const detail = body?.detail ?? message
    throw new ApiError(response.status, message, detail, body?.error_code)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
