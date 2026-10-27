// const issues = useMemo(
//   () => validateMap(state.map, { shelfItemCounts: state.shelfItemCounts }),
//   [state.map, state.shelfItemCounts]
// );
// const issueIndex = useMemo(() => issuesByEntity(issues), [issues]);

// <Button disabled={!isDirty(state) || !canSave(issues)} onClick={save}>Save map</Button>

// // In AisleShape, ShelfShape, etc.
// const bad = issueIndex.has(`aisle:${aisle.id}`);
// <Rect stroke={bad ? '#dc3545' : '#333'} />

// features/map-editor/MapEditorPage.js  (temporary, until Toolbar etc. exist)
import { MapEditorProvider } from './MapEditorProvider';
import MapEditorScreen from './MapEditorScreen';

const STORE_ID = 'store-1';

export default function MapEditorPage({ sampleMap = null }) {
  return (
    <MapEditorProvider storeId={STORE_ID} sampleMap={sampleMap}>
      <MapEditorScreen />
    </MapEditorProvider>
  );
}