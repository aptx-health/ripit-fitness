Report: complete

(Received from implementer via cross-session message, 2026-10-26; summarized by the lead.)

- Tests: 246/246 (proposals-approve-transaction + agent-tools). Full suite: 1098 pass, 4 skipped (1092 + 6 new; nothing new fails). Type-check, biome and eslint are clean.
- `service.ts`:
  - The approve `$transaction` gets `{ timeout: 30000 }`.
  - P2028 goes to `refuseApproval('invalid', 'approve timed out before it finished; nothing was applied')`.
  - Other unknown errors are still rethrown.
- `program.ts`: an `orNull` helper in `createProgram` turns an empty weight, notes or week name into null. This happens at create time, not with a zod transform, because `programInput` also produces the tool's JSON schema and `z.toJSONSchema` doesn't support transforms. So a stored proposal payload can still contain ''.
- Nothing committed, no dev server, no tokens. Nothing outside the item.
