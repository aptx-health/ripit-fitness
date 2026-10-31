Report: complete (057, TL5b build). Relayed by SendMessage 2026-10-31; saved by the lead (condensed).

**Built**
- **`lib/auth/roles.ts`:** `ADMIN_ROLES`, `EDITOR_ROLES`, `isAdminRole` and `isEditorRole`. `lib/admin/auth.ts` re-exports them.
- **`lib/mcp/tools.ts`:**
  - `ToolContext.role` is optional; a missing role means a regular user.
  - `listTools(role)` hides `propose_exercise_*` from non-admins.
  - `callTool` refuses them before argument validation.
  - `notifyFor(ctx)` notifies for admins only.
- **`app/api/mcp/route.ts`:** `ownerRole` reads the role from the `"user"` table, falling back to 'user'.
- **`app/api/agent-tokens`** (GET, POST) and **`[id]`** (DELETE), using `programManagementLimiter`. Shared helpers are in `lib/agent-token-view.ts`.
- **`components/features/agent-access/AgentAccess.tsx`.**
- **`/settings/agent-access`**, using `NEXT_PUBLIC_APP_URL`, plus the Settings row after Target Movements.

**Checks**
- 866/866 targeted; tsc, biome and eslint are clean.
- The 12 TL5a failures (seeds with no role) were fixed by the test-builder.
- Full suite: 2369 passed. The lead re-ran it with the same result.

**Screenshots:** `docs/assets/057/`, taken as a temporary user, who was then deleted. No MCP calls were made, so no notifications.
