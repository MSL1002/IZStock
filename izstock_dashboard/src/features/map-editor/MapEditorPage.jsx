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