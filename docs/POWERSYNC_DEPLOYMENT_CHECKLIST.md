# PowerSync Deployment Checklist

Use this checklist to verify your PowerSync integration is fully configured.

## ✅ Completed

- [x] **Supabase Auth Enabled**: PowerSync Dashboard → Client Auth → "Use Supabase Auth" checkbox
- [x] **JWT Secret Added**: Copied Supabase JWT Secret to PowerSync "Legacy" field
- [x] **PostgreSQL Publication**: Ran `CREATE PUBLICATION powersync FOR ALL TABLES` in Supabase SQL Editor
- [x] **Database User**: Created `powersync_role` with replication permissions
- [x] **PowerSync Connection**: Connected PowerSync to Supabase with proper credentials
- [x] **PowerSync Worker**: Worker loading correctly at `/@powersync/worker/WASQLiteDB.umd.js`

## 🔄 In Progress

- [ ] **Sync Rules Deployed**: Deploy `docs/powersync-sync-rules.yaml` in PowerSync Dashboard
  - Go to PowerSync Dashboard → Sync Rules
  - Paste YAML content
  - Click "Validate" button
  - Click "Deploy" button
  - Check "Logs" tab for sync activity

## 🔍 Verification Steps

After deploying sync rules, verify in browser console:

1. **Sync Status Check**:
   ```
   [PowerSync] Sync status: {
     connected: true,
     hasSynced: true,        ← Should be true
     lastSyncedAt: <timestamp>  ← Should have a date
   }
   ```

2. **Data Rows Check**:
   ```
   [PowerSync] Active strength programs: X rows  ← X should be > 0
   [PowerSync] Active cardio programs: X rows     ← X should be > 0
   ```

3. **No Error Messages**: Console should not show:
   - "No such table" errors
   - "No such column" errors
   - Authorization/RLS errors

## 🐛 Troubleshooting

If still getting 0 rows after deploying sync rules:

### Check PowerSync Dashboard Logs
1. Go to PowerSync Dashboard → Logs
2. Look for errors related to:
   - Table permissions
   - SQL syntax errors in sync rules
   - Replication issues

### Verify Database Permissions
Run in Supabase SQL Editor:
```sql
-- Check if powersync_role can read tables
SELECT * FROM "Program" LIMIT 1;
SELECT * FROM "CardioProgram" LIMIT 1;
```

### Check Publication
Run in Supabase SQL Editor:
```sql
-- Verify publication exists and includes tables
SELECT * FROM pg_publication_tables WHERE pubname = 'powersync';
```

Should return rows for all 13 tables: Program, Week, Workout, Exercise, PrescribedSet, WorkoutCompletion, LoggedSet, CardioProgram, CardioWeek, PrescribedCardioSession, LoggedCardioSession, UserCardioMetricPreferences, ExerciseDefinition.

### Enable Debug Logging
In PowerSync Dashboard, you may be able to enable debug logging to see exactly what queries are running.

## 📝 RLS Policies (Optional - Phase 2)

RLS policies provide an additional security layer on top of sync rules. These are optional for Phase 1 but recommended for production:

- [ ] Apply RLS policies from `prisma/rls-policies.sql` (if it exists)
- [ ] Test that RLS doesn't block legitimate user queries
- [ ] Verify RLS blocks cross-user data access

## 🎯 Success Criteria

You'll know PowerSync is working when:
1. ✅ Console shows `hasSynced: true`
2. ✅ Programs appear in the UI (non-zero row counts)
3. ✅ Data persists after page refresh (cached in IndexedDB)
4. ✅ Offline mode works (disconnect network, data still loads)

---

**Next Phase**: Once Phase 1 (read-only sync) works, Phase 2 will add write operations (creating/updating/deleting data locally and syncing to Supabase).
