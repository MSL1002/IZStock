import { request } from './client';

export function getMap(token, { signal } = {}) {
  return request('/map', { token, signal });
}

export function putMap(payload, token) {
  console.log(payload)
  return request('/map', { method: 'PUT', body: payload, token });
}

export function getMapVersion({ signal } = {}) {
  return request('/map/version', { signal });
}