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

const fromServer = (r) => ({
  ...r,
  shelfId: r.shelfId ?? r.shelf_id ?? null,
  imageUrl: r.imageUrl ?? r.image_url ?? null,
});

export async function getItem(sku, { signal } = {}) {
  return fromServer(await request(`/items/${encodeURIComponent(sku)}`, { signal }));
}

export function updateItem(sku, patch) {
  return request(`/items/${encodeURIComponent(sku)}`, { method: 'PATCH', body: patch });
}

export function moveItem(sku, shelfId, token) {
  return request(`/items/${encodeURIComponent(sku)}/location`, {
    method: 'PATCH',
    body: { shelfId },
    token,
  });
}