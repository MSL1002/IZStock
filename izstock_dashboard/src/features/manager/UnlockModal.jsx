// src/features/manager/UnlockModal.jsx
import { useEffect, useRef, useState } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useManager } from '../../context/ManagerContext';

const CODE_LENGTH = 8;

const MESSAGES = {
  INVALID_CODE: "That code isn't correct. Check it and try again.",
  RATE_LIMITED: 'Too many attempts. Wait a minute, then try again.',
};

export default function UnlockModal({ show, onCancel }) {
  const { unlock } = useManager();
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  // Reset every time the modal reopens
  useEffect(() => {
    if (show) { setCode(''); setError(null); setBusy(false); }
  }, [show]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy || code.trim().length !== CODE_LENGTH) return;
    setBusy(true);
    setError(null);
    try {
      await unlock(code);
      // Success: the token now exists, so the parent's `show` goes false on its own.
    } catch (err) {
      setError(MESSAGES[err.code] ?? err.message ?? 'Something went wrong.');
      setCode('');
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const dismissible = Boolean(onCancel);

  return (
    <Modal
      show={show}
      onHide={dismissible ? onCancel : undefined}
      backdrop={dismissible ? true : 'static'}
      keyboard={dismissible}
      centered
      onEntered={() => inputRef.current?.focus()}
    >
      <Form onSubmit={submit}>
        <Modal.Header closeButton={dismissible}>
          <Modal.Title>Manager access</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p className="text-muted">
            Enter your {CODE_LENGTH}-character manager code to edit the store map.
          </p>
          <Form.Group controlId="manager-code">
            <Form.Label>Manager code</Form.Label>
            <Form.Control
              ref={inputRef}
              type="password"
              value={code}
              maxLength={CODE_LENGTH}
              autoComplete="off"
              spellCheck={false}
              isInvalid={Boolean(error)}
              disabled={busy}
              onChange={(e) => setCode(e.target.value)}
            />
          </Form.Group>
          {error && <Alert variant="danger" className="mt-3 mb-0" role="alert">{error}</Alert>}
        </Modal.Body>

        <Modal.Footer>
          {dismissible && (
            <Button variant="outline-secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={busy || code.trim().length !== CODE_LENGTH}>
            {busy ? <Spinner size="sm" animation="border" /> : 'Unlock'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}