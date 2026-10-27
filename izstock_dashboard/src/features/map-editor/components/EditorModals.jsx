import { Alert, Button, Modal } from 'react-bootstrap';
import { denormalize } from '../normalize';

// shown when someone else saved a newer map version.
// keep a backup of your work, then reload.
export function StaleVersionModal({ show, map, units, onReload }) {
  const downloadBackup = () => {
    const json = JSON.stringify({ units, sections: denormalize(map) }, null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `map-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal show={show} backdrop="static" keyboard={false} centered>
      <Modal.Header>
        <Modal.Title>The map was changed elsewhere</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          A newer version of the map was saved while you were editing, so your changes can't be
          saved on top of it.
        </p>
        <p className="mb-0">
          Reloading shows the latest map and <strong>discards your unsaved edits</strong>. If you
          want to keep your work, download a backup first.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={downloadBackup}>Download my changes</Button>
        <Button variant="danger" onClick={onReload}>Discard and reload</Button>
      </Modal.Footer>
    </Modal>
  );
}

// shown when in-app navigation is blocked by unsaved edits
export function LeavePrompt({ show, onStay, onLeave }) {
  return (
    <Modal show={show} onHide={onStay} centered>
      <Modal.Header closeButton>
        <Modal.Title>Leave without saving?</Modal.Title>
      </Modal.Header>
      <Modal.Body>Your map changes haven't been saved and will be lost.</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onStay}>Keep editing</Button>
        <Button variant="danger" onClick={onLeave}>Leave</Button>
      </Modal.Footer>
    </Modal>
  );
}

export function LoadFailed({ error, onRetry }) {
  return (
    <div className="p-4" style={{ maxWidth: 520 }}>
      <Alert variant="danger" role="alert">
        <Alert.Heading className="h6">Couldn't load the map</Alert.Heading>
        {error?.message ?? 'Something went wrong.'}
      </Alert>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}