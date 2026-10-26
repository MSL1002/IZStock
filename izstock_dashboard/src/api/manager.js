import { request } from './client';

// code: the 8-character manager code. Throws INVALID_CODE (401) or RATE_LIMITED (429).
export function unlock(code) {
  return request('/manager/unlock', { method: 'POST', body: { code } });
}

export function lock(token) {
  return request('/manager/lock', { method: 'POST', token });
}