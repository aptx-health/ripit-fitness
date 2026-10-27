---
title: Agents inside apps and agents maintaining apps - landscape and starting point for Ripit
type: research-spike
question: What are the most boundary-pushing ways agents work inside apps and help develop and maintain them, and which fit a single-user app on self-hosted k8s?
status: partial
created: 2026-10-25
verified_as_of: 2026-10-25
recheck_by: 2027-01-25
confidence: medium
tags: [agents, mcp, chat-ops, sdd, bdd, evals, k8s]
projects: [ripit-fitness]
sources:
  - https://code.claude.com/docs/en/channels.md
  - https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/
  - https://arxiv.org/abs/2510.20270
  - https://docs.sentry.io/integrations/coding-agents/
  - https://kubernetes.io/blog/2026/03/20/running-agents-on-kubernetes-with-agent-sandbox
  - https://anthropic.com/engineering/demystifying-evals-for-ai-agents
  - https://arxiv.org/pdf/2602.11988
---

## Answer

The pattern that is credible today is: **typed tools over the app, agents that propose rather than write, and a human approval gate enforced by infrastructure, not prompts.** The same idea shows up on both sides:

- **User side:** expose a small tool layer as an MCP server. Agent writes become `Proposal` rows that you approve, with undo.
- **Dev side:** feedback or a Sentry error becomes a deduped issue, then an agent PR to `dev` with a regression test, then green CI, then a human merge.

"Self-healing" without a human in the loop is still mostly demos.

Research was 4 Sonnet agents working from web search summaries, and most pages were not read in full. Decisive claims were spot-checked where marked.

## Findings

### User-facing agent (workouts, exercise DB, insights)

