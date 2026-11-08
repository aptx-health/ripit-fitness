# iOS app: ideas (not a plan)

Dustin, thinking out loud, 2026-11-08. These are ideas, not roadmap items.

## Shape of a public release

- **Free app on the App Store.** It would include built-in programs and workouts, and the Learn content bundled with the app. Data stays on the phone.
- **Release costs:** a paid Apple Developer account ($99/yr), which also ends the 7-day re-signing. Workout data is health-adjacent, so App Store privacy labels and review will matter.

## AI access in two tiers

The goal is the least server you need to run that still lets anyone's own AI work with the app.

### Tier 1: no setup (Claude or ChatGPT app connectors)

- **What they get:** their agent can propose workouts and programs, and the user approves them on the phone. It doesn't handle health data or deep history.
- **What it needs:**
  - a hosted remote MCP server with HTTPS and OAuth, which the built-in connectors require
  - the catalog and Learn content, which are public
  - the existing propose tools
  - a small queue of proposals, linked to the user's device
- **What's stored:** ideally almost nothing. Pending proposals are kept until the phone pulls them. Workout history and settings are never stored.
- **How the agent gets context:** the user can share a snapshot they choose from the phone, for example this week's training or their active program. The snapshot is short-lived, not a stored history.

### Tier 2: advanced (their own server, their own risk)

- **Who it's for:** users who want what Dustin has today with the web MCP, meaning full history, performance and settings, with the agent doing whatever they ask.
- **How:** they run the Ripit MCP server themselves (open source), point the app at its URL, and the phone syncs everything to it. Or the agent reads a full export file.
- **Who's responsible:** the user owns the data and the risk. The app just needs a stable, documented data format and a sync target it can be configured with.
- **Possible paid version:** Dustin hosts the same thing as a subscription: backup plus full MCP. In-app purchase rules apply, with Apple taking a cut.

## What this means for current work

- **Slice 12 (export from iOS) is the hinge.** Design the export format as an open spec with versioning, not just a file the web can import. Both tiers build on it.
- **Keep proposals as a format of their own,** so the phone can import them from a file, from the Tier 1 queue or from a Tier 2 server in the same way.
- **The existing web MCP** has 17 read tools and 7 propose tools (`app/api/mcp/route.ts`). Tier 1 is roughly the propose tools plus catalog reads. Tier 2 is all of it.

## Open questions

- Does Tier 1 need user accounts, or would a device token plus OAuth be enough?
- Could the shared snapshot be generated on the phone, so the server never sees raw history?
- Is the self-hosted server the current Next.js app, or a small standalone MCP server that reads the export format?

## Recommended direction (2026-11-08, Dustin agrees: build Tier 1 and Tier 2; paid only if it becomes a thing)

The phone is the only place data lives. The servers forget quickly. Advanced users move data through files they control.

### Tier 1: a stateless MCP server as a middleman

**The core problem:** an MCP tool can't call the iPhone app. Nothing can reach a suspended iOS app. So the phone starts every exchange, and does all the reading and reshaping of data itself.

**Flow:**
1. **The phone builds the context.** In the app, the user taps **Ask AI** and picks what to share, for example this week, the active program, a lift's history, or their goals. The app turns that into a compact snapshot.
2. **Handing it over:**
   - **v0, no server:** the share sheet opens ChatGPT or Claude with a prompt and the snapshot as text.
   - **v1, short-lived relay:** the app encrypts the snapshot and uploads it with a time limit of about an hour. It copies a short code, with the key in the code, into the prompt. The agent calls `ripit_context(code)`. The server decrypts the snapshot in memory, returns it and keeps nothing readable.
3. **The agent plans** with the MCP tools for the catalog, Learn content, and building and checking proposals.
4. **The proposal comes back as a link,** `ripit://proposal/…`. The plan is compressed into the link, or held for 24 hours by code if it's too big. The user taps it, the app opens, and they approve.

**Infrastructure:** one serverless function, plus an expiring key-value store from v1 on. There are no accounts and no database of history.

### Tier 2: a folder as the go-between, with no infrastructure on Dustin's side

1. The phone writes the full export into a folder the user controls, such as iCloud Drive.
2. An open-source Ripit MCP server runs on the user's own computer, and Claude Desktop or Claude Code loads it. It reads the folder, which gives all the read tools Dustin has today.
3. Proposals are written back to the folder as files, and the phone imports them.

### Paid, only if asked for

- **Encrypted backup** that only the phone can decrypt.
- **Hosted full MCP:** needs readable history, so the phone sends snapshots that expire rather than a permanent copy.

### What it asks of the app

- **Export format and proposal format:** versioned, open specs (slice 12). These are the whole interface.
- **An "Ask AI" screen:** pick a scope, build the snapshot and share it, then handle `ripit://proposal` links. This could be its own slice after slice 12.
