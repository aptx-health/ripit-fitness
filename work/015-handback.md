Report: complete

(Received from implementer via SendMessage, 2026-10-26; summarized by the lead.)

- Tests: 239/239 (agent-tools + proposals-approve-transaction). Full suite: 1091 pass, 4 skipped (program-proposals went from 66 to 59; no new failures). Type-check, biome and eslint are clean.
- `service.ts`:
  - Approving `program.create` stores no inverse.
  - `revertProposal` checks in this order: not_found → not_applied (status) → `program.create` gets `invalid` with the spec text → no inverse gets not_applied.
  - The `delete_program` branch is removed.
- `program.ts`: `deleteProgram` and `ProgramInverse` are removed.
- `ProposalActions.tsx`: new `canRevert` prop (default true). The detail page passes `canRevert={!isProgram}`.
- Not verified: the hidden button has no test and no screenshot. The admin route already maps `invalid` to 422.
