# Logging Configuration

This project uses [Pino](https://getpino.io/) for high-performance structured logging.

## Configuration

Logging is controlled via environment variables:

### Server-Side Logging (API routes, server components)

```bash
# Set in .env or Doppler
PINO_LOG_LEVEL="info"
```

Available levels (ordered by severity):
- `trace` (10) - Very detailed debugging
- `debug` (20) - Detailed debugging (use for completion flow debugging)
- `info` (30) - General informational messages (default)
- `warn` (40) - Warning messages
- `error` (50) - Error messages
- `fatal` (60) - Fatal errors (app crash)
- `silent` - Disable all logging

### Client-Side Logging (browser, client components)

```bash
# Set in .env or Doppler
NEXT_PUBLIC_LOG_LEVEL="info"
```

Available levels:
- `debug` - Show debug logs
- `info` - Show info/warn/error (default)
- `silent` - Disable all logging

## Usage

### Server-Side (API routes, server components)

```typescript
import { logger } from '@/lib/logger'

// Debug logs (hidden by default, set PINO_LOG_LEVEL=debug to see)
logger.debug({ userId: '123', programId: 'abc' }, 'User authenticated')

// Info logs (shown by default)
logger.info({ archivedCompletions: 5 }, 'Program restarted successfully')

// Warnings
logger.warn({ count: 0 }, 'No items found')

// Errors
logger.error({ error, programId }, 'Failed to restart program')
```

### Client-Side (components, hooks)

```typescript
import { clientLogger } from '@/lib/logger'

// Debug logs (hidden by default, set NEXT_PUBLIC_LOG_LEVEL=debug to see)
clientLogger.debug('[CompletionModal] Opening modal for program:', programId)

// Info logs
clientLogger.info('Successfully archived workout completions')

// Warnings
clientLogger.warn('Connection unstable')

// Errors
clientLogger.error('Error restarting program:', error)
```

## Development Workflow

### Enable Debug Logs

To see detailed logs for the program completion flow:

```bash
# In Doppler
doppler secrets set PINO_LOG_LEVEL=debug
doppler secrets set NEXT_PUBLIC_LOG_LEVEL=debug

# Or in .env
PINO_LOG_LEVEL="debug"
NEXT_PUBLIC_LOG_LEVEL="debug"
```

Then restart your development server.

### Production Logging

Keep logging minimal in production:

```bash
PINO_LOG_LEVEL="info"
NEXT_PUBLIC_LOG_LEVEL="info"
```

This will only show info/warn/error/fatal logs, hiding all debug logs.

## Log Format

### Development
Logs use `pino-pretty` for human-readable output:
```
[14:23:45] INFO: Program restarted successfully
    programId: "abc123"
    archivedCompletions: 5
```

### Production
Logs output structured JSON for log aggregation tools (Datadog, CloudWatch, etc.):
```json
{"level":"info","time":1706826225,"programId":"abc123","archivedCompletions":5,"msg":"Program restarted successfully"}
```

## Benefits

1. **Performance**: Pino is 5x faster than Winston with async logging
2. **Structured Data**: JSON output perfect for observability platforms
3. **Environment Control**: Hide debug logs in production via environment variables
4. **Next.js 15 Compatible**: Works with both server and client components
5. **Zero Overhead**: Debug logs have zero performance impact when disabled

## Migrated Components

The following completion flow components now use the logger:

**API Routes:**
- `/api/programs/[programId]/restart` - Program restart logging
- `/api/programs/[programId]/completion-status` - Completion status checks
- `/api/programs/[programId]/completion-stats` - Stats fetching

**Components:**
- `components/StrengthWeekView.tsx` - Week view completion checks
- `components/ProgramCompletionModal.tsx` - Celebration modal flow

## Future Migration

To migrate console.log/error calls in other files:

1. Import the appropriate logger:
   ```typescript
   // Server-side
   import { logger } from '@/lib/logger'

   // Client-side
   import { clientLogger } from '@/lib/logger'
   ```

2. Replace console calls:
   ```typescript
   // Before
   console.error('Error:', error)

   // After (server)
   logger.error({ error }, 'Error message')

   // After (client)
   clientLogger.error('Error:', error)
   ```

3. Use appropriate log levels based on importance
