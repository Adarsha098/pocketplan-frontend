const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const TOKEN_KEY = 'pocketplan_token'
const DEMO_KEY = 'pocketplan_demo_transactions'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY)

async function request(path, options = {}) {
  const token = getToken()
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || 'Request failed')
  return body
}

export async function checkApi() {
  try { await request('/health'); return true } catch { return false }
}

export async function registerUser(payload) {
  const result = await request('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
  setToken(result.token)
  return result.user
}

export async function loginUser(payload) {
  const result = await request('/auth/login', { method: 'POST', body: JSON.stringify(payload) })
  setToken(result.token)
  return result.user
}

export async function listTransactions() {
  if (getToken()) return request('/transactions')
  // In demo mode, use browser storage if no login token is present.
  return JSON.parse(localStorage.getItem(DEMO_KEY) || '[]')
}

export async function addTransaction(data) {
  if (getToken()) return request('/transactions', { method: 'POST', body: JSON.stringify(data) })
  const current = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]')
  const item = { ...data, _id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  localStorage.setItem(DEMO_KEY, JSON.stringify([item, ...current]))
  return item
}

export async function deleteTransaction(id) {
  if (getToken()) return request(`/transactions/${id}`, { method: 'DELETE' })
  const current = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]')
  localStorage.setItem(DEMO_KEY, JSON.stringify(current.filter(item => item._id !== id)))
}
