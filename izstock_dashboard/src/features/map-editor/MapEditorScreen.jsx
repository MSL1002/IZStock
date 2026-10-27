import { Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useMapEditor } from './MapEditorProvider';
import { useUnsavedWarning } from './hooks/useUnsavedWarning';
import { useEditorShortcuts } from './hooks/useEditorShortcuts';
import UnlockModal from '../manager/UnlockModal';
import Toolbar from './components/Toolbar';
import EditorCanvas from './components/EditorCanvas';
import IssueList from './components/IssueList';
import PropertiesPanel from './components/PropertiesPanel';
import { StaleVersionModal, LeavePrompt, LoadFailed } from './components/EditorModals';

export default function MapEditorScreen() {
    const {
        state, status, loadError, reload,
        dirty, conflict, needsUnlock, dismissUnlock,
    } = useMapEditor();
    const navigate = useNavigate();

    // Hooks always run, before any early return
    const guard = useUnsavedWarning(dirty);
    useEditorShortcuts();

    if (status === 'loading') {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <Spinner animation="border" role="status" aria-label="Loading map" />
            </div>
        );
    }
    if (status === 'locked') {
        // Token expired before the first load finished: unlock, and the provider retries
        return <UnlockModal show onCancel={() => navigate('/')} />;
    }
    if (status === 'error') {
        return <LoadFailed error={loadError} onRetry={reload} />;
    }

    return (
        <div className="d-flex flex-column" style={{ height: '100vh' }}>
            <Toolbar />
            <div className="d-flex" style={{ flex: 1, minHeight: 0 }}>
                <div className="d-flex flex-column" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <EditorCanvas />
                    </div>
                    <IssueList />
                </div>
                <PropertiesPanel />
            </div>

            {/* Token expired mid-session: edits stay in memory; unlock, then click Save again */}
            <UnlockModal show={needsUnlock} onCancel={dismissUnlock} />
            <StaleVersionModal show={conflict} map={state.map} units={state.units} onReload={reload} />
            <LeavePrompt show={guard.isBlocked} onStay={guard.stay} onLeave={guard.leave} />
        </div>
    );
}