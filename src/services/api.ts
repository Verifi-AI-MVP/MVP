export const AUTH_EXPIRED_EVENT = 'verifi:auth-expired'

const getToken = () => localStorage.getItem('accessToken')

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })
  if (res.status === 401) {
    localStorage.removeItem('accessToken')
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T = unknown>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string) => request<T>(path, { method: 'DELETE' }),
}
