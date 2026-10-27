import { useState } from 'react';
import { Badge, Button } from 'react-bootstrap';
import { useMapEditor } from '../MapEditorProvider';

const KEY = { section: 'sections', aisle: 'aisles', shelf: 'shelves' };
const NOUN = { section: 'section', aisle: 'aisle', shelf: 'shelf' };

// decides what to call each shape
function labelFor(type, entity) {
  if (type === 'section') return entity.name?.trim() || 'Unnamed section';
  if (type === 'aisle') return `Aisle ${String(entity.aisleNumber ?? '').trim() || '(no number)'}`;
  return 'Shelf';
}

export default function IssueList() {
  const { issues, state, actions, requestFocus } = useMapEditor();
  const [open, setOpen] = useState(true);

  if (issues.length === 0) return null;

  const focus = (type, id) => {
    actions.setTool('select'); // shapes are only clickable in the select tool
    actions.select({ type, id });
    requestFocus(type, id);
  };

  return (
    <section className="border-top bg-white" aria-label="Problems with this map">
      <button
        type="button"
        className="btn btn-link text-decoration-none w-100 text-start px-3 py-2 d-flex align-items-center gap-2"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Badge bg="danger" pill>{issues.length}</Badge>
        <span className="fw-semibold">
          {issues.length === 1 ? 'Problem' : 'Problems'} blocking save
        </span>
        <span className="ms-auto text-muted small">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <ul className="list-unstyled mb-0 px-3 pb-2" style={{ maxHeight: 160, overflowY: 'auto' }}>
          {issues.map((issue) => {
            // Only shapes that still exist can be selected (a deleted shelf can't)
            const targets = issue.ids
              .map((id) => ({ id, entity: state.map[KEY[issue.entityType]]?.[id] }))
              .filter((t) => t.entity);

            return (
              <li
                key={`${issue.code}:${issue.ids.join(',')}`}
                className="d-flex flex-wrap align-items-center gap-2 py-1 border-top small"
              >
                <span className="flex-grow-1">{issue.message}</span>
                {targets.length > 0 ? (
                  targets.map(({ id, entity }) => (
                    <Button
                      key={id}
                      size="sm"
                      variant="outline-danger"
                      onClick={() => focus(issue.entityType, id)}
                      title={`Select this ${NOUN[issue.entityType]}`}
                    >
                      {targets.length > 1 ? labelFor(issue.entityType, entity) : 'Select'}
                    </Button>
                  ))
                ) : (
                  <span className="text-muted">Use Undo to bring it back</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}