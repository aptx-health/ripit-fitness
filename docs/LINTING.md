# Linting & Formatting

Ripit Fitness uses a **hybrid ESLint + Biome** setup optimized for agentic AI coding workflows.

## Architecture

| Tool | Role | When it runs |
|------|------|-------------|
| **Biome** | Fast linting + import organization | Pre-commit hook (~200ms on staged files) |
| **ESLint** | Next.js-specific rules (core-web-vitals, typescript) | CI pipeline, manual `npm run lint` |
| **Husky** | Git hook management | Triggers pre-commit |
| **lint-staged** | File-length enforcement (500-line max) | Pre-commit, after Biome |

### Why hybrid?

- **Biome** is 15-25x faster than ESLint, giving sub-second feedback on every commit. Critical when AI agents retry on lint failures.
- **ESLint** with `eslint-config-next` covers Next.js-specific rules (no async client components, proper `<Link>` usage, image optimization) that Biome doesn't fully replicate.
- Together they provide fast local feedback + thorough CI checks.

## Pre-commit Flow

```
git commit
  |
  v
.husky/pre-commit
  |
  |--> biome check --staged --fix   (~200ms)
  |     - Removes unused imports
  |     - Fixes const vs let
  |     - Organizes imports
  |     - Adds import type where needed
  |     - Catches no-explicit-any (warn)
  |     - Catches unused vars/params (warn)
  |
  |--> lint-staged
        - bash scripts/check-file-length.sh  (500-line limit)
```

## Commands

```bash
# Lint with ESLint (Next.js rules)
npm run lint

# Lint with Biome (fast general checks)
npm run lint:biome

# Run both linters
npm run lint:all

# Type-check (no linting)
npm run type-check
```

## Configuration Files

| File | Purpose |
|------|---------|
| `biome.json` | Biome linter config |
| `eslint.config.mjs` | ESLint flat config (Next.js rules) |
| `.husky/pre-commit` | Git pre-commit hook script |
| `package.json` `lint-staged` | File-length check config |

## Biome Rules

Biome is configured with `recommended` rules plus explicit overrides:

**Errors (block commit):**
- `noUnusedImports` — dead imports must be removed
- `useConst` — use `const` when variable is never reassigned
- `noBannedTypes` — no `Object`, `Function`, `{}` as types

**Warnings (reported, don't block):**
- `noUnusedVariables` — unused variables
- `noUnusedFunctionParameters` — unused function params
- `noExplicitAny` — avoid `any` types
- `useImportType` — use `import type` for type-only imports
- `useExhaustiveDependencies` — React hook dependency arrays

**Disabled:**
- `noConsole` — we use console in scripts/workers legitimately
- `noNonNullAssertion` — too noisy for current codebase
- `formatter` — disabled to avoid mass reformatting; may enable later

**Also includes `recommended` rules** which catch:
- `useParseIntRadix` — always pass radix to `parseInt()`
- `noGlobalIsNan` — use `Number.isNaN()` instead of `isNaN()`
- `noArrayIndexKey` — avoid array index as React key
- `useIterableCallbackReturn` — missing returns in `.map()` / `.filter()`
- `noInvalidUseBeforeDeclaration` — variable used before declaration
- And more from the [Biome recommended ruleset](https://biomejs.dev/linter/rules/)

## ESLint Rules

ESLint uses `eslint-config-next` with:
- `core-web-vitals` preset (React, hooks, accessibility, Next.js-specific)
- `typescript` preset (TypeScript-aware rules)
- `@typescript-eslint/no-unused-vars` with `_` prefix ignore patterns

## For AI Agents / Claude Code

The hybrid setup catches common AI-generated code issues at commit time:

| Issue | Caught by | Auto-fixable? |
|-------|-----------|--------------|
| Unused imports | Biome (pre-commit) | Yes |
| Unused variables | Biome (pre-commit) | No (warns) |
| `any` types | Biome (pre-commit) | No (warns) |
| `let` instead of `const` | Biome (pre-commit) | Yes |
| Missing `import type` | Biome (pre-commit) | Yes |
| Import organization | Biome (pre-commit) | Yes |
| Wrong React hook deps | Biome (pre-commit) | No (warns) |
| Next.js anti-patterns | ESLint (CI) | No |
| `<a>` instead of `<Link>` | ESLint (CI) | No |
| Async client components | ESLint (CI) | No |
| Files over 500 lines | lint-staged (pre-commit) | No (blocked) |

## Skipping Hooks

If you need to bypass the pre-commit hook (e.g., for pre-existing issues):

```bash
git commit --no-verify -m "your message"
```

Use sparingly — the hooks exist to catch issues early.

## Future Enhancements

- **Enable Biome formatter** once codebase formatting is standardized
- **Add `noConsole` rule** once all legitimate console usage migrates to pino logger
- **Add `noNonNullAssertion` rule** once existing assertions are reviewed
