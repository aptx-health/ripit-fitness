# PowerSync + Supabase Integration Reference

This document provides a complete reference for integrating PowerSync with your Next.js + Supabase application to achieve local-first, offline-capable functionality with instant queries.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Enable Replication in Supabase](#step-1-enable-replication-in-supabase)
- [Step 2: Connect PowerSync to Supabase](#step-2-connect-powersync-to-supabase)
- [Step 3: Define Sync Rules](#step-3-define-sync-rules)
- [Step 4: Install Dependencies](#step-4-install-dependencies)
- [Step 5: Environment Variables](#step-5-environment-variables)
- [Step 6: Initialize PowerSync](#step-6-initialize-powersync)
- [Step 7: Query Data Locally](#step-7-query-data-locally)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

---

## Overview

PowerSync creates a local SQLite database on the client that automatically syncs bidirectionally with your Supabase Postgres database. This provides:

- ⚡ **Instant queries** (no network latency)
- 📱 **Offline support** out of the box
- 🔄 **Real-time sync** with automatic conflict resolution
- 🔒 **Row-level security** via Sync Rules
- 🚀 **Non-invasive** (no Supabase schema changes required)

**Architecture:**
```
Client (SQLite) ↔ PowerSync Service ↔ Supabase (Postgres)
```

---

## Prerequisites

- ✅ Supabase account and project set up
- ✅ PowerSync Cloud account (free tier available)
- ✅ Next.js application with Supabase configured
- ✅ Basic understanding of SQL and your database schema

---

## Step 1: Enable Replication in Supabase

PowerSync needs to read changes from your Postgres database using logical replication.

### Create a Publication

Go to **Supabase Dashboard** → **SQL Editor** and run:

```sql
-- Create a publication for PowerSync to replicate all tables
CREATE PUBLICATION powersync FOR ALL TABLES;
```

### Alternative: Selective Tables

If you only want to sync specific tables:

```sql
-- Only sync specific tables
CREATE PUBLICATION powersync FOR TABLE todos, profiles, workouts;
```

⚠️ **Important**: Any tables not in the publication won't sync to PowerSync.

---

## Step 2: Connect PowerSync to Supabase

### Get Your Connection String

1. Go to **Supabase Dashboard** → **Project Settings** → **Database**
2. Copy the **Connection string** (URI format)
   - Example: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

### Configure PowerSync

1. Go to **PowerSync Dashboard** → **Database Connections**
2. Click **Add Connection**
3. Paste your Supabase connection string into the **URI** field
4. PowerSync will auto-parse the connection details
5. Set **SSL Mode** to `verify-full` (Supabase's CA cert is pre-loaded)
6. Click **Test Connection** to verify
7. **Save** the connection

---

## Step 3: Define Sync Rules

Sync Rules control which data syncs to which users. They're written in YAML using SQL-like syntax.

### Basic Example: User-Specific Data

```yaml
# sync-rules.yaml
bucket_definitions:
  # Each user gets their own data
  user_data:
    parameters: SELECT request.user_id() as user_id
    data:
      # Sync user's todos
      - SELECT * FROM todos WHERE user_id = bucket.user_id
      # Sync user's profile
      - SELECT * FROM profiles WHERE id = bucket.user_id
      # Sync user's workouts
      - SELECT * FROM workouts WHERE user_id = bucket.user_id
```

### Advanced Example: Shared Data

```yaml
bucket_definitions:
  # User's own data
  user_data:
    parameters: SELECT request.user_id() as user_id
    data:
      - SELECT * FROM profiles WHERE id = bucket.user_id
      - SELECT * FROM user_settings WHERE user_id = bucket.user_id

  # Workouts (own + shared)
  workout_data:
    parameters: |
      SELECT id as workout_id
      FROM workouts
      WHERE user_id = request.user_id()
         OR shared_with_user_id = request.user_id()
    data:
      - SELECT * FROM workouts WHERE id = bucket.workout_id
      - SELECT * FROM workout_sessions WHERE workout_id = bucket.workout_id
      - SELECT * FROM exercises WHERE workout_id = bucket.workout_id

  # Global reference data (everyone gets this)
  global_data:
    global: true
    data:
      - SELECT * FROM exercise_library
      - SELECT * FROM muscle_groups
```

### Key Concepts

- **Buckets**: Logical groups of data for a user
- **Parameters**: SQL queries that determine which buckets a user has access to
- **Data**: SQL queries that define what data goes into each bucket
- **request.user_id()**: Built-in function that returns the authenticated user's ID from Supabase JWT

### Deploy Sync Rules

1. Save your rules in the **PowerSync Dashboard** → **Sync Rules** editor
2. Click **Deploy** to activate them
3. Monitor the **Logs** tab for any errors

⚠️ **Important**: Sync Rules are server-side security. Always validate permissions!

---

## Step 4: Install Dependencies

```bash
npm install @powersync/web @powersync/common @supabase/supabase-js
```

### Package Breakdown

- `@powersync/web`: PowerSync SDK for web/React applications
- `@powersync/common`: Shared types and utilities
- `@supabase/supabase-js`: Supabase client (you likely already have this)

---

## Step 5: Environment Variables

Add to your `.env.local`:

```env
# Existing Supabase variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Add PowerSync variables
NEXT_PUBLIC_POWERSYNC_URL=https://your-instance.powersync.journeyapps.com
```

Get your PowerSync URL from **PowerSync Dashboard** → **Instance Settings**.

---

## Step 6: Initialize PowerSync

### 6.1: Define Your Schema

Create `lib/powersync/schema.ts`:

```typescript
import { Column, ColumnType, Schema, Table } from '@powersync/web';

export const AppSchema = new Schema([
  new Table({
    name: 'todos',
    columns: [
      new Column({ name: 'id', type: ColumnType.TEXT }),
      new Column({ name: 'description', type: ColumnType.TEXT }),
      new Column({ name: 'completed', type: ColumnType.INTEGER }),
      new Column({ name: 'user_id', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
    ],
    indexes: [
      { name: 'user_todos', columns: ['user_id', 'completed'] }
    ]
  }),
  new Table({
    name: 'profiles',
    columns: [
      new Column({ name: 'id', type: ColumnType.TEXT }),
      new Column({ name: 'username', type: ColumnType.TEXT }),
      new Column({ name: 'avatar_url', type: ColumnType.TEXT }),
    ]
  }),
  new Table({
    name: 'workouts',
    columns: [
      new Column({ name: 'id', type: ColumnType.TEXT }),
      new Column({ name: 'name', type: ColumnType.TEXT }),
      new Column({ name: 'user_id', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
    ],
    indexes: [
      { name: 'user_workouts', columns: ['user_id'] }
    ]
  }),
]);
```

⚠️ **Important**: Schema must match your Supabase tables and Sync Rules.

### 6.2: Create Supabase Connector

Create `lib/powersync/SupabaseConnector.ts`:

```typescript
import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/web';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseConnector implements PowerSyncBackendConnector {
  constructor(private supabase: SupabaseClient) {}

  async fetchCredentials() {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();

    if (!session || error) {
      throw new Error('Could not fetch Supabase credentials');
    }

    return {
      endpoint: process.env.NEXT_PUBLIC_POWERSYNC_URL!,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    let lastOp: CrudEntry | null = null;

    try {
      // Upload each operation to Supabase
      for (const op of transaction.crud) {
        lastOp = op;

        const table = this.supabase.from(op.table);

        switch (op.op) {
          case UpdateType.PUT:
            await table.upsert(op.opData);
            break;
          case UpdateType.PATCH:
            await table.update(op.opData).eq('id', op.id);
            break;
          case UpdateType.DELETE:
            await table.delete().eq('id', op.id);
            break;
        }
      }

      // Mark transaction as complete
      await transaction.complete();
    } catch (error) {
      console.error('Error uploading data:', error);
      console.error('Failed operation:', lastOp);
      throw error;
    }
  }
}
```

### 6.3: Initialize PowerSync Database

Create `lib/powersync/db.ts`:

```typescript
'use client';

import { PowerSyncDatabase } from '@powersync/web';
import { createClient } from '@/lib/supabase/client';
import { AppSchema } from './schema';
import { SupabaseConnector } from './SupabaseConnector';

// Singleton instance
let powerSyncInstance: PowerSyncDatabase | null = null;

export function getPowerSync(): PowerSyncDatabase {
  if (!powerSyncInstance) {
    powerSyncInstance = new PowerSyncDatabase({
      database: {
        dbFilename: 'fitcsv-local.db',
      },
      schema: AppSchema,
    });

    // Connect to Supabase
    const supabase = createClient();
    const connector = new SupabaseConnector(supabase);

    powerSyncInstance.connect(connector).catch((error) => {
      console.error('Failed to connect PowerSync:', error);
    });
  }

  return powerSyncInstance;
}

// Export singleton
export const powerSync = getPowerSync();
```

### 6.4: Create a React Hook

Create `hooks/usePowerSync.ts`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { powerSync } from '@/lib/powersync/db';

export function usePowerSyncQuery<T = any>(
  sql: string,
  parameters: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);

    // Watch for changes to the query
    const unsubscribe = powerSync.watch(sql, parameters, {
      onResult: (result) => {
        setData(result.rows?._array || []);
        setLoading(false);
        setError(null);
      },
      onError: (err) => {
        console.error('Query error:', err);
        setError(err);
        setLoading(false);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [sql, JSON.stringify(parameters)]);

  return { data, loading, error };
}
```

---

## Step 7: Query Data Locally

Now you can query your local SQLite database with zero network latency!

### Basic Query

```typescript
import { powerSync } from '@/lib/powersync/db';

// Get all todos
const todos = await powerSync.getAll('SELECT * FROM todos ORDER BY created_at DESC');

// Get completed todos
const completed = await powerSync.getAll(
  'SELECT * FROM todos WHERE completed = ? AND user_id = ?',
  [1, userId]
);
```

### React Component Example

```typescript
'use client';

import { usePowerSyncQuery } from '@/hooks/usePowerSync';

export function TodoList({ userId }: { userId: string }) {
  const { data: todos, loading } = usePowerSyncQuery(
    'SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          {todo.description} {todo.completed ? '✅' : '⭕'}
        </li>
      ))}
    </ul>
  );
}
```

### Insert/Update Data

```typescript
import { powerSync } from '@/lib/powersync/db';
import { v4 as uuid } from 'uuid';

// Insert new todo
await powerSync.execute(
  'INSERT INTO todos (id, description, completed, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
  [uuid(), 'Learn PowerSync', 0, userId, new Date().toISOString()]
);

// Update todo
await powerSync.execute(
  'UPDATE todos SET completed = ? WHERE id = ?',
  [1, todoId]
);

// Delete todo
await powerSync.execute(
  'DELETE FROM todos WHERE id = ?',
  [todoId]
);
```

Changes are automatically uploaded to Supabase and synced to other devices!

---

## Common Patterns

### Pattern 1: Optimistic Updates

```typescript
async function toggleTodo(id: string, currentState: boolean) {
  // Update local DB immediately (instant UI feedback)
  await powerSync.execute(
    'UPDATE todos SET completed = ? WHERE id = ?',
    [!currentState ? 1 : 0, id]
  );

  // PowerSync handles syncing to Supabase in background
  // If there's a conflict, it'll resolve automatically
}
```

### Pattern 2: Pagination

```typescript
function usePaginatedTodos(userId: string, page: number, pageSize: number = 20) {
  const offset = page * pageSize;

  return usePowerSyncQuery(
    'SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, pageSize, offset]
  );
}
```

### Pattern 3: Aggregations

```typescript
const stats = await powerSync.getAll(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as pending
  FROM todos
  WHERE user_id = ?
`, [userId]);
```

### Pattern 4: Joins

```typescript
const workoutsWithExercises = await powerSync.getAll(`
  SELECT
    w.id,
    w.name,
    w.created_at,
    COUNT(e.id) as exercise_count
  FROM workouts w
  LEFT JOIN exercises e ON w.id = e.workout_id
  WHERE w.user_id = ?
  GROUP BY w.id
`, [userId]);
```

### Pattern 5: Full-Text Search

```typescript
// Create virtual FTS table (one-time setup)
await powerSync.execute(`
  CREATE VIRTUAL TABLE IF NOT EXISTS todos_fts USING fts5(
    description,
    content=todos,
    content_rowid=rowid
  )
`);

// Search todos
const results = await powerSync.getAll(`
  SELECT * FROM todos
  WHERE rowid IN (
    SELECT rowid FROM todos_fts WHERE description MATCH ?
  )
`, [searchQuery]);
```

---

## Troubleshooting

### Issue: PowerSync Not Syncing

**Check:**
1. Is the publication created? (`SELECT * FROM pg_publication;`)
2. Are Sync Rules deployed in PowerSync Dashboard?
3. Is the user authenticated? (Check Supabase session)
4. Check PowerSync Dashboard → Logs for errors

### Issue: Schema Mismatch

**Error**: `Column 'xyz' not found`

**Fix**: Update your local schema in `lib/powersync/schema.ts` to match Supabase tables.

### Issue: Slow Sync

**Check:**
- Is your Sync Rule query optimized?
- Add indexes to Supabase for columns in WHERE clauses
- Reduce amount of data synced (use more specific Sync Rules)

### Issue: Data Not Appearing

**Check:**
1. Does user have permission in Sync Rules?
2. Is `request.user_id()` returning correct value?
3. Check row-level security policies in Supabase
4. Look at PowerSync Dashboard → Sync Status

### Issue: Upload Failures

**Error**: `Failed to upload data`

**Check:**
- Do Supabase RLS policies allow the operation?
- Is the table name correct in `SupabaseConnector`?
- Check Supabase logs for rejected operations

### Debug Mode

Enable verbose logging:

```typescript
import { Logger } from '@powersync/web';

// In development
if (process.env.NODE_ENV === 'development') {
  Logger.setLogLevel('debug');
}
```

---

## Resources

### Official Documentation
- [PowerSync + Supabase Integration Guide](https://docs.powersync.com/integration-guides/supabase-+-powersync)
- [PowerSync JavaScript SDK](https://docs.powersync.com/client-sdk-references/js-web)
- [Sync Rules Reference](https://docs.powersync.com/usage/sync-rules)

### Example Projects
- [Next.js + Supabase Todo Demo](https://github.com/powersync-ja/powersync-supabase-vercel-todolist-demo)
- [React Multi-Client Demo](https://github.com/powersync-ja/powersync-js/tree/main/demos/react-multi-client)
- [Vue + Supabase Template](https://github.com/powersync-ja/vue-supabase-todolist-template)

### Articles
- [PowerSync and Supabase: Just the Basics](https://www.powersync.com/blog/powersync-and-supabase-just-the-basics)
- [Building an Offline-First Chat App](https://bndkt.com/blog/2023/building-an-offline-first-chat-app-using-powersync-and-supabase)

### Community
- [PowerSync GitHub](https://github.com/powersync-ja)
- [PowerSync Discord](https://discord.gg/powersync)

---

## Next Steps

1. ✅ Start with a simple table (like `todos` or `profiles`)
2. ✅ Test sync by making changes in Supabase Dashboard
3. ✅ Test offline: disconnect network, make changes, reconnect
4. ✅ Gradually add more tables to your Sync Rules
5. ✅ Optimize with indexes and smarter Sync Rules
6. ✅ Deploy to production!

---

**Last Updated**: January 2026
