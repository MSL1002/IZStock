import {request} from './client';

export function listItems({ page, pageSize, q, aisle }, { signal } = {}) {
  const params = new URLSearchParams({ page, pageSize });
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