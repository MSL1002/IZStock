import { useEffect, useState } from "react";
import { Alert, Badge, Button, ButtonGroup, Modal, Spinner, ToggleButton, ToggleButtonGroup } from 'react-bootstrap';
import { useMapEditor } from "../MapEditorProvider";
import { TOOLS } from "../tools";

export default function Toolbar() {
    const {
        state, actions, dirty, issues, canSave, saving, save, saveError, conflict, needsUnlock,
        canUndo, canRedo, readOnly,
    } = useMapEditor();

    const [confirming, setConfirming] = useState(false);

    // If the save was bounced to another flow (stale version or expired token),
    // those modals take over, so close this one.
    useEffect(() => {
        if (conflict || needsUnlock) setConfirming(false);
    }, [conflict, needsUnlock]);

    const confirmSave = async () => {
        const result = await save();
        if (result.ok) setConfirming(false);
    }

    const saveHint = !dirty
        ? 'No changes to save.'
        : issues.length
            ? `Fix ${issues.length} problem${issues.length === 1 ? '' : 's'} before saving`
            : 'Publish this map';
    
    return (
        <>
            <div className= "d-flex align-items-center flex-wrap gap-3 px-3 py-2 border-bottom bg-white">
                <ToggleButtonGroup
                    type="radio"
                    name="map-tool"
                    size="sm"
                    value={state.tool}
                    onChange={actions.setTool}
                >
                    {TOOLS.map((t) => (
                        <ToggleButton
                            key={t.id}
                            id={`tool-${t.id}`}
                            value={t.id}
                            variant="outline-primary"
                            disabled={saving}
                            title={`${t.label} (${t.key})`}
                        >
                            {t.label}
                        </ToggleButton>
                    ))
                    }
                </ToggleButtonGroup>
            <ButtonGroup size="sm">
                <Button variant="outline-secondary" onClick={actions.undo} disabled={!canUndo || readOnly}
                        title="Undo (Ctrl+Z)">
                    Undo
                </Button>
                <Button variant="outline-secondary" onClick={actions.redo} disabled={!canRedo || readOnly}
                        title="Redo (Ctrl+Shift+Z)">
                    Redo
                </Button>
            </ButtonGroup>
                <div className="ms-auto d-flex align-items-center gap-3">
                    {issues.length > 0 && (
                        <Badge bg="danger" pill>
                        {issues.length} problem{issues.length === 1 ? '' : 's'}
                        </Badge>
                    )}
                    <span className={dirty ? 'text-warning-emphasis small' : 'text-muted small'}>
                        {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'All changes saved'}
                    </span>
                    {/* wrapper span: disabled buttons don't fire hover events, so the tooltip would never show */}
                    <span title={saveHint}>
                        <Button size="sm" disabled={!canSave} onClick={() => setConfirming(true)}>
                        Save map
                        </Button>
                    </span>
                </div>
            </div>

            <ConfirmSaveModal
                show={confirming}
                saving={saving}
                error={saveError}
                map={state.map}
                version={state.baseVersion}
                onCancel={() => setConfirming(false)}
                onConfirm={confirmSave}
            />
        </>
    )
}
    function ConfirmSaveModal({ show, saving, error, map, version, onCancel, onConfirm }) {
    const n = (obj) => Object.keys(obj).length;
    return (
        <Modal show={show} onHide={saving ? undefined : onCancel} backdrop="static" centered>
        <Modal.Header closeButton={!saving}>
            <Modal.Title>Save this map?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <p>
            This replaces the live map customers see. To undo it later, you would load an older
            version and save it again.
            </p>
            <p className="text-muted mb-0">
            {n(map.sections)} sections, {n(map.aisles)} aisles, {n(map.shelves)} shelves
            {' '}(saving as version {version + 1}).
            </p>
            {error && (
            <Alert variant="danger" className="mt-3 mb-0" role="alert">
                {error.message}
            </Alert>
            )}
        </Modal.Body>
        <Modal.Footer>
            <Button variant="outline-secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={onConfirm} disabled={saving}>
            {saving ? <Spinner size="sm" animation="border" /> : 'Save and publish'}
            </Button>
        </Modal.Footer>
        </Modal>
    );
}