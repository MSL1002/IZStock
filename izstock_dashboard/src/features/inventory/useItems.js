import { useCallback, useEffect, useState } from 'react';
import { listItems } from '../../api/items';

export function useItems({ q, pg, pgSize }) {

  console.log('useItems caled', { q, pg, pgSize })

  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  if ( !pg ) pg = 1
  if (! pgSize ) pgSize = 15

  useEffect(() => {
    console.log('fetching items', { pg, pgSize, q });
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    listItems({ pg, pgSize, q }, { signal: ctrl.signal })
      .then((res) => setData({ items: res.items ?? [], total: res.total ?? 0 }))
      .catch((err) => { if (err.name !== 'AbortError') setError(err); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [q, pg, pgSize, tick]);

  return { ...data, loading, error, refresh };
}