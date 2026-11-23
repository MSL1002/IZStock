import { useCallback, useEffect, useState } from 'react';
import { listItems } from '../../api/items';

export function useItems({ q, page, pageSize }) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    listItems({ page, pageSize, q }, { signal: ctrl.signal })
      .then((res) => setData({ items: res.items ?? [], total: res.total ?? 0 }))
      .catch((err) => { if (err.name !== 'AbortError') setError(err); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [q, page, pageSize, tick]);

  return { ...data, loading, error, refresh };
}