import { useCallback, useEffect, useState } from 'react';
import { getItem } from '../../api/items';


export function useItem(sku) {
    const [state, setState] = useState({ status: 'loading', item: null, error: null });
    const [tick, setTick] = useState(0);
    const reload = useCallback(() => setTick((t) => t + 1), []);

    useEffect(() => {
        const ctrl = new AbortController();
        setState({ status: 'loading', item: null, error: null });
        getItem(sku, { signal: ctrl.signal })
        .then((item) => setState({ status: 'ready', item, error: null }))
        .catch((err) => {
            if (err.name === 'AbortError') return;
            if (err.code === 'NOT_FOUND') setState({ status: 'notfound', item: null, error: null });
            else setState({ status: 'error', item: null, error: err });
        });
        return () => ctrl.abort();
    }, [sku, tick]);

    return { ...state, reload };
}