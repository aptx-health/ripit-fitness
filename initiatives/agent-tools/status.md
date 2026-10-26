# Agent tools: status log

Append-only. Newest at the bottom.

- 2026-10-25 20:23 MDT: Initiative started. Research landscape in [docs/2026-10-25-agents-in-apps-research.md](docs/2026-10-25-agents-in-apps-research.md): build a typed MCP tool layer, have agents propose and never write, and let Dustin approve with undo. Slice 1 scope set (Proposal core + exercise DB; programs in slice 2) and runner chosen (vitest-cucumber). Spec in [docs/spec.md](docs/spec.md). Work items `001` (tests) and `002` (implementation) await confirmation.
- 2026-10-25 20:55 MDT: AGENTS.md trimmed from 602 to 114 lines after an independent review. Detail moved to docs/TESTING.md, docs/DEPLOYMENT.md and docs/CLONE_WORKER.md. Work items 001 and 002 confirmed by Dustin; 001 dispatched to a Sonnet test-builder. Rule set: specs are written only when an item is about to be dispatched.
- 2026-10-25 20:34 MDT: correction: the lead wrote the 20:41, 20:55 and 21:10 timestamps above as estimates. The real times were earlier (about 20:25 to 20:34 MDT).
- 2026-10-25 21:07 MDT: Notification route decided: Discord #proposals (`DISCORD_PROPOSALS_WEBHOOK_URL`, added to Doppler by Dustin), with Bark kept optional. Items 005 (tests) and 006 (implementation) confirmed; 005 dispatched to test-builder. 003 is in review; 004 is running with implementer.
- 2026-10-25 21:17 MDT: Dustin accepted 003, 004 and 005. 006 (Discord notifier) resumed with implementer.
- 2026-10-25 21:31 MDT: 006 accepted, so slice 1 is complete. Opening a PR to dev.
- 2026-10-25 21:45 MDT: PR #995 merged into dev, so slice 1 is deploying to staging. ROADMAP.md added as the backlog; next up is `list_feedback`.
- 2026-10-25 21:49 MDT: Agents reading feedback (007 and 008) started. Dustin pre-approved the specs and work items; the lead accepts items and opens the PR, and Dustin merges.
- 2026-10-25 21:58 MDT: 008 accepted (agents read feedback, link proposals to it, and approve resolves it). PR opened to dev.
