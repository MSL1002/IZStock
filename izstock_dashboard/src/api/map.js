import { request } from './client';

// Manager view: loads the map into the editor.
// Expected: { version, units, sections, shelfItemCounts }
// Throws ApiError: NOT_FOUND (no map yet), FORBIDDEN (token missing/expired)
export function getMap(token, { signal } = {}) {
  return request('/map', { token, signal });
}

// Saves a new map version.
// payload: { storeId, editedBy, editedAt, baseVersion, units, sections }
// Expected: { version }
// Throws ApiError: FORBIDDEN, STALE_VERSION, VALIDATION_FAILED,
//                  DUPLICATE_AISLE_NUMBER, SHELVES_IN_USE
export function putMap(payload, token) {
  return request('/map', { method: 'PUT', body: payload, token });
}

// Cheap staleness check (public, no token).
export function getMapVersion({ signal } = {}) {
  return request('/map/version', { signal });
}