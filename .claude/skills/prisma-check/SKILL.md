---
name: prisma-check
description: Scan code for Prisma ORM performance anti-patterns like N+1 queries, overfetching, and missing batch operations. Use after writing database code or during code review.
allowed-tools: Read, Grep, Glob
argument-hint: [file-path-or-pattern]
---

# Prisma Performance Check Skill

Scan TypeScript/JavaScript files for common Prisma ORM performance issues.

## Instructions

1. **Determine scope:**
   - If $ARGUMENTS is empty: Scan recently modified files or staged changes
   - If $ARGUMENTS is a file path: Scan that specific file
   - If $ARGUMENTS is a pattern: Scan matching files (e.g., `app/api/**/*.ts`)

2. **Find files to scan:**
   - Use `git diff --name-only HEAD~1` for recent changes, or
   - Use Glob to find files matching the pattern
   - Focus on files that import from `@prisma/client` or use `prisma.`

3. **Check for these anti-patterns:**

   ### Critical: N+1 Query Loops
   Look for patterns where queries are inside loops:
   ```typescript
   // BAD: Query inside loop
   for (const item of items) {
     await prisma.model.findMany({ where: { id: item.id } })
   }

   // GOOD: Single query with `in` operator
   await prisma.model.findMany({ where: { id: { in: itemIds } } })
   ```

   ### Critical: Sequential Deletes/Updates in Loops
   ```typescript
   // BAD: Individual deletes
   for (const id of ids) {
     await prisma.model.delete({ where: { id } })
   }

   // GOOD: Bulk delete
   await prisma.model.deleteMany({ where: { id: { in: ids } } })
   ```

   ### Medium: Overfetching with `include`
   ```typescript
   // BAD: Fetching all fields when only some are needed
   include: { relation: true }

   // GOOD: Select only needed fields
   select: { id: true, name: true, relation: { select: { id: true } } }
   ```

   ### Medium: Sequential Independent Queries
   ```typescript
   // BAD: Sequential when independent
   const a = await prisma.modelA.findMany()
   const b = await prisma.modelB.findMany()

   // GOOD: Parallel execution
   const [a, b] = await Promise.all([
     prisma.modelA.findMany(),
     prisma.modelB.findMany()
   ])
   ```

   ### Low: Missing Batch Create
   ```typescript
   // BAD: Individual creates in loop
   for (const data of items) {
     await prisma.model.create({ data })
   }

   // GOOD: Batch create
   await prisma.model.createMany({ data: items })
   ```

4. **Output format:**

   ```
   ## Prisma Performance Check Results

   ### Files Scanned
   - path/to/file1.ts
   - path/to/file2.ts

   ### Issues Found

   **CRITICAL** - N+1 Query Loop
   `app/api/exercises/route.ts:45-52`
   ```typescript
   for (const workout of workouts) {
     const exercises = await prisma.exercise.findMany({...})
   }
   ```
   **Fix:** Use single query with `{ workoutId: { in: workoutIds } }`

   ---

   **MEDIUM** - Overfetching
   `lib/db/program.ts:23`
   ```typescript
   include: { weeks: { include: { workouts: true } } }
   ```
   **Fix:** Use `select` to fetch only required fields

   ### Summary
   - Critical: 1
   - Medium: 2
   - Low: 0

   ### Recommendations
   1. Refactor the N+1 loop in exercises route to use bulk query
   ```

5. **If no issues found:**
   ```
   ## Prisma Performance Check Results

   ### Files Scanned
   - path/to/file.ts

   ✓ No performance issues detected
   ```

## Common Patterns to Flag

| Pattern | Severity | Detection |
|---------|----------|-----------|
| `for.*await.*prisma\.(find\|delete\|update)` | Critical | Query in loop |
| `\.forEach.*await.*prisma\.` | Critical | Query in forEach |
| `include:\s*\{[^}]+:\s*true` | Medium | Blanket include |
| `await prisma\..*\n.*await prisma\.` | Low | Possible sequential |
| `for.*await.*\.create\(` | Low | Individual creates |

## Notes

- This is a heuristic check - some flagged patterns may be intentional
- Focus on hot paths (API routes, frequently called functions)
- Consider data volume: N+1 on 5 items is less critical than on 500
- Transactions (`prisma.$transaction`) may require sequential queries
