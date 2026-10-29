import { emptyMap } from "./normalize";
import { cleanPolygon } from "./utils/geometry";

const HISTORY_LIMIT = 100;
const COLLECTION = {section: 'sections', aisle: 'aisles', shelf: 'shelves'};
const PARENT_FIELD = {aisle: 'sectionId', shelf: 'aisleId'};
const PARENT_TYPE = {aisle: 'section', shelf: 'aisle'};

// Fields that can be updated by UPDATE_ENTITY
const PATCHABLE = {
    section: ['name', 'color'],
    aisle: ['aisleNumber'],
    shelf: ['side'],
}

export const initState = {
    storeId: null,
    baseVersion: 0,
    units: 'feet',

    map: emptyMap,
    savedMap: emptyMap,
    shelfItemCounts: {},

    selection: null,    // {type, id} || null
    tool: 'select',

    past: [],           // for undo
    future: [],         // for redo
    coalesceKey: null,  // merge rappid edits in to 1 undo
};

// ---------- helpers ----------

const round = (n) => Math.round(n * 1e4) / 1e4;

const translatePolygon = (polygon, dx, dy) =>
    polygon.map(([x, y]) => [round(x + dx), round(y + dy)]);

const validPolygon = (polygon) =>
    Array.isArray(polygon) &&
    polygon.length >= 3 &&
    polygon.every(
        (p) => Array.isArray(p) && p.length === 2 && p.every((n) => Number.isFinite(n) && n>= 0)
    );

// get the entity + everything benieth it as IDs per colelction
export function collectGroup(map, type, id){
    const group = { sections: [], aisles: [], shelves: [] };
if (type === 'shelf') {
    group.shelves.push(id);
  } else if (type === 'aisle') {
    group.aisles.push(id);
    for (const s of Object.values(map.shelves)) if (s.aisleId === id) group.shelves.push(s.id);
  } else {
    group.sections.push(id);
    const aisleIds = new Set();
    for (const a of Object.values(map.aisles)) {
      if (a.sectionId === id) { group.aisles.push(a.id); aisleIds.add(a.id); }
    }
    for (const s of Object.values(map.shelves)) if (aisleIds.has(s.aisleId)) group.shelves.push(s.id);
  }
  return group;
};

//push old map into history, unless the edit coalexces with previous
function commit(state, nextMap, {coalesceKey = null, ...extra } = {}){
    if (nextMap === state.map) return state;
    const coalesce = coalesceKey !== null && coalesceKey === state.coalesceKey;
    return {
        ...state,
        ...extra,
        map: nextMap,
        past: coalesce ? state.past : [...state.past, state.map].slice(-HISTORY_LIMIT),
        future: [],
        coalesceKey
    };
};

// after undo/redo/delete, drop a selection that no longer exists
function pruneSelection(selection, map) {
    if(!selection) return null;
    return map[COLLECTION[selection.type]][selection.id] ? selection : null;
}

// ---------- reducer ----------

