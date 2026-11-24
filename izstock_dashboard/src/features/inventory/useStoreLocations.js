import { useCallback, useEffect, useState } from 'react';
import { getLocations } from '../../api/map';
import { flattenLocations } from './locations';

// status: 'loading' | 'ready' | 'empty' (no map published yet) | 'error'
export function useStoreLocations() {
    const [state, setState] = useState({ status: 'loading', aisles: [], error: null });
    const [tick, setTick] = useState(0);
    const reload = useCallback(() => setTick((t) => t + 1), []);

    useEffect(() => {
        const ctrl = new AbortController();
        setState((s) => ({ ...s, status: 'loading', error: null }));
        getLocations({ signal: ctrl.signal })
        .then((map) => {
            const aisles = flattenLocations(map);
            setState({ status: aisles.length ? 'ready' : 'empty', aisles, error: null });
        })
        .catch((err) => {
            if (err.name === 'AbortError') return;
            if (err.code === 'NOT_FOUND') setState({ status: 'empty', aisles: [], error: null });
            else setState({ status: 'error', aisles: [], error: err });
        });
        return () => ctrl.abort();
    }, [tick]);

    return { ...state, reload };
}