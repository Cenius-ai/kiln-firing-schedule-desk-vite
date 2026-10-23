import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal data hook: one request, three explicit states (loading / error / data)
 * and a `reload` that re-runs the same call (used by every retry banner).
 */
export function useApiData(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(() => loaderRef.current())
      .then((result) => {
        if (!active) return;
        setData(result);
        setLoading(false);
      })
      .catch((failure) => {
        if (!active) return;
        setError(failure);
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { data, error, loading, reload };
}
