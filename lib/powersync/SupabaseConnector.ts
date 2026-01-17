import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
} from '@powersync/web';
import { createClient } from '@/lib/supabase/client';

/**
 * PowerSync connector for Supabase authentication and data upload
 *
 * Handles:
 * - fetchCredentials: Provides Supabase JWT for PowerSync authentication
 * - uploadData: Uploads local changes to Supabase (Phase 2)
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const supabase = createClient();

    // Get current Supabase session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      console.error('[SupabaseConnector] Authentication failed:', error?.message || 'No active session');
      throw new Error('Could not fetch Supabase session: ' + (error?.message || 'No session'));
    }

    console.log('[SupabaseConnector] Authenticated as user:', session.user?.id);

    // Return PowerSync endpoint and Supabase JWT
    return {
      endpoint: process.env.NEXT_PUBLIC_POWERSYNC_URL!,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    // Phase 1: Read-only queries, no uploads needed
    // Phase 2: Will implement CRUD operations upload to Supabase

    const transaction = await database.getNextCrudTransaction();
    if (!transaction) {
      return;
    }

    // For now, just mark as complete (no-op)
    // In Phase 2, we'll process transaction.crud entries and upload to Supabase
    await transaction.complete();
  }
}
