import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ManagerProvider } from './context/ManagerContext';
import RequireManager from './features/manager/RequireManager';
import MapEditorPage from './features/map-editor/MapEditorPage';
import InventoryPage from './features/inventory/InventoryPage';
import { sampleMap } from './features/map-editor/sampleMap';
import AddItemPage from './features/inventory/AddItemPage';


const router = createBrowserRouter([
  {
    path: '/',
    element: <InventoryPage />,
  },
  {
    path: '/items/new',
    element: <AddItemPage />,
  },
  {
    path: '/items/:sku/edit',
    element: <div className="p-4">Edit item form (W7)</div>,
  },
  {
    path: '/map-editor',
    element: (
      <RequireManager>
        <MapEditorPage />
      </RequireManager>
    ),
  },
  { 
    path: '/map-editor-sample',
    element: 
      <MapEditorPage sampleMap={sampleMap} />
  }
]);

export default function App() {
  return (
    <ManagerProvider>
      <RouterProvider router={router} />
    </ManagerProvider>
  );
}