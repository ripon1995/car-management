export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/+$/, '')

export const TOKEN_STORAGE_KEY = 'car-management.token'
export const THEME_STORAGE_KEY = 'car-management.theme'
