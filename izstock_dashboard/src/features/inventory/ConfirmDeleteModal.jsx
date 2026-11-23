import { Alert, Button, Modal, Spinner } from 'react-bootstrap';

// items: [{ sku, name }] to be deleted. Pass an empty array to hide.
export default function ConfirmDeleteModal({ items, busy, error, onCancel, onConfirm }) {
  const n = items.length;
  const preview = items.slice(0, 5);

  return (
    <Modal show={n > 0} onHide={busy ? undefined : onCancel} backdrop="static" centered>
      <Modal.Header closeButton={!busy}>
        <Modal.Title>Delete {n === 1 ? 'this item' : `${n} items`}?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ul className="mb-2">
          {preview.map((i) => <li key={i.sku}><strong>{i.sku}</strong> {i.name}</li>)}
        </ul>
        {n > preview.length && <p className="text-muted small">…and {n - preview.length} more.</p>}
        <p className="mb-0">
          {n === 1 ? 'It' : 'They'} will be removed from the app's search. This can't be undone.
        </p>
        {error && <Alert variant="danger" className="mt-3 mb-0" role="alert">{error}</Alert>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? <Spinner size="sm" animation="border" /> : 'Delete'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}