import { useEffect, useState } from "react";
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { useMapEditor } from '../MapEditorProvider';
import { collectGroup } from '../reducer';
import { bounds } from '../utils/geometry';

const KEY = { section: 'sections', aisle: 'aisles', shelf: 'shelves' };
const TITLE = { section: 'Section', aisle: 'Aisle', shelf: 'Shelf' };
const DEFAULT_COLOR = '#adb5bd'; // matches fallback
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const trim2 = (n) => Number(n.toFixed(2));

export default function PropertiesPanel() {
    const { state, actions, issueIndex, readOnly, itemsAffectedBy } = useMapEditor();
    const { selection, map, units } = state;
    const [confirming, setConfirming] = useState(false);

    // Selection changed (or undo removed the entity): drop any open confirmation
    useEffect(() => { setConfirming(false); }, [selection?.id]);

    const entity = selection ? map[KEY[selection.type]][selection.id] : null;

    if (!entity) {
        return (
            <aside className="border-start bg-white p-3" style={{ width: 280, overflowY: 'auto' }}>
                <h2 className="h6">Properties</h2>
                <p className="text-muted small mb-0">
                    Select a section, aisle, or shelf to edit it. Use the Select tool (1) to click shapes.
                </p>
            </aside>
        );
    }

    const { type, id } = selection;
    const box = bounds(entity.polygon);
    const issues = issueIndex.get(`${type}:${id}`) ?? [];

    // ensure proper cascading edits
    const group = collectGroup(map, type, id);
    const descendants = group.sections.length + group.aisles.length + group.shelves.length - 1;
    const items = itemsAffectedBy(type, id);

    const update = (patch) => actions.updateEntity(type, id, patch);

    const requestDelete = () => {
        if (descendants === 0 && items === 0) actions.deleteEntity(type, id);
        else setConfirming(true);
    };

    const confirmDelete = () => {
        actions.deleteEntity(type, id);
        setConfirming(false);
    };

    // Where this shape lives in the hierarchy
    const parent =
        type === 'aisle' ? map.sections[entity.sectionId]
            : type === 'shelf' ? map.aisles[entity.aisleId]
                : null;
    const parentLabel =
        type === 'aisle' ? parent && `Section: ${parent.name || '(unnamed)'}`
            : type === 'shelf' ? parent && `Aisle: ${String(parent.aisleNumber).trim() || '(no number)'}`
                : null;

    const aisleNumberInvalid = issues.some(
        (i) => i.code === 'DUPLICATE_AISLE_NUMBER' || i.code === 'MISSING_LABEL'
    );

    return (
        <aside className="border-start bg-white p-3" style={{ width: 280, overflowY: 'auto' }}>
            <h2 className="h6 mb-1">{TITLE[type]}</h2>
            <p className="text-muted small mb-3">
                {parentLabel && <>{parentLabel}<br /></>}
                Size: {trim2(box.width)} x {trim2(box.height)} {units}
            </p>

            {/* key resets the inputs' state when a different entity is selected */}
            <fieldset disabled={readOnly} key={id}>
                {type === 'section' && (
                    <>
                        <Form.Group className="mb-3" controlId="prop-section-name">
                            <Form.Label>Name</Form.Label>
                            <Form.Control
                                value={entity.name ?? ''}
                                maxLength={60}
                                isInvalid={!String(entity.name ?? '').trim()}
                                onChange={(e) => update({ name: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="prop-section-color">
                            <Form.Label>Color</Form.Label>
                            <Form.Control
                                type="color"
                                value={/^#[0-9a-f]{6}$/i.test(entity.color ?? '') ? entity.color : DEFAULT_COLOR}
                                onChange={(e) => update({ color: e.target.value })}
                                title="Section color"
                            />
                        </Form.Group>
                    </>
                )}

                {type === 'aisle' && (
                    <Form.Group className="mb-3" controlId="prop-aisle-number">
                        <Form.Label>Aisle number</Form.Label>
                        <Form.Control
                            value={entity.aisleNumber ?? ''}
                            maxLength={20}
                            autoComplete="off"
                            isInvalid={aisleNumberInvalid}
                            onChange={(e) => update({ aisleNumber: e.target.value })}
                        />
                        <Form.Text muted>Shown on the map and used to move whole aisles later.</Form.Text>
                    </Form.Group>
                )}

                {type === 'shelf' && (
                    <>
                        <Form.Group className="mb-3" controlId="prop-shelf-side">
                            <Form.Label>Side of aisle</Form.Label>
                            <Form.Select
                                value={entity.side ?? ''}
                                onChange={(e) => update({ side: e.target.value || undefined })}
                            >
                                <option value="">Not set</option>
                                <option value="left">Left</option>
                                <option value="right">Right</option>
                                <option value="front">Front</option>
                                <option value="back">Back</option>
                            </Form.Select>
                        </Form.Group>
                        <p className="small mb-3">
                            {items > 0
                                ? <>Holds <strong>{plural(items, 'item')}</strong></>
                                : <span className="text-muted">No items on this shelf</span>}
                        </p>
                    </>
                )}
            </fieldset>

            {issues.length > 0 && (
                <Alert variant="danger" className="small py-2" role="alert">
                    <ul className="mb-0 ps-3">
                        {issues.map((issue, i) => <li key={i}>{issue.message}</li>)}
                    </ul>
                </Alert>
            )}

            <hr />
            <Button variant="outline-danger" size="sm" onClick={requestDelete} disabled={readOnly}>
                Delete {TITLE[type].toLowerCase()}
            </Button>

            <Modal show={confirming} onHide={() => setConfirming(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Delete this {TITLE[type].toLowerCase()}?</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {descendants > 0 && (
                        <p>
                            This also deletes everything inside it:{' '}
                            {[
                                group.aisles.length && type === 'section' && plural(group.aisles.length, 'aisle'),
                                group.shelves.length && type !== 'shelf' && plural(group.shelves.length, 'shelf'),
                            ].filter(Boolean).join(' and ')}.
                        </p>
                    )}
                    {items > 0 && (
                        <Alert variant="warning" className="mb-2">
                            <strong>{plural(items, 'inventory item')}</strong> {items === 1 ? 'is' : 'are'} placed
                            on the shelves being deleted. You won't be able to save the map until those items are
                            moved to other shelves.
                        </Alert>
                    )}
                    <p className="text-muted small mb-0">You can undo this with Ctrl+Z.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-secondary" onClick={() => setConfirming(false)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                </Modal.Footer>
            </Modal>
        </aside>
    );
}