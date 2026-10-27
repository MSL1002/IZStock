const BASE_URL = import.meta.env.API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor({ status, code, message, details = [] }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;   // HTTP status, or 0 for network failures
    this.code = code;       // 'STALE_VERSION', 'NOT_FOUND', 'NETWORK', ...
    this.details = details;
  }
}

export async function request(path, { method = 'GET', body, token, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;   // let callers cancel quietly
    throw new ApiError({
      status: 0,
      code: 'NETWORK',
      message: 'Could not reach the server. Check your connection and try again.',
    });
  }

  // 204 has no body
  if (res.status === 204) return null;

  // Parse defensively: a proxy or crash can return non-JSON
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* leave null */
  }

  if (!res.ok) {
    const e = data?.error;
    throw new ApiError({
      status: res.status,
      code: e?.code ?? 'UNKNOWN',
      message: e?.message ?? `Request failed (${res.status}).`,
      details: e?.details ?? [],
    });
  }

  return data;
}