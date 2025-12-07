# Next.js + BetterAuth + Supabase + Doppler - Architecture Reference

> **Comprehensive guide for building production-ready Next.js applications with modern authentication, database, and deployment patterns**

## Technology Stack

### Core Framework
- **Next.js 15** with App Router and Turbopack
- **TypeScript** for type safety throughout
- **React 19** with Server Components
- **Tailwind CSS v4** for styling

### Backend Services
- **Supabase (PostgreSQL)** - Database with Row Level Security
- **Prisma ORM** - Type-safe database access
- **BetterAuth** - Modern authentication solution
- **Doppler** - Environment variable and secrets management

### Deployment & Infrastructure
- **Vercel** - Serverless hosting and edge functions
- **GitHub Actions** - CI/CD pipeline
- **Vercel Analytics** (optional) - Performance monitoring

---

## Table of Contents
1. [Architectural Principles](#architectural-principles)
2. [Project Structure](#project-structure)
3. [Database Architecture](#database-architecture)
4. [Authentication Patterns](#authentication-patterns)
5. [API Design Patterns](#api-design-patterns)
6. [Environment Management](#environment-management)
7. [Error Handling](#error-handling)
8. [Security Patterns](#security-patterns)
9. [Development Workflow](#development-workflow)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Strategy](#deployment-strategy)
12. [Common Pitfalls](#common-pitfalls)

---

## Architectural Principles

### Core Design Decisions

**1. Database as Source of Truth**
- PostgreSQL stores all application state
- Workflows and async jobs tracked in database tables
- Real-time updates via Supabase subscriptions

**2. Event-Driven Architecture**
- Jobs spawn subsequent jobs upon completion
- Database triggers for workflow progression
- Server-sent events for UI updates

**3. Separation of Concerns**
```
┌─────────────────┐
│   UI Layer      │  Next.js Server/Client Components
├─────────────────┤
│   API Layer     │  Route Handlers, Server Actions
├─────────────────┤
│ Business Logic  │  /lib directory - Pure TypeScript
├─────────────────┤
│   Data Layer    │  Prisma + PostgreSQL
└─────────────────┘
```

**4. Type Safety First**
- TypeScript strict mode enabled
- Prisma-generated types for database
- Zod for runtime validation
- No `any` types in production code

---

## Project Structure

### Directory Organization

```
/app                      # Next.js App Router
  /api                    # API route handlers
    /auth                 # BetterAuth endpoints
    /[resource]           # Resource-specific APIs
      /[id]              # Dynamic routes
        route.ts         # GET, POST, PUT, DELETE
  /[route]               # Application pages
    page.tsx             # Route page component
    layout.tsx           # Route-specific layout
    loading.tsx          # Loading state
    error.tsx            # Error boundary

/lib                      # Business logic (max 200 lines per file)
  /auth                   # Authentication utilities
  /db                     # Database utilities
  /workflows              # Workflow orchestration
    /creators.ts          # Workflow creation functions
    /engine.ts            # Workflow execution engine
    /types.ts             # Workflow type definitions
  /validation             # Input validation schemas
  /utils                  # Shared utilities

/components               # React components
  /ui                     # Reusable UI components
  /features               # Feature-specific components

/prisma                   # Database schema and migrations
  schema.prisma           # Database schema definition
  /migrations             # Migration files (version controlled)
  seed.ts                 # Database seeding

/types                    # Shared TypeScript types
/hooks                    # React hooks
/contexts                 # React contexts
/config                   # Configuration files
```

### File Organization Rules

**Size Limits**
- **Max 200 lines per file** - Split into multiple files if exceeded
- **Single Responsibility Principle** - One main purpose per file
- **Explicit exports** - No barrel exports that obscure dependencies

**Naming Conventions**
- **Files**: kebab-case (`user-settings.ts`)
- **Components**: PascalCase (`UserProfile.tsx`)
- **Functions**: camelCase (`getUserSettings`)
- **Types/Interfaces**: PascalCase (`UserSettings`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)

**Import Organization**
```typescript
// 1. External dependencies
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 2. Internal - types first
import type { User, Session } from '@/types';

// 3. Internal - utilities and helpers
import { prisma } from '@/lib/db';
import { validateRequest } from '@/lib/validation';

// 4. Internal - components
import { Button } from '@/components/ui/button';
```

---

## Database Architecture

### Prisma Schema Patterns

#### Core Schema Design
```prisma
// Multi-tenant data isolation
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  sessions       Session[]

  @@index([organizationId])
  @@index([email])
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  users     User[]

  @@index([name])
}

// Workflow pattern for async operations
model Workflow {
  id          String   @id @default(cuid())
  type        String   // 'data_processing', 'report_generation'
  status      String   // 'pending', 'running', 'completed', 'failed'
  currentStep String?  // Current processing step
  context     Json     // Workflow-specific data

  userId      String
  user        User     @relation(fields: [userId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?

  // Relations
  jobs        Job[]

  @@index([userId, status])
  @@index([type, status])
}

model Job {
  id          String   @id @default(cuid())
  type        String   // Job type identifier
  status      String   // 'pending', 'processing', 'completed', 'failed'
  priority    Int      @default(0)
  data        Json     // Input data
  result      Json?    // Output data
  error       String?  // Error message if failed

  workflowId  String
  workflow    Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())
  startedAt   DateTime?
  completedAt DateTime?

  @@index([workflowId, status])
  @@index([type, status])
  @@index([priority, status])
}
```

#### Essential Database Patterns

**1. Soft Delete Implementation**
```prisma
model Resource {
  id        String    @id @default(cuid())
  name      String
  deletedAt DateTime? // null = active, timestamp = deleted

  @@index([deletedAt]) // Index for filtering active records
}
```

**2. Multi-Tenant Constraints**
```prisma
model ClientData {
  id             String @id @default(cuid())
  organizationId String
  name           String

  // Unique constraint scoped to organization
  @@unique([organizationId, name])
  @@index([organizationId])
}
```

**3. Audit Trail Pattern**
```prisma
model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  action     String   // 'CREATE', 'UPDATE', 'DELETE'
  resource   String   // Table name
  resourceId String   // Record ID
  changes    Json?    // What changed
  ipAddress  String?
  userAgent  String?
  timestamp  DateTime @default(now())

  @@index([userId, timestamp])
  @@index([resource, resourceId])
}
```

### Database Operations

#### Development Workflow
```bash
# ALWAYS load environment first (Prisma CLI runs in separate process)
export $(grep -v '^#' .env.local | xargs)

# OR use Doppler (recommended)
doppler run -- [prisma command]

# Prototyping (quick iteration, NO migration files)
doppler run -- npx prisma db push

# Production-ready (creates migration files - REQUIRED for production)
doppler run -- npx prisma migrate dev --name descriptive-name

# Generate Prisma Client after schema changes
doppler run -- npx prisma generate

# View database in browser
doppler run -- npx prisma studio
```

**⚠️ CRITICAL: Migration Strategy**
- **Prototyping**: Use `db push` ONLY for experiments
- **Features**: Use `migrate dev` to create version-controlled migrations
- **Production**: ONLY deploy via migration files, never `db push`
- **Always commit migration files** with your schema changes

#### Query Patterns

**Avoid N+1 Queries**
```typescript
// ❌ Bad - N+1 query problem
const users = await prisma.user.findMany();
for (const user of users) {
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId }
  });
}

// ✅ Good - Single query with include
const users = await prisma.user.findMany({
  include: {
    organization: true
  }
});
```

**Use Transactions for Related Operations**
```typescript
// Atomic workflow creation
const workflow = await prisma.$transaction(async (tx) => {
  // Create workflow
  const wf = await tx.workflow.create({
    data: {
      type: 'data_processing',
      status: 'pending',
      context: {},
      userId
    }
  });

  // Create initial job
  await tx.job.create({
    data: {
      type: 'initial_processing',
      status: 'pending',
      data: { /* ... */ },
      workflowId: wf.id
    }
  });

  return wf;
});
```

**Optimize with Select**
```typescript
// Only fetch needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    organization: {
      select: {
        id: true,
        name: true
      }
    }
  }
});
```

---

## Authentication Patterns

### BetterAuth Setup

#### Core Configuration
```typescript
// lib/auth/auth-config.ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/lib/db';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // Update if older than 1 day
  },
  advanced: {
    generateId: () => crypto.randomUUID() // or your preferred ID generator
  }
});
```

#### Protected API Routes
```typescript
// app/api/protected-resource/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth-config';

export async function GET(request: NextRequest) {
  // Validate session
  const session = await auth.api.getSession({
    headers: request.headers
  });

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Access user data
  const { user } = session;

  // Your logic here
  return NextResponse.json({ data: 'protected data' });
}
```

#### Server Components Authentication
```typescript
// app/dashboard/page.tsx
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/auth-config';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Welcome, {session.user.email}</h1>
    </div>
  );
}
```

#### Client-Side Authentication Hook
```typescript
// hooks/use-session.ts
'use client';

import { useQuery } from '@tanstack/react-query';

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}
```

### Organization-Based Access Control

#### Middleware for Organization Isolation
```typescript
// lib/auth/access-control.ts
import { prisma } from '@/lib/db';

export async function verifyOrganizationAccess(
  userId: string,
  resourceId: string,
  resourceType: 'client' | 'workflow' | 'data'
) {
  // Get user's organization
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify resource belongs to same organization
  let hasAccess = false;

  switch (resourceType) {
    case 'client':
      const client = await prisma.client.findFirst({
        where: {
          id: resourceId,
          organizationId: user.organizationId
        }
      });
      hasAccess = !!client;
      break;

    case 'workflow':
      const workflow = await prisma.workflow.findFirst({
        where: {
          id: resourceId,
          user: {
            organizationId: user.organizationId
          }
        }
      });
      hasAccess = !!workflow;
      break;
  }

  if (!hasAccess) {
    throw new Error('Access denied: Resource not in user organization');
  }

  return true;
}
```

---

## API Design Patterns

### Consistent Response Format
```typescript
// types/api.ts
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
};

// Helper function
export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString()
    }
  };
}

export function errorResponse(error: string, status = 500): Response {
  return Response.json(
    {
      success: false,
      error,
      meta: {
        timestamp: new Date().toISOString()
      }
    },
    { status }
  );
}
```

### Route Handler Structure
```typescript
// app/api/resources/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/auth-config';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse } from '@/types/api';

// Input validation schema
const updateResourceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional()
});

// GET /api/resources/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15: params is now a Promise
    const { id } = await params;

    // Authenticate
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return errorResponse('Unauthorized', 401);
    }

    // Fetch resource
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        // Include related data
        organization: true
      }
    });

    if (!resource) {
      return errorResponse('Resource not found', 404);
    }

    // Verify access
    if (resource.organizationId !== session.user.organizationId) {
      return errorResponse('Access denied', 403);
    }

    return Response.json(successResponse(resource));

  } catch (error) {
    console.error('GET /api/resources/:id error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// PUT /api/resources/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return errorResponse('Unauthorized', 401);
    }

    // Parse and validate body
    const body = await request.json();
    const validation = updateResourceSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        `Validation error: ${validation.error.message}`,
        400
      );
    }

    // Update resource
    const updated = await prisma.resource.update({
      where: { id },
      data: validation.data
    });

    return Response.json(successResponse(updated));

  } catch (error) {
    console.error('PUT /api/resources/:id error:', error);
    return errorResponse('Internal server error', 500);
  }
}
```

### Server Actions Pattern
```typescript
// app/actions/resource-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/auth-config';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export async function createResource(formData: FormData) {
  // Get session
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    const resource = await prisma.resource.create({
      data: {
        name,
        description,
        userId: session.user.id,
        organizationId: session.user.organizationId
      }
    });

    // Revalidate the resources list page
    revalidatePath('/dashboard/resources');

    return { success: true, data: resource };
  } catch (error) {
    console.error('Create resource error:', error);
    return { success: false, error: 'Failed to create resource' };
  }
}
```

---

## Environment Management

### Doppler Integration

#### Setup
```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler  # macOS
# or follow: https://docs.doppler.com/docs/install-cli

# Login
doppler login

# Setup project
doppler setup

# Configure environments
doppler configure set config dev_personal  # For local development
doppler configure set config dev          # For dev branch deployment
doppler configure set config production   # For production
```

#### Environment Structure
```
Project: your-app
├── dev_personal  (local development - your machine)
├── dev           (dev branch deployment - Vercel)
├── staging       (optional - staging deployment)
└── production    (main branch - Vercel production)
```

#### Local Development
```bash
# Run commands with Doppler
doppler run -- npm run dev
doppler run -- npx prisma migrate dev
doppler run -- npm test

# Or export to .env.local (not recommended - use doppler run)
doppler secrets download --no-file --format env > .env.local
```

#### Required Environment Variables
```bash
# Database (Supabase)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # For migrations
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Authentication (BetterAuth)
AUTH_SECRET="generated-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"  # or production URL
DATABASE_URL="same-as-above"  # BetterAuth uses same database

# Application
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: External APIs
OPENAI_API_KEY="sk-..."
STRIPE_SECRET_KEY="sk_..."

# Vercel-specific (auto-injected in Vercel)
VERCEL="1"
VERCEL_ENV="development|preview|production"
```

### Environment-Specific Configuration
```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(['development', 'test', 'production']),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Auth
  AUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
});

export const env = envSchema.parse(process.env);

// Type-safe environment access
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
```

---

## Error Handling

### Structured Error Types
```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public meta?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, meta?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, meta);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}
```

### Error Handler Middleware
```typescript
// lib/error-handler.ts
import { AppError } from './errors';
import type { ApiResponse } from '@/types/api';

export function handleError(error: unknown): Response {
  console.error('Error:', error);

  // Handle known AppError types
  if (error instanceof AppError) {
    const response: ApiResponse<never> = {
      success: false,
      error: error.message,
      meta: {
        timestamp: new Date().toISOString(),
        code: error.code,
        ...error.meta
      }
    };

    return Response.json(response, { status: error.statusCode });
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: any };

    if (prismaError.code === 'P2002') {
      return Response.json(
        {
          success: false,
          error: 'Resource already exists',
          meta: { timestamp: new Date().toISOString() }
        },
        { status: 409 }
      );
    }

    if (prismaError.code === 'P2025') {
      return Response.json(
        {
          success: false,
          error: 'Resource not found',
          meta: { timestamp: new Date().toISOString() }
        },
        { status: 404 }
      );
    }
  }

  // Generic error response
  return Response.json(
    {
      success: false,
      error: 'Internal server error',
      meta: { timestamp: new Date().toISOString() }
    },
    { status: 500 }
  );
}
```

### Usage in Routes
```typescript
// app/api/example/route.ts
import { handleError } from '@/lib/error-handler';
import { ValidationError, NotFoundError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    if (!body.name) {
      throw new ValidationError('Name is required');
    }

    // Fetch resource
    const resource = await prisma.resource.findUnique({
      where: { id: body.resourceId }
    });

    if (!resource) {
      throw new NotFoundError('Resource');
    }

    // Process...

    return Response.json(successResponse(result));

  } catch (error) {
    return handleError(error);
  }
}
```

---

## Security Patterns

### Row Level Security (RLS)

#### Supabase RLS Policies
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Organization members can see organization data
CREATE POLICY "resources_org_access" ON resources
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Admins can manage all resources in their org
CREATE POLICY "resources_admin_manage" ON resources
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

### Input Validation with Zod
```typescript
// lib/validation/schemas.ts
import { z } from 'zod';

export const createResourceSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name too long'),
  description: z.string()
    .max(1000, 'Description too long')
    .optional(),
  tags: z.array(z.string()).max(10, 'Too many tags').optional(),
  metadata: z.record(z.any()).optional()
});

// Validate with detailed errors
export function validateCreateResource(data: unknown) {
  const result = createResourceSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.format();
    throw new ValidationError('Validation failed', { errors });
  }

  return result.data;
}
```

### Rate Limiting
```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

type RateLimitOptions = {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max unique tokens in window
};

export function rateLimit(options: RateLimitOptions) {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  return {
    check: (token: string, limit: number) => {
      const tokenCount = (tokenCache.get(token) as number[]) || [0];
      if (tokenCount[0] === 0) {
        tokenCache.set(token, [1]);
      }
      tokenCount[0] += 1;

      const currentUsage = tokenCount[0];
      const isRateLimited = currentUsage >= limit;

      return {
        isRateLimited,
        remaining: isRateLimited ? 0 : limit - currentUsage,
      };
    },
  };
}

// Usage in API route
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 unique IPs per minute
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? 'anonymous';
  const { isRateLimited } = limiter.check(ip, 10); // 10 requests per minute per IP

  if (isRateLimited) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // Continue with request...
}
```

### Security Headers
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## Development Workflow

### Git Workflow
```
main (production)           ← Protected, requires PR approval
├── dev                     ← Auto-deploy to dev environment
└── feature/[name]         ← Feature branches
```

### Branch Protection Rules
- Require pull request reviews (1+ approvals)
- Require status checks to pass
- No force pushes
- No deletions
- Include administrators in restrictions

### Prisma Development Flow

**Option 1: Production-Ready (Recommended)**
```bash
# 1. Update schema.prisma
# 2. Create migration with descriptive name
doppler run -- npx prisma migrate dev --name add_user_roles

# 3. Generate Prisma Client
doppler run -- npx prisma generate

# 4. Test migration
doppler run -- npm test

# 5. Commit both schema.prisma AND migration files
git add prisma/
git commit -m "feat: add user roles"
```

**Option 2: Prototyping (Experimentation Only)**
```bash
# 1. Update schema.prisma
# 2. Push directly (NO migration files created)
doppler run -- npx prisma db push

# 3. When ready for production: Create proper migration
doppler run -- npx prisma migrate dev --name your_feature
```

### Testing Commands
```bash
# Unit tests
doppler run -- npm test

# Integration tests with test database
doppler run --config test -- npx prisma migrate deploy
doppler run --config test -- npm run test:integration

# Type checking
doppler run -- npm run type-check

# Linting
doppler run -- npm run lint
doppler run -- npm run lint:fix
```

---

## Testing Strategy

### Test Structure
```
/tests
  /unit             # Unit tests for business logic
    /lib
      workflow-engine.test.ts
      validation.test.ts
  /integration      # Integration tests with database
    /api
      resources.test.ts
  /e2e              # End-to-end tests
    auth-flow.spec.ts
```

### Unit Test Example
```typescript
// tests/unit/lib/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateCreateResource } from '@/lib/validation/schemas';
import { ValidationError } from '@/lib/errors';

describe('Resource Validation', () => {
  it('should validate valid resource data', () => {
    const validData = {
      name: 'Test Resource',
      description: 'A test resource'
    };

    expect(() => validateCreateResource(validData)).not.toThrow();
  });

  it('should reject empty name', () => {
    const invalidData = {
      name: '',
      description: 'Test'
    };

    expect(() => validateCreateResource(invalidData))
      .toThrow(ValidationError);
  });

  it('should reject name longer than 255 characters', () => {
    const invalidData = {
      name: 'a'.repeat(256),
      description: 'Test'
    };

    expect(() => validateCreateResource(invalidData))
      .toThrow(ValidationError);
  });
});
```

### Integration Test Example
```typescript
// tests/integration/api/resources.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/db';

describe('Resources API', () => {
  let testUser: any;
  let testOrg: any;

  beforeEach(async () => {
    // Create test organization
    testOrg = await prisma.organization.create({
      data: { name: 'Test Org' }
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        organizationId: testOrg.id
      }
    });
  });

  afterEach(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' }
    });
    await prisma.organization.deleteMany({
      where: { name: 'Test Org' }
    });
  });

  it('should create resource for authenticated user', async () => {
    const resource = await prisma.resource.create({
      data: {
        name: 'Test Resource',
        userId: testUser.id,
        organizationId: testOrg.id
      }
    });

    expect(resource).toBeDefined();
    expect(resource.name).toBe('Test Resource');
    expect(resource.organizationId).toBe(testOrg.id);
  });
});
```

---

## Deployment Strategy

### Vercel Configuration

#### vercel.json
```json
{
  "buildCommand": "prisma generate && next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "DIRECT_URL": "@direct-url",
    "AUTH_SECRET": "@auth-secret"
  }
}
```

### Environment Variables in Vercel

**Connect Doppler to Vercel**:
1. Install Doppler Vercel integration
2. Link Doppler configs to Vercel environments:
   - `dev` → Preview (dev branch)
   - `production` → Production (main branch)
3. Auto-sync environment variables

**Or manually add in Vercel dashboard**:
- Development: Preview environments
- Preview: Branch deployments
- Production: Production environment

### GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run security audit
        run: npm audit --audit-level=moderate

      - name: Check for vulnerabilities
        run: npx audit-ci --moderate
```

### Database Migrations in Production

**Manual Migration Process** (Recommended for production):
```bash
# 1. Review migration on dev/staging first
# 2. Schedule maintenance window
# 3. Backup production database (Supabase: Project Settings → Database → Backups)
# 4. Apply migration
doppler run --config production -- npx prisma migrate deploy

# 5. Verify migration succeeded
doppler run --config production -- npx prisma migrate status

# 6. Deploy application
# Vercel auto-deploys on main branch push
```

---

## Common Pitfalls

### 1. Forgetting to Load Environment Variables
**Problem**: Prisma commands fail with "DATABASE_URL not found"
**Solution**: Always use `doppler run --` or export environment first
```bash
# ❌ Won't work
npx prisma migrate dev

# ✅ Correct
doppler run -- npx prisma migrate dev
```

### 2. N+1 Query Problems
**Problem**: Multiple database queries in loops
**Solution**: Use `include` or `select` with Prisma
```typescript
// ❌ Bad
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({
    where: { userId: user.id }
  });
}

// ✅ Good
const users = await prisma.user.findMany({
  include: {
    posts: true
  }
});
```

### 3. Not Handling Dynamic Params in Next.js 15
**Problem**: Treating `params` as synchronous object
**Solution**: Await the params Promise
```typescript
// ❌ Old way (Next.js 14)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
}

// ✅ New way (Next.js 15)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

### 4. Missing Migration Files
**Problem**: Using `db push` for production features
**Solution**: Always use `migrate dev` for features going to production
```bash
# ❌ Prototyping only
doppler run -- npx prisma db push

# ✅ Production-ready
doppler run -- npx prisma migrate dev --name feature_name
```

### 5. Exposing Sensitive Data in API Responses
**Problem**: Returning full user objects with passwords
**Solution**: Use Prisma `select` to return only needed fields
```typescript
// ❌ Returns everything including password hash
const user = await prisma.user.findUnique({
  where: { id }
});

// ✅ Only return safe fields
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true,
    // NO password field
  }
});
```

### 6. Not Validating Input
**Problem**: Trusting client data without validation
**Solution**: Use Zod schemas for all API inputs
```typescript
// ❌ No validation
const body = await request.json();
await prisma.user.update({
  where: { id },
  data: body // Dangerous!
});

// ✅ Validate first
const schema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email()
});

const body = await request.json();
const validated = schema.parse(body);
await prisma.user.update({
  where: { id },
  data: validated
});
```

### 7. Missing Error Handling
**Problem**: Unhandled promise rejections crash the application
**Solution**: Wrap in try-catch and return proper error responses
```typescript
// ❌ No error handling
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await someAsyncOperation(body);
  return Response.json(result);
}

// ✅ Proper error handling
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await someAsyncOperation(body);
    return Response.json(successResponse(result));
  } catch (error) {
    return handleError(error);
  }
}
```

### 8. Inconsistent File Organization
**Problem**: Files exceeding 200 lines, mixed concerns
**Solution**: Split into smaller, focused modules
```typescript
// ❌ 500-line file with everything
// lib/user-management.ts
export async function createUser() { /* 100 lines */ }
export async function updateUser() { /* 100 lines */ }
export async function deleteUser() { /* 100 lines */ }
export async function getUserPermissions() { /* 100 lines */ }
export async function sendUserEmail() { /* 100 lines */ }

// ✅ Split by responsibility
// lib/user/create.ts
// lib/user/update.ts
// lib/user/delete.ts
// lib/user/permissions.ts
// lib/user/notifications.ts
```

### 9. Forgetting Indexes
**Problem**: Slow queries on frequently-accessed fields
**Solution**: Add indexes in Prisma schema
```prisma
model User {
  id    String @id @default(cuid())
  email String @unique  // Automatic index
  orgId String

  @@index([orgId])       // Add index for foreign keys
  @@index([email, orgId]) // Composite index if querying both
}
```

### 10. Not Using Transactions
**Problem**: Inconsistent data when related operations fail partway
**Solution**: Use Prisma transactions for related operations
```typescript
// ❌ Not atomic - could fail after creating user
const user = await prisma.user.create({ data: userData });
const profile = await prisma.profile.create({
  data: { userId: user.id, ...profileData }
});

// ✅ Atomic transaction
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const profile = await tx.profile.create({
    data: { userId: user.id, ...profileData }
  });
  return { user, profile };
});
```

---

## Quick Reference

### Essential Commands
```bash
# Development
doppler run -- npm run dev                    # Start dev server
doppler run -- npx prisma studio             # Database GUI

# Database
doppler run -- npx prisma migrate dev        # Create migration
doppler run -- npx prisma generate           # Generate Prisma Client
doppler run -- npx prisma migrate deploy     # Apply migrations (CI/CD)
doppler run -- npx prisma db push            # Prototype only (no migrations)

# Testing
doppler run -- npm test                      # Run tests
doppler run -- npm run type-check            # TypeScript check
doppler run -- npm run lint                  # ESLint

# Deployment
git push origin dev                          # Auto-deploy to dev
git push origin main                         # Auto-deploy to production
```

### Key Principles
✅ **DO**:
- Use TypeScript strict mode
- Validate all inputs with Zod
- Use transactions for related operations
- Add indexes for frequently queried fields
- Keep files under 200 lines
- Use `doppler run --` for all local commands
- Create migrations for production features
- Handle errors explicitly

❌ **DON'T**:
- Use `any` types
- Trust client input
- Forget to await Next.js 15 params
- Use `db push` for production features
- Expose sensitive fields in API responses
- Skip error handling
- Commit secrets to git
- Run production commands without review

---

## Additional Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [BetterAuth Documentation](https://better-auth.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Doppler Documentation](https://docs.doppler.com)
- [Vercel Documentation](https://vercel.com/docs)

---

**This reference covers the essential patterns for building production-ready Next.js applications. Refer to it when implementing new features, and update it as your architecture evolves.**
