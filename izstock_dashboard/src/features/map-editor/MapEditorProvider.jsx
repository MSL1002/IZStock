import {
    createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState,
} from 'react';

import {
    mapEditorReducer, initState, isDirty, canUndo, canRedo, collectGroup,
} from './reducer'

import { normalize, denormalize, emptyMap } from './normalize';
import { validateMap, issuesByEntity, issuesFromServerError } from './utils/validate';
import { getMap, putMap } from '../../api/map';
import { useManager } from '../../context/ManagerContext';
import { sampleMap, sampleItemCounts } from './sampleMap';

const StateContext = createContext(null);
const DispatchContext = createContext(null);

// Server codes that mean "your map is invalid", shown as highlights
const MAP_VALIDATION_CODES = new Set([
    'VALIDATION_FAILED', 'DUPLICATE_AISLE_NUMBER', 'SHELVES_IN_USE',
]);

export function MapEditorProvider({ storeId, sampleMap = null, children }) {
    const { token, editedBy } = useManager();
    const [state, dispatch] = useReducer(mapEditorReducer, initState);

    // 'loading' | 'ready' | 'locked' | 'error'
    const [status, setStatus] = useState('loading');
    const [loadError, setLoadError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);     // { code, message } for non-validation failures
    const [conflict, setConflict] = useState(false);      // STALE_VERSION
    const [needsUnlock, setNeedsUnlock] = useState(false); // FORBIDDEN on save
    const [serverIssues, setServerIssues] = useState(null); // { forMap, issues }
    const [focusRequest, setFocusRequest] = useState(null); // { type, id, n }

    // The token lives in a ref so a refreshed token never re-triggers a load,
    // which would throw away unsaved edits.
    const tokenRef = useRef(token);
    tokenRef.current = token;
    const savingRef = useRef(false);
    const loadId = useRef(0);

    //
    const requestFocus = useCallback(
        (type, id) => setFocusRequest((r) => ({ type, id, n: (r?.n ?? 0) + 1 })),
        []
    );

    /* ---------- load ---------- */

    const dismissUnlock = useCallback(() => setNeedsUnlock(false), []);

    const load = useCallback(async () => {
        const id = ++loadId.current;
        if (sampleMap) {
            dispatch({
                type: 'LOAD_MAP', storeId, version: 0, units: sampleMap.units,
                map: normalize(sampleMap), shelfItemCounts: sampleItemCounts,
            });
            setStatus('ready');
            return;
        }
        setStatus('loading');
        setLoadError(null);
        setConflict(false);
        setSaveError(null);
        setServerIssues(null);
        try {
            const m = await getMap(tokenRef.current);
            if (id !== loadId.current) return; // a newer load superseded this one
            dispatch({
                type: 'LOAD_MAP',
                storeId,
                version: m.version,
                units: m.units,
                map: normalize(m),
                shelfItemCounts: m.shelfItemCounts,
            });
            setStatus('ready');
        } catch (err) {
            if (id !== loadId.current) return;
            if (err.code === 'NOT_FOUND') {
                // First-time setup: blank canvas at version 0
                dispatch({ type: 'LOAD_MAP', storeId, version: 0, map: emptyMap, shelfItemCounts: {} });
                setStatus('ready');
            } else if (err.code === 'FORBIDDEN') {
                setStatus('locked');
            } else {
                setLoadError(err);
                setStatus('error');
            }
        }
    }, [storeId, sampleMap]);

    useEffect(() => {
        load();
        return () => { loadId.current++; }; // ignore results after unmount
    }, [load]);

    // If the initial load was blocked by an expired token, retry once re-unlocked.
    useEffect(() => {
        if (status === 'locked' && token) load();
    }, [status, token, load]);

    // Re-unlocking after a failed save clears the prompt; edits are untouched.
    useEffect(() => {
        if (token) setNeedsUnlock(false);
    }, [token]);

    /* ---------- derived ---------- */

    const dirty = isDirty(state);

    const clientIssues = useMemo(
        () => validateMap(state.map, { shelfItemCounts: state.shelfItemCounts }),
        [state.map, state.shelfItemCounts]
    );

    // Server-reported issues only apply to the exact map that was rejected.
    // Any later edit changes state.map, so they disappear on their own.
    const issues = useMemo(() => {
        const fromServer = serverIssues?.forMap === state.map ? serverIssues.issues : [];
        return [...clientIssues, ...fromServer];
    }, [clientIssues, serverIssues, state.map]);

    const issueIndex = useMemo(() => issuesByEntity(issues), [issues]);

    const readOnly = saving || status !== 'ready';
    const canSave = dirty && issues.length === 0 && !readOnly;

    /* ---------- save ---------- */

    const save = useCallback(async () => {
        if (savingRef.current || !canSave) return { ok: false };
        savingRef.current = true;
        setSaving(true);
        setSaveError(null);
        setConflict(false);

        const snapshot = state.map; // exactly what we send, and what MARK_SAVED records
        try {
            const res = await putMap(
                {
                    storeId: state.storeId,
                    editedBy: "manager",
                    version: (state.baseVersion) + 1,
                    editedAt: new Date().toISOString(),
                    baseVersion: state.baseVersion,
                    units: state.units,
                    sections: denormalize(snapshot),
                    status: "published"
                },
                tokenRef.current
            );
            dispatch({ type: 'MARK_SAVED', version: res.version, map: snapshot });
            return { ok: true };
        } catch (err) {
            if (err.code === 'STALE_VERSION') {
                setConflict(true);
            } else if (err.code === 'FORBIDDEN') {
                setNeedsUnlock(true); // keep edits; the UI shows UnlockModal, then the user saves again
            } else if (MAP_VALIDATION_CODES.has(err.code)) {
                setServerIssues({ forMap: snapshot, issues: issuesFromServerError(err) });
            } else {
                setSaveError({ code: err.code ?? 'NETWORK', message: err.message });
            }
            return { ok: false, error: err };
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }, [canSave, state.map, state.storeId, state.baseVersion, state.units, editedBy]);

    /* ---------- action helpers ---------- */

    // Every mutation is ignored while saving or loading.
    const actions = useMemo(() => {
        const guarded = (action) => { if (!readOnly) dispatch(action); };
        return {
            setTool: (tool) => dispatch({ type: 'SET_TOOL', tool }), // UI state, always allowed
            select: (selection) => dispatch({ type: 'SELECT', selection }),
            addEntity: (entityType, entity) => guarded({ type: 'ADD_ENTITY', entityType, entity }),
            moveEntity: (entityType, id, dx, dy, newParentId) =>
                guarded({ type: 'MOVE_ENTITY', entityType, id, dx, dy, newParentId }),
            setPolygon: (entityType, id, polygon) =>
                guarded({ type: 'SET_POLYGON', entityType, id, polygon }),
            updateEntity: (entityType, id, patch) =>
                guarded({
                    type: 'UPDATE_ENTITY', entityType, id, patch,
                    coalesceKey: `${entityType}:${id}:${Object.keys(patch).join(',')}`,
                }),
            deleteEntity: (entityType, id) => guarded({ type: 'DELETE_ENTITY', entityType, id }),
            undo: () => guarded({ type: 'UNDO' }),
            redo: () => guarded({ type: 'REDO' }),
        };
    }, [readOnly]);

    // How many inventory items sit on shelves that a delete would remove.
    // The UI uses this to warn BEFORE dispatching DELETE_ENTITY.
    const itemsAffectedBy = useCallback(
        (entityType, id) => {
            const { shelves } = collectGroup(state.map, entityType, id);
            return shelves.reduce((sum, sid) => sum + (state.shelfItemCounts[sid] ?? 0), 0);
        },
        [state.map, state.shelfItemCounts]
    );

    /* ---------- context values ---------- */

    const value = useMemo(
        () => ({
            state,
            status, loadError, reload: load,
            dirty, issues, issueIndex, canSave, readOnly,
            canUndo: canUndo(state), canRedo: canRedo(state),
            saving, save, saveError, conflict, needsUnlock,
            actions, itemsAffectedBy,
            focusRequest, requestFocus
        }),
        [state, status, loadError, load, dirty, issues, issueIndex, canSave, readOnly,
            saving, save, saveError, conflict, needsUnlock, actions, itemsAffectedBy,
            focusRequest, requestFocus, dismissUnlock]
    );

    return (
        <DispatchContext.Provider value={dispatch}>
            <StateContext.Provider value={value}>{children}</StateContext.Provider>
        </DispatchContext.Provider>
    );
}

export function useMapEditor() {
    const ctx = useContext(StateContext);
    if (!ctx) throw new Error('useMapEditor must be used inside <MapEditorProvider>');
    return ctx;
}

// Raw dispatch, for hooks that need it without subscribing to every state change.
export function useMapEditorDispatch() {
    const ctx = useContext(DispatchContext);
    if (!ctx) throw new Error('useMapEditorDispatch must be used inside <MapEditorProvider>');
    return ctx;
}