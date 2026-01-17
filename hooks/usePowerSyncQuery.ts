import { useEffect, useState } from 'react';
import { powerSync } from '@/lib/powersync/db';

/**
 * React hook for reactive PowerSync queries
 *
 * Automatically updates when local data changes via PowerSync sync.
 *
 * @param sql - SQL query string
 * @param parameters - Query parameters (use ? placeholders)
 * @returns Object with data, loading, and error state
 *
 * @example
 * ```typescript
 * const { data, loading, error } = usePowerSyncQuery<Program[]>(
 *   'SELECT * FROM Program WHERE userId = ? AND isArchived = ?',
 *   [userId, 0]
 * )
 *
 * if (loading) return <div>Loading...</div>
 * if (error) return <div>Error: {error.message}</div>
 * return <div>{data.length} programs found</div>
 * ```
 */
export function usePowerSyncQuery<T = any>(
  sql: string,
  parameters: any[] = []
): { data: T[]; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    const executeQuery = async () => {
      try {
        setLoading(true);
        setError(null);

        // Watch for changes (reactive query)
        const watcher = powerSync.watch(sql, parameters);

        for await (const result of watcher) {
          if (!isSubscribed) break;

          // Extract rows from result
          const rows = result.rows?._array || [];
          setData(rows as T[]);
          setLoading(false);
        }
      } catch (err) {
        if (!isSubscribed) return;

        console.error('PowerSync query error:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    };

    executeQuery();

    // Cleanup function
    return () => {
      isSubscribed = false;
    };
  }, [sql, JSON.stringify(parameters)]); // Re-run when query or params change

  return { data, loading, error };
}
