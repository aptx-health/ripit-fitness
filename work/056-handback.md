Report: complete (056, TL5b tests, red). Relayed by SendMessage 2026-10-31; saved by the lead (condensed). The full seam spec is in the header of `__tests__/features/training-library/user-agent-tokens.steps.ts`.

**Files** (locked)
- `user-agent-tokens.steps.ts`: 90 tests, using a real DB, the routes, the MCP route and the service.
- `settings-agent-access-link.test.tsx`: 3 tests.

**Seams**
1. **`app/api/agent-tokens/route.ts`:**
   - `GET` → `{tokens:[{id, name, createdAt, revokedAt}]}`, newest first.
   - `POST {name}` → 201 `{token:{id, name, createdAt}, secret}`.
   - Name rules: trimmed, 1–50 characters; anything else is a 400.
   - 409 `TOKEN_LIMIT` at 5 active tokens.
   - 401 with no user; 429 when rate limited.
2. **`app/api/agent-tokens/[id]/route.ts` `DELETE`** → 200 `{token}`.
   - Revoking twice is OK and keeps the first time.
   - 404 for an unknown id or another user's.
3. **`lib/mcp/tools.ts`:**
   - `ToolContext.role`.
   - `listTools(role)` hides `propose_exercise_*` from non-admins.
   - `callTool` refuses them with `code:'forbidden'` and "Exercise library changes are admin-only.", writing nothing and sending no notification.
   - `ctx.notify` is called only when `role === 'admin'`.
4. **`app/api/mcp/route.ts`:** resolves the token owner's role from the BetterAuth `"user"` table (no row means a regular user). A revoked token gets 401.
5. **`components/features/agent-access/AgentAccess.tsx`** (`{mcpUrl}`):
   - The back link, the explanation, the MCP address and the token list.
   - Create, with the secret shown once in a copy box.
   - Revoke, with a confirmation.
   - Create is disabled at the limit.
6. **The page** `/settings/agent-access`: glue only, not tested.

**Locked agent-tools tests changed:** in all 7 steps files, `ctx()` gains `role: 'admin'` and `listTools()` becomes `listTools('admin')`. tsc errors on those calls until the signature changes.

**Red state:** 76 of 90 and 3 of 3 fail. Every other test passes.

**Break matrix:** 55 breaks, all killed.

**Not tested:** the page glue, editors, and whether the forbidden check runs before argument validation.
