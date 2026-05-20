# Playwright Recipes for Ripit Fitness

Project-specific reference for browser-driven UI testing. Use this with the
`webapp-testing` skill (`.claude/skills/webapp-testing/SKILL.md`) — the skill
covers the generic patterns, this doc has the Ripit-specific selectors and flows.

**When to use:** UI fixes (layout, sizing, copy, mobile-responsive behavior),
multi-step flow verification, anything where a screenshot is worth more than a
diff. Don't reach for it on pure backend or schema changes.

## Setup

The dev server must be running on **port 3700** (worktree-aware via
`scripts/dev.sh`). Playwright runs via `uv` with no project venv:

```bash
# One-time browser install
uv run --with playwright python -m playwright install chromium

# Run a script
uv run --with playwright python /tmp/your-script.py
```

## Login

Test user (seeded by `scripts/dev.sh` on startup):
- Email: `dmays@test.com`
- Password: `password`

Login form uses **id-based selectors** (no `name` attributes):

```python
page.goto('http://localhost:3700/login')
page.wait_for_load_state('networkidle')
page.fill('#email', 'dmays@test.com')
page.fill('#password', 'password')
page.click('button:has-text("Sign in")')
page.wait_for_load_state('networkidle')
page.wait_for_timeout(1500)  # post-login redirect settle
```

After login, session cookies are attached to the browser context — any
`ctx.request.post(...)` calls will be authenticated.

## Navigation selectors

| Element | Selector | Notes |
|---|---|---|
| Chip sheet (mobile) | `button[aria-label="Quick actions"]` | Bottom nav. Use this on mobile viewports. |
| Chip sheet (desktop) | `button[aria-label="Start a workout"]` | Header. Hidden on mobile viewport. There are TWO elements that match "Workout" text — filter by `aria-label`. |
| Bottom nav items | `nav a[aria-label="..."]` | "Training", "Programs", "Learn", "Settings" |
| Workout finish | `button:has-text("Finish")` | On `/training/adhoc/[id]` |
| Confirm dialog | `button:has-text("Confirm")` | Generic — appears after Finish |

## Viewports

Use **390 × 844** (iPhone 14 width) for mobile testing. The app's responsive
breakpoints are tuned for this. Desktop chip / header items are hidden below
the `sm` breakpoint (640px).

```python
ctx = browser.new_context(viewport={'width': 390, 'height': 844})
```

## Database inspection

The worktree's Postgres port is derived from worktree slot. For the current
worktree, find it via:

```bash
docker ps --format "{{.Names}}\t{{.Ports}}" | grep postgres
# e.g. fitcsv-postgres-wt7  0.0.0.0:5440->5432/tcp
```

Then:

```bash
PGPASSWORD=postgres psql -h localhost -p <PORT> -U postgres -d ripit -c "SELECT ..."
```

## Common flows

### Reach the post-workout rollup modal

The rollup only appears via the completion flow (in component state, no direct
URL). Setup via API to skip the slow exercise-picker UI, then click Finish:

```python
EX_DEF = 'cmiz7vjju0000vr0m4b1o6bec'  # Barbell Bench Press; query DB for current ids

# After login...
r = ctx.request.post('http://localhost:3700/api/workouts/adhoc')
completion_id = r.json()['completion']['id']

r = ctx.request.post(
    f'http://localhost:3700/api/workouts/adhoc/{completion_id}/exercises',
    data={'exerciseDefinitionId': EX_DEF, 'name': 'Barbell Bench Press'},
)
ex_id = r.json()['exercise']['id']

ctx.request.post(
    f'http://localhost:3700/api/workouts/adhoc/{completion_id}/sets',
    data={'exerciseId': ex_id, 'setNumber': 1, 'reps': 5, 'weight': 135, 'weightUnit': 'lbs'},
)

page.goto(f'http://localhost:3700/training/adhoc/{completion_id}')
page.wait_for_load_state('networkidle')
page.wait_for_timeout(1500)
page.locator('button:has-text("Finish")').click()
page.wait_for_timeout(500)
page.locator('button:has-text("Confirm")').click()
page.wait_for_timeout(3000)  # rollup mount + animation
```

A working version of this lives at
`.claude/skills/webapp-testing/examples/ripit-rollup.py`.

### Working with a fresh draft each run

The freestyle endpoint enforces "one open draft per user" — if a previous run
left a draft behind, `POST /api/workouts/adhoc` returns 409 with the existing
draft. Either re-use it via the response payload, or clean up first:

```bash
PGPASSWORD=postgres psql -h localhost -p 5440 -U postgres -d ripit -c \
  "UPDATE \"WorkoutCompletion\" SET status='abandoned' WHERE status='draft';"
```

## Measuring layout (instead of guessing from screenshots)

Screenshots show you *that* something's wrong; `getBoundingClientRect()` tells
you *by how much*. Use `page.evaluate(...)` to extract pixel-accurate measurements:

```python
measurements = page.evaluate("""() => {
    const footer = document.querySelector('div.shrink-0.border-t-2');
    if (!footer) return null;
    const r = footer.getBoundingClientRect();
    return {
        viewport: window.innerWidth,
        footer: {x: r.x, width: r.width, right: r.right},
        buttons: Array.from(footer.querySelectorAll('button, a')).map(c => {
            const cr = c.getBoundingClientRect();
            return {text: c.textContent.trim().slice(0, 30), width: cr.width, right: cr.right};
        }),
    };
}""")
```

This is what surfaced that the rollup footer's Done button was overflowing the
modal by 24px — much faster than iterating "make it smaller, screenshot, repeat".

## Discovery pattern when you're lost

When you don't know the selector, list visible elements with their key attrs:

```python
for b in page.locator('button:visible').all():
    print({a: b.get_attribute(a) for a in ['aria-label', 'id', 'class']}, b.inner_text()[:40])
```

Or query the DOM directly:

```python
hits = page.evaluate("""() => {
    return Array.from(document.querySelectorAll('button, a'))
      .filter(el => el.offsetParent !== null && el.textContent.includes('YOUR_TEXT'))
      .map(el => ({tag: el.tagName, label: el.getAttribute('aria-label'), text: el.textContent.trim().slice(0,50)}));
}""")
```

The `offsetParent !== null` check filters out hidden duplicates (e.g. the
desktop chip when on mobile viewport).

## When to add to this doc

If you spend more than 5 minutes figuring out a selector or flow that's likely
to be reused (auth, navigation, multi-step flows like reaching a modal), add a
recipe here. The goal is for the next agent doing UI verification to land
running, not re-discover the same selectors.
