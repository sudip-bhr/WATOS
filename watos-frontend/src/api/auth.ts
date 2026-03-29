import client from './client'
import type { User } from '../types'

export interface LoginResponse {
  access_token: string
  refresh_token: string
}

export const login = async (email: string, password: string): Promise<LoginResponse & { user: User }> => {
  const { data } = await client.post('/auth/login', { email, password })
  // After login, we fetch the user profile
  const { data: user } = await client.get('/users/me', {
    headers: { Authorization: `Bearer ${data.access_token}` }
  })
  return { ...data, user }
}

export const register = async (email: string, full_name: string, password: string) => {
  const { data } = await client.post('/auth/register', { email, full_name, password })
  return data
}
