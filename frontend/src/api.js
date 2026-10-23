/** Thin fetch wrapper around the studio API (same-origin, cookie session). */

export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function fieldErrorsFrom(detail) {
  if (!Array.isArray(detail)) return {};
  const errors = {};
  for (const item of detail) {
    if (!item || !Array.isArray(item.loc)) continue;
    const field = item.loc[item.loc.length - 1];
    if (!errors[field]) errors[field] = item.msg;
  }
  return errors;
}

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the studio service. Check that the backend is running.', 0);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/login') {
      if (unauthorizedHandler) unauthorizedHandler();
    }
    const detail = payload && payload.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : response.status === 401
          ? 'Email or password is incorrect.'
          : 'Something went wrong. Please try again.';
    throw new ApiError(message, response.status, fieldErrorsFrom(detail));
  }

  return payload;
}

function query(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  session: () => request('/api/auth/session'),
  updateProfile: (payload) => request('/api/members/me', { method: 'PATCH', body: payload }),

  kilns: () => request('/api/kilns'),

  firings: (params) => request(`/api/firings${query(params)}`),
  firing: (id) => request(`/api/firings/${id}`),
  createFiring: (payload) => request('/api/firings', { method: 'POST', body: payload }),
  updateFiring: (id, payload) => request(`/api/firings/${id}`, { method: 'PATCH', body: payload }),
  deleteFiring: (id) => request(`/api/firings/${id}`, { method: 'DELETE' }),

  loadSheets: () => request('/api/load-sheets'),
  loadSheet: (id) => request(`/api/load-sheets/${id}`),
  createLoadSheet: (payload) => request('/api/load-sheets', { method: 'POST', body: payload }),
  updateLoadSheet: (id, payload) => request(`/api/load-sheets/${id}`, { method: 'PATCH', body: payload }),
  deleteLoadSheet: (id) => request(`/api/load-sheets/${id}`, { method: 'DELETE' }),

  glazeTiles: (params) => request(`/api/glaze-tiles${query(params)}`),
  glazeTile: (id) => request(`/api/glaze-tiles/${id}`),
  createGlazeTile: (payload) => request('/api/glaze-tiles', { method: 'POST', body: payload }),
  updateGlazeTile: (id, payload) => request(`/api/glaze-tiles/${id}`, { method: 'PATCH', body: payload }),
  deleteGlazeTile: (id) => request(`/api/glaze-tiles/${id}`, { method: 'DELETE' }),

  dashboardSummary: () => request('/api/dashboard/summary'),
};
