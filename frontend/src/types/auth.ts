export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface Token {
  access_token: string
  token_type: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
}
