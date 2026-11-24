import {request} from './client';

export function listItems({ pg, pgSize, q, aisle }, { signal } = {}) {
  const params = new URLSearchParams({ pg, pgSize });
  if (q) params.set('q', q);
  if (aisle) params.set('aisle', aisle);
  return request(`/items?${params}`, { signal });
}

export function deleteItem(sku) {
    return request(`/items/${encodeURIComponent(sku)}`, { method: 'DELETE' });
}

export function batchDeleteItems(skus) {
  return request('/items/batch-delete', { method: 'POST', body: { skus } });
}

export function createItem(item) {
  return request(`/items`, { method: 'POST', body: item })
}