// src/features/manager/RequireManager.jsx
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useManager } from '../../context/ManagerContext';
import UnlockModal from './UnlockModal';

// Gates ENTRY to manager-only pages. Once the page has been entered it stays
// mounted even if the token later expires, so unsaved map edits are never thrown
// away. Re-unlocking mid-session is handled by the editor's own `needsUnlock` modal.
export default function RequireManager({ children }) {
  const { isManager } = useManager();
  const navigate = useNavigate();
  const entered = useRef(false);

  if (isManager) entered.current = true;
  if (entered.current) return children;

  return <UnlockModal show onCancel={() => navigate(-1)} />;
}