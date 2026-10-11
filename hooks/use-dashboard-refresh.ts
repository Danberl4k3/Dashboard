'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardSnapshot } from '@/lib/dashboard/types';

export function useDashboardRefresh(
  initialSnapshot: DashboardSnapshot,
  intervalMs: number,
) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshingRef = useRef(false);

  const refresh = useCallback(async (force = false) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const response = await fetch(
        force ? '/api/dashboard?force=1' : '/api/dashboard',
        {
          cache: 'no-store',
          signal: AbortSignal.timeout(35_000),
        },
      );
      if (!response.ok)
        throw new Error(`Dashboard refresh failed (HTTP ${response.status})`);
      const nextSnapshot = (await response.json()) as DashboardSnapshot;
      setSnapshot(nextSnapshot);
    } catch (error) {
      setRefreshError(
        `${error instanceof Error ? error.message : 'No se pudo actualizar.'} Se mantienen los datos anteriores.`,
      );
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    const start = () => {
      if (interval !== undefined) window.clearInterval(interval);
      interval = undefined;
      if (!document.hidden) {
        interval = window.setInterval(() => void refresh(false), intervalMs);
      }
    };
    const handleVisibility = () => {
      start();
      if (!document.hidden) void refresh(false);
    };
    start();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (interval !== undefined) window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh, intervalMs]);

  return {
    snapshot,
    isRefreshing,
    refreshError,
    refresh,
  };
}
