import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ManagerProvider } from './context/ManagerContext';
import RequireManager from './features/manager/RequireManager';
import MapEditorPage from './features/map-editor/MapEditorPage';
import { sampleMap } from './features/map-editor/sampleMap';


const router = createBrowserRouter([
  {
    path: '/',
    element: <div className="p-4">Dashboard home (placeholder)</div>,
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
  },
]);

export default function App() {
  return (
    <ManagerProvider>
      <RouterProvider router={router} />
    </ManagerProvider>
  );
}