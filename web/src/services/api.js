/**
 * Centralized API client for DataGrid backend.
 * All HTTP calls to /api/* go through this module.
 *
 * Change the backend URL by setting VITE_API_URL in .env.local
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/**
 * Thin fetch wrapper that:
 *  - Prefixes all paths with the API URL
 *  - Sets Content-Type to JSON automatically for POST/PATCH/PUT
 *  - Parses JSON response
 *  - Throws an Error on non-2xx responses so callers can use try/catch
 */
async function request(path, options = {}) {
  const url = `${API_URL}${path}`
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }

  const response = await fetch(url, { ...options, headers })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = data.error || `Request failed: ${response.status}`
    const err = new Error(message)
    err.status = response.status
    err.details = data.details
    throw err
  }
  return data
}

// ─── Health check ──────────────────────────────────────────────
export const health = {
  check: () => request('/health'),
}

// ─── Pipelines ─────────────────────────────────────────────────
export const pipelines = {
  list: () => request('/api/pipelines'),
  create: (name) => request('/api/pipelines', { method: 'POST', body: JSON.stringify({ name }) }),
  delete: (id) => request(`/api/pipelines/${id}`, { method: 'DELETE' }),
}

// ─── Sources ───────────────────────────────────────────────────
export const sources = {
  list: () => request('/api/sources'),
  create: (name, type) => request('/api/sources', { method: 'POST', body: JSON.stringify({ name, type }) }),
  delete: (id) => request(`/api/sources/${id}`, { method: 'DELETE' }),
}

// ─── Stats ─────────────────────────────────────────────────────
export const stats = {
  global: () => request('/api/stats'),
  user: (userId) => request(`/api/stats/user/${userId}`),
}

// ─── Alerts ────────────────────────────────────────────────────
export const alerts = {
  list: () => request('/api/alerts'),
  resolve: (id) => request(`/api/alerts/${id}/resolve`, { method: 'PATCH' }),
}

// ─── Workspaces ────────────────────────────────────────────────
export const workspaces = {
  list: () => request('/api/workspaces'),
  forUser: (userId) => request(`/api/workspaces/user/${userId}`),
  create: ({ name, userId, email }) =>
    request('/api/workspaces', { method: 'POST', body: JSON.stringify({ name, userId, email }) }),
  members: (workspaceId) => request(`/api/workspaces/${workspaceId}/members`),
  invite: (workspaceId, email) =>
    request(`/api/workspaces/${workspaceId}/invite`, { method: 'POST', body: JSON.stringify({ email }) }),
}

// ─── Usage tracking ────────────────────────────────────────────
export const usage = {
  log: ({ userId, eventType, metadata }) =>
    request('/api/usage', { method: 'POST', body: JSON.stringify({ userId, eventType, metadata }) }),
}

// ─── AI ────────────────────────────────────────────────────────
export const ai = {
  sql: (question) => request('/api/ai/sql', { method: 'POST', body: JSON.stringify({ question }) }),
}

// ─── Default export — grouped namespace ────────────────────────
export const api = {
  health,
  pipelines,
  sources,
  stats,
  alerts,
  workspaces,
  usage,
  ai,
}

export default api
