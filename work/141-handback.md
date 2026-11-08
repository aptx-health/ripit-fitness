Report: complete
Item 141 workout library discovery (coach-disco, 2026-11-06). Note: initiatives/workout-library/docs/141-discovery.md.
Found: Library > Workouts is one flat list, no search/tags/paging; pinned not lifted; accepted AI workouts (lastUsedAt null) sort to the bottom; no origin recorded. Created by saving after a freestyle session or approving an agent proposal. Likely duplicates when a session started from a saved workout offers Save again (WorkoutRollupModal.tsx:155, inferred).
Design: SavedWorkout.tags String[] (8/workout, 50/user), origin (session/agent/coach), archivedAt. Order: search + tag chips, New (AI/coach until first started or dismissed), Pinned, Recent, collapsed Older (unused 30+ days, no auto-delete).
Slices: 1 ordering + Older (no schema); 2 tags + search; 3 origin + New + archive + MCP (before coaching send); 4 bulk tidy + rollup "Update vs Save as new".
Needs Dustin: Older at 30 days + manual archive; New group until used; free-text tags, agents/coaches limited to existing tags.
