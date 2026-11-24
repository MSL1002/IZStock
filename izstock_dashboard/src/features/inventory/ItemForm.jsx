import { useRef, useState } from 'react';
import { Alert, Button, Col, Form, Row, Spinner } from 'react-bootstrap';

const EMPTY = { sku: '', name: '', price: '', quantity: '', aisleId: '', shelfId: '', imageUrl: '' };

function validate(v) {
    const e = {};
    const sku = v.sku.trim();
    if (!sku) e.sku = 'Enter a SKU.';
    else if (sku.length > 100) e.sku = 'SKU can be at most 100 characters.';

    const name = v.name.trim();
    if (!name) e.name = 'Enter a name.';
    else if (name.length > 120) e.name = 'Name can be at most 120 characters.';

    if (!/^\d+(\.\d{1,2})?$/.test(v.price.trim())) e.price = 'Enter a price like 4.99 (max 2 decimals).';
    if (!/^\d+$/.test(v.quantity.trim())) e.quantity = 'Enter a whole number, 0 or more.';

    if (!v.aisleId) e.aisleId = 'Choose an aisle.';
    else if (!v.shelfId) e.shelfId = 'Choose a shelf.';

    const url = v.imageUrl.trim();
    if (url) {
        try {
        if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error();
        } catch {
        e.imageUrl = 'Enter a full http:// or https:// address, or leave blank.';
        }
    }
    return e;
    }

    const toPayload = (v) => ({
    sku: v.sku.trim(),
    name: v.name.trim(),
    price: Number(v.price.trim()),
    quantity: parseInt(v.quantity.trim(), 10),
    shelfId: v.shelfId,
    imageUrl: v.imageUrl.trim() || null,
    });

    export default function ItemForm({ locations, onSubmit, onDone, onCancel }) {
    const [values, setValues] = useState(EMPTY);
    const [touched, setTouched] = useState({});
    const [serverErrors, setServerErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [busy, setBusy] = useState(false);
    const [imageBroken, setImageBroken] = useState(false);
    const skuRef = useRef(null);

    const errors = validate(values);
    const shown = (f) => (touched[f] ? errors[f] : null) ?? serverErrors[f] ?? null;
    const touch = (f) => setTouched((t) => ({ ...t, [f]: true }));

    const set = (field, value) => {
        setValues((v) => ({ ...v, [field]: value }));
        setServerErrors((s) => (s[field] ? { ...s, [field]: undefined } : s));
        setFormError(null);
        setNotice(null);
        if (field === 'imageUrl') setImageBroken(false);
    };

    const aisle = locations.aisles.find((a) => a.id === values.aisleId);

    const chooseAisle = (id) => {
        const next = locations.aisles.find((a) => a.id === id);
        setValues((v) => ({
        ...v,
        aisleId: id,
        // an aisle with a single shelf needs no second choice
        shelfId: next?.shelves.length === 1 ? next.shelves[0].id : '',
        }));
        setServerErrors((s) => ({ ...s, shelfId: undefined }));
    };

    const submit = async (another) => {
        setTouched({ sku: true, name: true, price: true, quantity: true, aisleId: true, shelfId: true, imageUrl: true });
        if (Object.keys(errors).length) return;

        setBusy(true);
        setFormError(null);
        try {
        await onSubmit(toPayload(values));
        if (another) {
            // keep the location: employees usually stock several items on one shelf
            setValues((v) => ({ ...EMPTY, aisleId: v.aisleId, shelfId: v.shelfId }));
            setTouched({});
            setServerErrors({});
            setNotice(`Added "${values.name.trim()}" (${values.sku.trim()}).`);
            setBusy(false);
            skuRef.current?.focus();
        } else {
            onDone();
        }
        } catch (err) {
        setBusy(false);
        if (err.code === 'SKU_EXISTS') {
            setServerErrors({ sku: 'An item with this SKU already exists.' });
        } else if (err.code === 'SHELF_NOT_FOUND') {
            setServerErrors({ shelfId: 'That shelf is no longer on the map. Reload the page and choose again.' });
        } else if (err.code === 'VALIDATION_FAILED' && err.details?.length) {
            const fields = {};
            err.details.forEach((d) => {
            const f = String(d.field ?? '').replace(/^\//, '');
            if (f) fields[f === 'shelfId' ? 'shelfId' : f] = d.problem ?? 'Invalid value.';
            });
            setServerErrors(fields);
            if (!Object.keys(fields).length) setFormError(err.message);
        } else {
            setFormError(err.message);
        }
        }
    };

    /* ---------- map not ready ---------- */

    if (locations.status === 'loading') {
        return <div className="text-center py-5"><Spinner animation="border" role="status" aria-label="Loading map" /></div>;
    }
    if (locations.status === 'error') {
        return (
        <Alert variant="danger" className="d-flex align-items-center">
            <span className="me-auto">Couldn't load the store map: {locations.error.message}</span>
            <Button size="sm" variant="outline-danger" onClick={locations.reload}>Retry</Button>
        </Alert>
        );
    }
    if (locations.status === 'empty') {
        return (
        <Alert variant="warning">
            The store map has no aisles yet, and every item needs a shelf. Ask a manager to build and
            save the map first.
        </Alert>
        );
    }

    /* ---------- form ---------- */

    return (
        <Form noValidate onSubmit={(e) => { e.preventDefault(); submit(false); }}>
        {notice && <Alert variant="success" role="status" dismissible onClose={() => setNotice(null)}>{notice}</Alert>}
        {formError && <Alert variant="danger" role="alert">{formError}</Alert>}

        <fieldset disabled={busy}>
            <Row className="g-3">
            <Col md={5}>
                <Form.Group controlId="item-sku">
                <Form.Label>SKU</Form.Label>
                <Form.Control
                    ref={skuRef}
                    className="font-monospace"
                    value={values.sku}
                    maxLength={100}
                    autoComplete="off"
                    isInvalid={Boolean(shown('sku'))}
                    onChange={(e) => set('sku', e.target.value)}
                    onBlur={() => touch('sku')}
                />
                <Form.Control.Feedback type="invalid">{shown('sku')}</Form.Control.Feedback>
                </Form.Group>
            </Col>

            <Col md={7}>
                <Form.Group controlId="item-name">
                <Form.Label>Name</Form.Label>
                <Form.Control
                    value={values.name}
                    maxLength={120}
                    autoComplete="off"
                    isInvalid={Boolean(shown('name'))}
                    onChange={(e) => set('name', e.target.value)}
                    onBlur={() => touch('name')}
                />
                <Form.Control.Feedback type="invalid">{shown('name')}</Form.Control.Feedback>
                </Form.Group>
            </Col>

            <Col sm={6}>
                <Form.Group controlId="item-price">
                <Form.Label>Price</Form.Label>
                <Form.Control
                    inputMode="decimal"
                    placeholder="0.00"
                    value={values.price}
                    isInvalid={Boolean(shown('price'))}
                    onChange={(e) => set('price', e.target.value)}
                    onBlur={() => touch('price')}
                />
                <Form.Control.Feedback type="invalid">{shown('price')}</Form.Control.Feedback>
                </Form.Group>
            </Col>

            <Col sm={6}>
                <Form.Group controlId="item-quantity">
                <Form.Label>Quantity in stock</Form.Label>
                <Form.Control
                    inputMode="numeric"
                    value={values.quantity}
                    isInvalid={Boolean(shown('quantity'))}
                    onChange={(e) => set('quantity', e.target.value)}
                    onBlur={() => touch('quantity')}
                />
                <Form.Control.Feedback type="invalid">{shown('quantity')}</Form.Control.Feedback>
                </Form.Group>
            </Col>

            <Col sm={6}>
                <Form.Group controlId="item-aisle">
                <Form.Label>Aisle</Form.Label>
                <Form.Select
                    value={values.aisleId}
                    isInvalid={Boolean(shown('aisleId'))}
                    onChange={(e) => chooseAisle(e.target.value)}
                    onBlur={() => touch('aisleId')}
                >
                    <option value="">Choose an aisle…</option>
                    {locations.aisles.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{shown('aisleId')}</Form.Control.Feedback>
                </Form.Group>
            </Col>

            <Col sm={6}>
                <Form.Group controlId="item-shelf">
                <Form.Label>Shelf</Form.Label>
                <Form.Select
                    value={values.shelfId}
                    disabled={!aisle || busy}
                    isInvalid={Boolean(shown('shelfId'))}
                    onChange={(e) => set('shelfId', e.target.value)}
                    onBlur={() => touch('shelfId')}
                >
                    <option value="">{aisle ? 'Choose a shelf…' : 'Choose an aisle first'}</option>
                    {aisle?.shelves.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{shown('shelfId')}</Form.Control.Feedback>
                </Form.Group>
            </Col>

            <Col xs={12}>
                <Form.Group controlId="item-image">
                <Form.Label>Image URL <span className="text-muted">(optional)</span></Form.Label>
                <Form.Control
                    type="url"
                    placeholder="https://…"
                    value={values.imageUrl}
                    isInvalid={Boolean(shown('imageUrl'))}
                    onChange={(e) => set('imageUrl', e.target.value)}
                    onBlur={() => touch('imageUrl')}
                />
                <Form.Control.Feedback type="invalid">{shown('imageUrl')}</Form.Control.Feedback>
                </Form.Group>

                {values.imageUrl.trim() && !errors.imageUrl && (
                imageBroken
                    ? <p className="text-warning-emphasis small mt-2 mb-0">That address didn't load as an image.</p>
                    : <img
                        src={values.imageUrl.trim()}
                        alt="Preview"
                        className="mt-2 border rounded"
                        style={{ maxHeight: 120, maxWidth: '100%' }}
                        onError={() => setImageBroken(true)}
                    />
                )}
            </Col>
            </Row>
        </fieldset>

        <div className="d-flex flex-wrap gap-2 mt-4">
            <Button type="submit" disabled={busy}>
            {busy ? <Spinner size="sm" animation="border" /> : 'Add item'}
            </Button>
            <Button variant="outline-primary" disabled={busy} onClick={() => submit(true)}>
            Add and create another
            </Button>
            <Button variant="outline-secondary" className="ms-auto" disabled={busy} onClick={onCancel}>
            Cancel
            </Button>
        </div>
        </Form>
    );
}