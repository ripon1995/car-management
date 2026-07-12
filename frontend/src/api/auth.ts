import { request } from './client'
import type { LoginInput, RegisterInput, Token, User } from '../types/auth'

export function register(input: RegisterInput): Promise<User> {
  return request<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// Backend login is the standard OAuth2 password flow (form-encoded
// username/password, username = email), not JSON — that's what makes
// Swagger's "Authorize" button work out of the box on the API side too.
export function login(input: LoginInput): Promise<Token> {
  const body = new URLSearchParams({ username: input.email, password: input.password })
  return request<Token>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
}

export function getCurrentUser(token: string): Promise<User> {
  return request<User>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}
