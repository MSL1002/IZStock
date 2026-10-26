import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { unlock as unlockApi, lock as lockApi } from '../api/manager';

const ManagerContext = createContext(null);

export function ManagerProvider({ children }) {
  // Memory only. A page refresh locks the dashboard again, which is intended.
  const [session, setSession] = useState(null); // { token, editedBy, expiresAt }
  const sessionRef = useRef(null);
  sessionRef.current = session;

  // Throws ApiError (INVALID_CODE, RATE_LIMITED, NETWORK) so the modal can show it.
  const unlock = useCallback(async (code) => {
    const res = await unlockApi(code.trim());
    setSession({ token: res.token, editedBy: res.editedBy, expiresAt: res.expiresAt });
  }, []);

  // Clear locally first so the UI locks immediately, then tell the server (best effort).
  const lock = useCallback(async () => {
    const current = sessionRef.current;
    setSession(null);
    if (current) {
      try { await lockApi(current.token); } catch { /* token expires on its own anyway */ }
    }
  }, []);

  // Drop the token locally when it expires. The server enforces expiry regardless.
  useEffect(() => {
    if (!session) return undefined;
    const ms = Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
    const id = setTimeout(() => setSession(null), ms);
    return () => clearTimeout(id);
  }, [session]);

  const value = useMemo(
    () => ({
      token: session?.token ?? null,
      editedBy: session?.editedBy ?? null,
      expiresAt: session?.expiresAt ?? null,
      isManager: Boolean(session),
      unlock,
      lock,
    }),
    [session, unlock, lock]
  );

  return <ManagerContext.Provider value={value}>{children}</ManagerContext.Provider>;
}

export function useManager() {
  const ctx = useContext(ManagerContext);
  if (!ctx) throw new Error('useManager must be used inside <ManagerProvider>');
  return ctx;
}