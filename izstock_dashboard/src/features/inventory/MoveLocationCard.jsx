import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { moveItem } from '../../api/items';
import { useManager } from '../../context/ManagerContext';
import UnlockModal from '../manager/UnlockModal';

// item: the loaded item. locations: { status, aisles } from useStoreLocations.
// onMoved(): called after a successful move so the page can reload the item.
export default function MoveLocationCard({ item, locations, onMoved }) {
    const { isManager, token, lock } = useManager();
    const [unlocking, setUnlocking] = useState(false);
    const [aisleId, setAisleId] = useState('');
    const [shelfId, setShelfId] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(false);

    const aisles = locations.aisles;
    const aisle = aisles.find((a) => a.id === aisleId);
    const sameShelf = shelfId && shelfId === item.shelfId;

    const chooseAisle = (id) => {
        const next = aisles.find((a) => a.id === id);
        setAisleId(id);
        setShelfId(next?.shelves.length === 1 ? next.shelves[0].id : '');
        setError(null);
        setDone(false);
    };

    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
        await moveItem(item.sku, shelfId, token);
        setDone(true);
        setAisleId('');
        setShelfId('');
        onMoved();
        lock();
        } catch (err) {
        if (err.code === 'FORBIDDEN') {
            lock();             
            setUnlocking(true); 
            setError('Your manager session expired. Enter the code and try again.');
        } else if (err.code === 'SHELF_NOT_FOUND') {
            setError('That shelf is no longer on the map. Reload the page and choose again.');
        } else if (err.code === 'NOT_FOUND') {
            setError('This item no longer exists.');
        } else {
            setError(err.message);
        }
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card className="mt-3">
        <Card.Header className="d-flex align-items-center">
            <h2 className="h6 mb-0 me-auto">Move item</h2>
            {isManager && <span className="badge text-bg-success">Manager mode</span>}
        </Card.Header>
        <Card.Body>
            {done && <Alert variant="success" role="status" dismissible onClose={() => setDone(false)}>
            Item moved.
            </Alert>}
            {error && <Alert variant="danger" role="alert">{error}</Alert>}

            {!isManager ? (
            <>
                <p className="text-muted">Only a manager can change which shelf an item is on.</p>
                <Button variant="outline-primary" onClick={() => setUnlocking(true)}>
                Unlock manager mode
                </Button>
            </>
            ) : locations.status !== 'ready' ? (
            <p className="text-muted mb-0">
                {locations.status === 'loading' ? 'Loading the store map…' : 'The store map is not available.'}
            </p>
            ) : (
            <fieldset disabled={busy}>
                <Row className="g-3">
                <Col sm={6}>
                    <Form.Group controlId="move-aisle">
                    <Form.Label>New aisle</Form.Label>
                    <Form.Select value={aisleId} onChange={(e) => chooseAisle(e.target.value)}>
                        <option value="">Choose an aisle…</option>
                        {aisles.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </Form.Select>
                    </Form.Group>
                </Col>
                <Col sm={6}>
                    <Form.Group controlId="move-shelf">
                    <Form.Label>New shelf</Form.Label>
                    <Form.Select
                        value={shelfId}
                        disabled={!aisle}
                        isInvalid={Boolean(sameShelf)}
                        onChange={(e) => { setShelfId(e.target.value); setDone(false); }}
                    >
                        <option value="">{aisle ? 'Choose a shelf…' : 'Choose an aisle first'}</option>
                        {aisle?.shelves.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">The item is already on this shelf.</Form.Control.Feedback>
                    </Form.Group>
                </Col>
                </Row>
                <Button className="mt-3" disabled={!shelfId || sameShelf || busy} onClick={submit}>
                {busy ? <Spinner size="sm" animation="border" /> : 'Move item'}
                </Button>
            </fieldset>
            )}
        </Card.Body>

        <UnlockModal show={unlocking && !isManager} onCancel={() => setUnlocking(false)} />
        </Card>
    );
}