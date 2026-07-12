import { create } from 'zustand'
import * as api from '../api'
import { TOKEN_STORAGE_KEY } from '../constants/config'
import type { LoginInput, RegisterInput, User } from '../types/auth'

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
}

function storeToken(accessToken: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
}

function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,

  async login(input) {
    const { access_token } = await api.login(input)
    storeToken(access_token)
    const user = await api.getCurrentUser(access_token)
    set({ user })
  },

  async register(input) {
    await api.register(input)
    await get().login(input)
  },

  logout() {
    clearToken()
    set({ user: null })
  },
}))

async function hydrateFromStoredToken() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!token) {
    useAuthStore.setState({ isLoading: false })
    return
  }

  try {
    const user = await api.getCurrentUser(token)
    useAuthStore.setState({ user, isLoading: false })
  } catch {
    clearToken()
    useAuthStore.setState({ user: null, isLoading: false })
  }
}

api.setUnauthorizedHandler(() => {
  clearToken()
  useAuthStore.setState({ user: null })
})

hydrateFromStoredToken()