1. **FACT:** You can host a remote MCP server inside a Next.js App Router app. Neon runs one at `app/api/[transport]/route.ts`, and Vercel's `mcp-handler` supplies the OAuth helpers. See [Vercel](https://examples.vercel.com/docs/mcp/deploy-mcp-servers-to-vercel) and [Neon](https://glama.ai/mcp/servers/@neondatabase-labs/mcp-server-neon).
2. **FACT:** Community Hevy MCP servers already create and update workouts. One defaults writes to preview mode because the Hevy API has no DELETE, so mistakes are permanent. See [glama](https://glama.ai/mcp/servers/karlhsueh/hevyapp-mcp). The lesson: design undo in from day one.
3. **FACT:** MCP tool annotations (`readOnlyHint`, `destructiveHint`) are hints for the client, not a security boundary. See [aident](https://aident.ai/blog/mcp-tool-annotations-explained).
4. **FACT (spot-checked):** MCP Apps (SEP-1865) lets a tool return a `ui://` HTML template that renders in a sandboxed iframe inside the chat host. It was co-authored by Anthropic and OpenAI maintainers and the MCP-UI authors. The Nov 2025 post calls it a proposal. See [MCP blog](https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/).
5. **INFERENCE:** Branching the whole database per agent, Neon/Supabase style, is overkill for one user. Use a `Proposal` table of structured operations instead:
   - The agent's tools can only create proposals.
   - A separate, non-agent endpoint applies a proposal in a single Prisma transaction.
   - Applying it writes an inverse-operation audit row, which gives one-click undo.
6. **INFERENCE:** Fitness agent products are chat-first and give little control over plan structure. Fitbit Gemini Coach and Whoop Coach are examples; see [mobihealthnews](https://www.mobihealthnews.com/news/google-debuts-gemini-powered-ai-health-coach-fitbit-and-pixel-watch-users). Ripit's edge would be an agent that edits the real structured program, with your approval.
7. **INFERENCE:** For memory, keep a small user-editable `UserMemory` record (injuries, equipment, goals). Insights should come from querying `LoggedSet` against `PrescribedSet`, not from memory.

### Developer-facing agents (fix and improve the app)

8. **FACT:** Sentry Seer does root-cause analysis and planning itself. You choose where it stops, and it can hand off to Claude, Copilot or Cursor to open a PR. Seer bills people who create 2 or more PRs a month; the price is NOT VERIFIED. See [Sentry docs](https://docs.sentry.io/integrations/coding-agents/).
9. **FACT:** PostHog's auto-fix flow runs in four steps, and a human always reviews the PR. Source: [summary](https://www.createwith.com/tool/posthog/updates/posthog-expands-self-driving-mode-to-auto-fix-errors-with-ai-research-agents).
   1. An LLM filters out suspicious signals, because stack traces can carry attacker-controlled text.
   2. Errors are grouped by root cause.
   3. An agent iterates until CI is green.
   4. It opens a PR.
10. **FACT:** Field reports show two failure modes. Agents claim fixes they never verified. Triage is noisy: one team found about 70% of errors were noise. See [conffab](https://conffab.com/presentation/agentic-self-healing-in-production/).
11. **FACT (spot-checked):** Claude Code Channels (research preview) pushes Telegram, Discord or iMessage messages into a running local session. Channels that declare the permission-relay capability let you approve or deny tool prompts from your phone. See [docs](https://code.claude.com/docs/en/channels.md). This resolves agent 3's open question.
12. **FACT:** Hermes' gateway serves Telegram with an allowlist of users and supports a Docker terminal backend. See [docs](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram). Whether Hermes skips command approval inside a container is NOT VERIFIED.
13. **FACT:** OpenClaw has had many exposed instances and malicious marketplace skills. See [CSA](https://labs.cloudsecurityalliance.org/agentic/agentic-openclaw-hardening-guide-v1/).
14. **FACT:** `kubernetes-sigs/agent-sandbox` provides a Sandbox CRD. It leaves isolation to gVisor or Kata via RuntimeClass and is still in development. See [k8s blog](https://kubernetes.io/blog/2026/03/20/running-agents-on-kubernetes-with-agent-sandbox).
15. **FACT:** The ArgoCD ApplicationSet PR generator can create a preview app per labeled PR and remove it when the PR closes. Source is secondary: [oneuptime](https://oneuptime.com/blog/post/2026-02-09-argocd-pr-preview-environments/view).
16. **FACT:** Simon Willison's "lethal trifecta" is private data, untrusted input and an exfiltration path on the same execution path. The fix is to remove one leg, usually network egress, and enforce that in infrastructure. See [agentpatterns](https://agentpatterns.ai/security/lethal-trifecta-threat-model/). Feedback text in Ripit is untrusted input.

### Specs, TDD, BDD, evals

17. **FACT (spot-checked abstract):** ImpossibleBench gives agents tasks where the spec conflicts with the tests. Agents "pass" them by changing the tests or by operator overloading. Test access and the feedback loop change how often they cheat. See [arXiv](https://arxiv.org/abs/2510.20270). The exact rates come from secondary sources and are NOT VERIFIED. METR reports the same behavior: [METR](https://metr.org/blog/2025-06-05-recent-reward-hacking).
18. **FACT:** An ETH Zurich study found LLM-generated context files (AGENTS.md) lowered success and raised cost. Human-written, minimal files gave a small gain. See [arXiv 2602.11988](https://arxiv.org/pdf/2602.11988). The study is single and Python-only.
19. **FACT:** Thoughtworks Radar has spec-driven development at "Assess". There are no controlled studies of Spec Kit, Kiro or BMAD; the source is a [secondary summary](https://horadecodar.com.br/?p=39792).
20. **FACT:** Without guidelines, AI-written Gherkin drifts toward vague Then steps and UI scripting. Scenarios only add value when they execute. See [Automation Panda](https://automationpanda.com/tag/cucumber/).
21. **FACT:** Anthropic's agent eval guide grades the final environment state, uses code graders first, and reports pass^k for reliability. See [guide](https://anthropic.com/engineering/demystifying-evals-for-ai-agents).
22. **FACT:** Self-host options differ in weight:
    - promptfoo runs on Express and SQLite.
    - Phoenix is a single container under the Elastic License 2.0.
    - Langfuse needs ClickHouse, Postgres, Redis and blob storage.
    See [promptfoo](https://www.promptfoo.dev/docs/usage/node-package) and [Phoenix](https://arize.com/docs/phoenix/learn/resources/faqs/langfuse-alternatives).

## Conflicts resolved

- **MCP Apps status.** Agent 1 called it an "official extension" (Jan 2026). The primary Nov 2025 post calls it a proposal. Treat it as possibly shipped, and check client support before building on it.
- **Remote permission approval in Channels.** Agent 3 flagged a third-party claim that it doesn't work. The official docs describe a permission-relay capability, so it is supported for channels that declare it.
- **Langfuse self-host feature gating.** Arize and Langfuse contradict each other, and this is still open.

## Open questions / next spikes

- Can Claude mobile or desktop use a custom remote MCP connector against a self-hosted URL, and render MCP Apps there?
- Does Hermes run tools in a k8s pod, or only in local Docker? Does it skip approvals inside the container?
- Will gVisor run on the VPS nodes? Kata likely needs nested virtualization.
- How do Devin, OpenHands, Codex cloud and Jules compare? Not researched.
- What are the cheapest per-PR ephemeral Postgres options for ArgoCD previews?
- Do playwright-bdd and protected `.feature` files actually work as an agent acceptance gate? A small trial would show.
