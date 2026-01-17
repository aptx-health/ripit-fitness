import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './schema';
import { SupabaseConnector } from './SupabaseConnector';

/**
 * PowerSync database singleton
 *
 * Provides local SQLite database that syncs bidirectionally with Supabase.
 * Database is stored in IndexedDB as 'fitcsv-local.db'.
 *
 * Usage:
 * ```typescript
 * import { powerSync } from '@/lib/powersync/db'
 *
 * // Query data
 * const programs = await powerSync.getAll('SELECT * FROM Program WHERE userId = ?', [userId])
 *
 * // Watch for changes (reactive)
 * for await (const result of powerSync.watch('SELECT * FROM Program WHERE userId = ?', [userId])) {
 *   console.log('Programs updated:', result.rows)
 * }
 * ```
 */

let powerSyncInstance: PowerSyncDatabase | null = null;

export function getPowerSync(): PowerSyncDatabase {
  // Only initialize on client side
  if (typeof window === 'undefined') {
    throw new Error('PowerSync can only be used in the browser');
  }

  if (powerSyncInstance) {
    return powerSyncInstance;
  }

  console.log('[PowerSync DB] Initializing PowerSync with worker: /@powersync/worker/WASQLiteDB.umd.js');

  // Initialize PowerSync database with modern constructor API
  powerSyncInstance = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'fitcsv-local.db',
    },
    sync: {
      // Point to worker in public directory (copied via npx powersync-web copy-assets)
      worker: '/@powersync/worker/WASQLiteDB.umd.js',
    },
    flags: {
      // Disable web workers to fix Chrome stalling issue
      // See: https://docs.powersync.com/resources/troubleshooting
      useWebWorker: false,
    },
  });

  // Connect to Supabase via PowerSync
  const connector = new SupabaseConnector();
  powerSyncInstance.connect(connector);

  console.log('[PowerSync DB] Connection initiated');

  return powerSyncInstance;
}

// Lazy initialization - only create when first accessed on client
let _powerSyncClient: PowerSyncDatabase | null = null;

export const powerSync = new Proxy({} as PowerSyncDatabase, {
  get(target, prop) {
    if (!_powerSyncClient) {
      _powerSyncClient = getPowerSync();
    }
    return (_powerSyncClient as any)[prop];
  },
});
