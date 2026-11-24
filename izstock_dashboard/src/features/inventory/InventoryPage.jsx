// src/features/inventory/InventoryPage.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Pagination, Spinner, Table } from 'react-bootstrap';
import { batchDeleteItems, deleteItem } from '../../api/items';
import { useDebouncedValue } from '../../hooks/useDebounceValue';
import { useItems } from './useItems';
import ConfirmDeleteModal from './ConfirmDeleteModal';

const PAGE_SIZE = 15;

export default function InventoryPage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [pg, setPage] = useState(1);
  const { items, total, loading, error, refresh } = useItems({ q, pg, pgSize: PAGE_SIZE });

  console.log('render', pg)

  const [selected, setSelected] = useState(() => new Set()); // SKUs
  const [pending, setPending] = useState([]);                // [{ sku, name }] awaiting confirmation
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // new search starts at page 1 and clears the selection, so you can never
  // batch-delete items that are no longer visible in the list.
  useEffect(() => { setPage(1); setSelected(new Set()); }, [q]);

  // deleting the last item on the last page leaves an empty page, so step back.
  useEffect(() => { if (pg > totalPages) setPage(totalPages); }, [pg, totalPages]);

  /* ---------- selection ---------- */

  const pageSkus = useMemo(() => items.map((i) => i.sku), [items]);
  const allOnPage = pageSkus.length > 0 && pageSkus.every((s) => selected.has(s));
  const someOnPage = pageSkus.some((s) => selected.has(s));

  const selectAllRef = useRef(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someOnPage && !allOnPage;
  }, [someOnPage, allOnPage]);

  const toggle = (sku) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(sku) ? next.delete(sku) : next.add(sku);
      return next;
    });

  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      pageSkus.forEach((s) => (allOnPage ? next.delete(s) : next.add(s)));
      return next;
    });

  /* ---------- delete ---------- */

  const askDeleteOne = (item) => { setDeleteError(null); setPending([{ sku: item.sku, name: item.name }]); };

  const askDeleteSelected = () => {
    // Names are only known for rows on the current page; fall back to the SKU
    const known = new Map(items.map((i) => [i.sku, i.name]));
    setDeleteError(null);
    setPending([...selected].map((sku) => ({ sku, name: known.get(sku) ?? '' })));
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      if (pending.length === 1) await deleteItem(pending[0].sku);
      else await batchDeleteItems(pending.map((p) => p.sku));

      setSelected((prev) => {
        const next = new Set(prev);
        pending.forEach((p) => next.delete(p.sku));
        return next;
      });
      setPending([]);
      refresh();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- render ---------- */

  return (
    <div className="container-fluid py-3">
      <div className="row g-3">
        {/* ----- inventory ----- */}
        <div className="col-lg-8">
          <Card>
            <Card.Header className="d-flex flex-wrap align-items-center gap-2">
              <h1 className="h5 mb-0 me-auto">Inventory</h1>
              <Form.Control
                type="search"
                placeholder="Search by name or SKU"
                aria-label="Search items"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ maxWidth: 280 }}
              />
            </Card.Header>

            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <Table hover responsive className="mb-0 align-middle">
                <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={{ width: 40 }}>
                      <Form.Check
                        ref={selectAllRef}
                        aria-label="Select all items on this page"
                        checked={allOnPage}
                        disabled={pageSkus.length === 0}
                        onChange={toggleAllOnPage}
                      />
                    </th>
                    <th style={{ width: 180 }}>SKU</th>
                    <th>Name</th>
                    <th style={{ width: 150 }} className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.sku} className={selected.has(item.sku) ? 'table-active' : undefined}>
                      <td>
                        <Form.Check
                          aria-label={`Select ${item.name}`}
                          checked={selected.has(item.sku)}
                          onChange={() => toggle(item.sku)}
                        />
                      </td>
                      <td className="text-nowrap font-monospace">{item.sku}</td>
                      <td>{item.name}</td>
                      <td className="text-end text-nowrap">
                        <Button
                          size="sm" variant="outline-primary" className="me-2"
                          onClick={() => navigate(`/items/${encodeURIComponent(item.sku)}/edit`)}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => askDeleteOne(item)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {!loading && !error && items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">
                        {q ? `No items match "${q}".` : 'No items yet. Use "Add item" to create one.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>

              {loading && (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" role="status" aria-label="Loading items" />
                </div>
              )}
            </div>

            {error && (
              <Alert variant="danger" className="m-3 mb-0 d-flex align-items-center" role="alert">
                <span className="me-auto">{error.message}</span>
                <Button size="sm" variant="outline-danger" onClick={refresh}>Retry</Button>
              </Alert>
            )}

            <Card.Footer className="d-flex flex-wrap align-items-center gap-2">
              <Button variant="danger" disabled={selected.size === 0} onClick={askDeleteSelected}>
                Delete selected{selected.size > 0 && ` (${selected.size})`}
              </Button>
              <Button variant="primary" onClick={() => navigate('/items/new')}>Add item</Button>

              <span className="text-muted small ms-auto">
                {total} item{total === 1 ? '' : 's'}
              </span>
              {totalPages > 1 && (
                <Pagination size="sm" className="mb-0">
                  <Pagination.Prev disabled={pg <= 1} onClick={() => setPage((p) => p - 1)} />
                  <Pagination.Item active>{pg} / {totalPages}</Pagination.Item>
                  <Pagination.Next disabled={pg >= totalPages} onClick={() => setPage((p) => p + 1)} />
                </Pagination>
              )}
            </Card.Footer>
          </Card>
        </div>

        {/* placeholder for CRUD log */}
        <div className="col-lg-4">
          <Card>
            <Card.Header><h2 className="h5 mb-0">Activity log</h2></Card.Header>
            <Card.Body className="text-muted">Coming soon.</Card.Body>
          </Card>
        </div>
      </div>

      <ConfirmDeleteModal
        items={pending}
        busy={deleting}
        error={deleteError}
        onCancel={() => setPending([])}
        onConfirm={confirmDelete}
      />
    </div>
  );
}