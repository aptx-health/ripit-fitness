# Contributing to FitCSV

Thanks for your interest in contributing! This is an early-stage personal project that I created for my own use and enjoyment, now opened to the public. Read on to understand the current state and how you can help.

## Project Status & Expectations

### What This Project Is

- **Personal project**: Built primarily for my own strength training needs
- **Early stage**: Active development, things change frequently
- **Public but small**: Open source, but not a large community project (yet!)
- **Learning-friendly**: Good codebase for learning Next.js 15, Supabase, Prisma patterns

### Current Limitations (Important!)

1. **No dev database yet** - I don't have a separate development database in Supabase. All database changes and migrations are manually reviewed before being applied to production.

2. **No CI/CD pipeline** - Beyond Vercel's build checks, there are no automated tests or deployment pipelines. Manual testing is required.

3. **Manual code review** - All PRs are reviewed manually. Response time may vary depending on my availability.

4. **Production database access** - Only the maintainer (me) has access to the production Supabase database and Vercel deployment.

### What This Means for Contributors

- **You develop against your own Supabase instance OR a local postresql database** (free tier works great!)
- **Database migrations require extra scrutiny** - PRs with schema changes will be carefully reviewed
- **Testing is manual** - You'll need to test locally and document what you tested
- **Be patient** - This is a side project, so PR review times may vary

## Getting Started

### Prerequisites

Before contributing, make sure you can:
1. Run the project locally (see [README.md](README.md))
2. Have your own Supabase project set up
3. Understand the tech stack (Next.js 15, TypeScript, Prisma, Supabase)

### Understanding the Codebase

Key resources:
- [CLAUDE.md](CLAUDE.md) - Comprehensive guide to project structure and conventions
- [docs/STYLING.md](docs/STYLING.md) - Theme system and styling guide
- [docs/features/](docs/features/) - Feature-specific documentation

## How to Contribute

### 1. Fork & Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/fitcsv.git
cd fitcsv
```

### 2. Set Up Your Environment

Follow the [README.md Quick Start](README.md#quick-start) to:
- Create your own Supabase project
- Configure environment variables (Doppler or .env)
- Run migrations on your local database
- Start the dev server

### 3. Create a Feature Branch

**Always branch from `dev`**, not `main`:

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation changes

### 4. Make Your Changes

Follow these guidelines:

#### Code Standards

1. **File size limit**: Max 200 lines per file. If you exceed this, split into multiple files following Single Responsibility Principle.

2. **TypeScript**: Use TypeScript strictly. No `any` types without good reason.

3. **Imports organization**:
   ```typescript
   // 1. External dependencies
   import { NextRequest, NextResponse } from 'next/server';

   // 2. Types
   import type { Program } from '@prisma/client';

   // 3. Internal utilities
   import { prisma } from '@/lib/db';

   // 4. Components
   import { Button } from '@/components/ui/button';
   ```

4. **Error handling**: All API routes must include comprehensive error handling and logging.

5. **Avoid N+1 queries**: Use Prisma includes/selects to fetch related data in single queries.

6. **No emojis** in code unless explicitly requested.

#### Styling

The project uses a theme system (evolved from the original DOOM theme):
- Use theme classes from `globals.css`
- Color themes are switchable via the theme system
- See [docs/STYLING.md](docs/STYLING.md) for details

#### Database Changes

**Extra care required!** If your PR includes database schema changes:

1. **Use migrations**, never `db push` for production features:
   ```bash
   doppler run -- npx prisma migrate dev --name descriptive_name
   ```

2. **Commit migration files** with your PR.

3. **Document the changes** in your PR description:
   - What tables/columns are affected
   - Why the change is needed
   - Any data migration concerns

4. **Test thoroughly** on your local database:
   - Apply the migration from scratch
   - Test rollback if possible
   - Verify application still works

5. **Expect extra review time** - Schema changes are carefully vetted.

### 5. Test Your Changes

Since there's no automated CI/CD, you need to test manually:

#### Required Checks

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build test
npm run build

# Run tests (if applicable)
doppler run -- npm test
```

#### Manual Testing

Document what you tested in your PR:
- [ ] Feature works as expected
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Tested on your local Supabase instance
- [ ] Checked mobile responsiveness (if UI changes)
- [ ] Verified authentication still works (if auth-related)

### 6. Commit Your Changes

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add exercise history chart"
git commit -m "fix: resolve workout completion bug"
git commit -m "refactor: extract CSV parsing logic"
```

Follow conventional commits format:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation
- `style:` - Formatting, styling
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 7. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a PR on GitHub:

#### PR Checklist

- [ ] **Target branch is `dev`** (not `main`)
- [ ] Title is clear and descriptive
- [ ] Description explains:
  - What problem does this solve?
  - How does it work?
  - What did you test?
- [ ] All type checks pass (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] You've tested the changes locally
- [ ] Screenshots included (if UI changes)
- [ ] Migration files committed (if schema changes)

## What We're Looking For

### Good First Issues

Great places to start:
- Bug fixes
- Documentation improvements
- UI polish and refinements
- Test coverage improvements
- Code refactoring (within existing architecture)

### Larger Contributions

Before working on major features:
1. **Open an issue first** to discuss the approach
2. Get feedback on whether it aligns with project goals
3. Understand that larger changes may require more review time

## Code Review Process

1. **Initial review**: I'll review your PR when I have time (usually within a week)
2. **Feedback**: May request changes or ask questions
3. **Iteration**: Work together to refine the PR
4. **Merge**: Once approved, I'll merge to `dev`
5. **Deploy**: Changes deploy to production when `dev` is merged to `main`

## Things to Avoid

- Don't create PRs that require access to production database or Vercel
- Don't add new external services without discussion
- Don't make breaking changes to existing features without discussion
- Don't bypass TypeScript's type system with excessive `any` types
- Don't add dependencies without considering bundle size
- Don't over-engineer - keep solutions simple and focused

## Questions?

- **Bug reports**: Open an issue with reproduction steps
- **Feature requests**: Open an issue to discuss before implementing
- **Questions about code**: Ask in PR comments or open a discussion issue

## Recognition

Contributors will be recognized in the project. Every merged PR helps make FitCSV better!

## License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.