export function mapEditorReducer (state, action){
    switch(action.type) {
        // ----life cycle----
        case 'LOAD_MAP':{
            // action: { storeId, version, units, map (normalized), shelfItemCounts }
            return {
                ...initState,
                storeId: action.storeId,
                baseVersion: action.version,   // 0 when GET /map returned 404
                units: action.units ?? 'meters',
                map: action.map,
                savedMap: action.map,
                shelfItemCounts: action.shelfItemCounts ?? {},
            };
        }

        case 'MARK_SAVED': {
            // action: { version } from the PUT /map response
            return { ...state, baseVersion: action.version, savedMap: action.map };
        }

        // ---- UI state (not undoable) ----
        case 'SET_TOOL':
            return {...state, tool: action.tool, coalesceKey: null};
        
        case 'SELECT':
            return {...state, selection: action.selection, coalesceKey: null};
        
        // ---- map edits (undoable) ----
        case 'ADD_ENTITY': {
            // action: {enrirtyType, entity } where entity includes its ID (and parent ID)
            const { entityType, entity } = action;
            const polygon = validPolygon(entity.polygon) ? cleanPolygon(entity.polygon) : null;
            if (!polygon || polygon.length < 3) return state;
            const clean = { ...entity, polygon };
            const key = COLLECTION[entityType];
            if(!clean?.id || state.map[key][clean.id]) return state;
            if(!validPolygon(clean.polygon)) return state;
            
            const parentField = PARENT_FIELD[entityType];
            if (parentField) {
                const parentKey = COLLECTION[PARENT_TYPE[entityType]];
                if(!state.map[parentKey][clean[parentField]]) return state;
            }

            const map = { ...state.map, [key]: { ...state.map[key], [clean.id]: clean } };
            return commit(state, map, { selection: {type: entityType, id: clean.id } });
        }

        case 'MOVE_ENTITY': {
            // action: { entityType, id, dx, dy, newParentId? }  (dispatch on drag END)
            const { entityType, id, dx, dy, newParentId } = action;
            const entity = state.map[COLLECTION[entityType]][id];
            if (!entity) return state;

            const group = collectGroup(state.map, entityType, id);

            // clamp delta so nothing in the group crosses x<0 or y<0.
            // clamping the delta (not each point individually) preserves every shape.
            let minX = Infinity, minY = Infinity;
            for (const k of Object.keys(group)) {
                for (const gid of group[k]) {
                for (const [x, y] of state.map[k][gid].polygon) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                }
                }
            }
            const cdx = Math.max(dx, -minX);
            const cdy = Math.max(dy, -minY);

            const reparent = newParentId && newParentId !== entity[PARENT_FIELD[entityType]];
            if (reparent) {
                const parentKey = COLLECTION[PARENT_TYPE[entityType]];
                if (!PARENT_FIELD[entityType] || !state.map[parentKey][newParentId]) return state;
            }
            if (cdx === 0 && cdy === 0 && !reparent) return state;

            const map = { ...state.map };
            for (const k of Object.keys(group)) {
                if (!group[k].length) continue;
                map[k] = { ...state.map[k] };
                for (const gid of group[k]) {
                const e = state.map[k][gid];
                map[k][gid] = { ...e, polygon: translatePolygon(e.polygon, cdx, cdy) };
                }
            }
            if (reparent) {
                const key = COLLECTION[entityType];
                map[key][id] = { ...map[key][id], [PARENT_FIELD[entityType]]: newParentId };
            }
            return commit(state, map);
        }

        case 'SET_POLYGON': {
            const { entityType, id } = action;
            const key = COLLECTION[entityType];
            const entity = state.map[key][id];
            if (!entity || !validPolygon(action.polygon)) return state;

            const polygon = cleanPolygon(action.polygon);
            if (polygon.length < 3) return state; // collapsed (e.g. a corner dropped onto a neighbor of a triangle)
            if (JSON.stringify(entity.polygon) === JSON.stringify(polygon)) return state;

            const map = { ...state.map, [key]: { ...state.map[key], [id]: { ...entity, polygon } } };
            return commit(state, map);
        }

        case 'UPDATE_ENTITY': {
            // action: { entityType, id, patch, coalesceKey? }
            const { entityType, id, patch, coalesceKey } = action;
            const key = COLLECTION[entityType];
            const entity = state.map[key][id];
            if (!entity) return state;

            const allowed = PATCHABLE[entityType];
            const clean = Object.fromEntries(Object.entries(patch).filter(([f]) => allowed.includes(f)));
            if (!Object.keys(clean).some((f) => entity[f] !== clean[f])) return state;

            const map = { ...state.map, [key]: { ...state.map[key], [id]: { ...entity, ...clean } } };
            return commit(state, map, { coalesceKey });
        }

        case 'DELETE_ENTITY': {
            // action { entityType, id } (cascades to children)
            const { entityType, id } = action;
            if (!state.map[COLLECTION[entityType]][id]) return state;

            const group = collectGroup(state.map, entityType, id);
            const map = { ...state.map };
            for(const k of Object.keys(group)) {
                if (!group[k].length) continue;
                map[k] = { ...state.map[k] };
                for (const gid of group[k]) delete map[k][gid];
            }
            return commit(state, map, {selection: pruneSelection(state.selection, map)});

        }

        // ---- history ----

        case 'UNDO': {
            if (!state.past.length) return state;
            const map = state.past[state.past.length - 1];
            return {
                ...state,
                map,
                past: state.past.slice(0, -1),
                future: [state.map, ...state.future],
                selection: pruneSelection(state.selection, map),
                coalesceKey: null,
            };
        }

        case 'REDO': {
            if (!state.future.length) return state;
            const [map, ...future] = state.future;
            return {
                ...state,
                map,
                past: [...state.past, state.map],
                future,
                selection: pruneSelection(state.selection, map),
                coalesceKey: null,
            };
        }

        default:
            return state;
    }
}

// ---------- selectors ----------

export const isDirty = (s) => s.map !== s.savedMap;
export const canUndo = (s) => s.past.length > 0;
export const canRedo = (s) => s.future.length > 0;