import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom'; // needs a data router (createBrowserRouter), v6.4+

export function useUnsavedWarning(dirty) {
  // Tab close / refresh. Browsers show their own generic text.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // In-app navigation. LeavePrompt renders when blocker.state === 'blocked'.
  const blocker = useBlocker(dirty);
  return {
    isBlocked: blocker.state === 'blocked',
    stay: () => blocker.reset?.(),
    leave: () => blocker.proceed?.(),
  };
}