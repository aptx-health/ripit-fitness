Report: complete (052, TL6 folder tabs). Relayed by SendMessage 2026-10-31; saved by the lead (condensed).

**Preview seed cleanup:** the 2 proposals and the token are deleted. Dustin hadn't accepted either. Push A's pin is Dustin's own, from the preview, so it stays.

**Built**
- **`components/training/SectionTab.tsx`:** three variants, coach, next and quiet.
  - It has a clip-path tab and exports `SECTION_BOX`.
  - The `h2` holds the label alone.
  - The count chip is `role=img` with an `aria-label`.
- **`TrainingHome`:**
  - The coach card, with the meta line rendered client-only.
  - The rationale as a blockquote, with CSS quote marks.
  - Up to 2 dashed rows.
  - The green Up Next box.
  - Quiet tabs for Pinned, Recent and Current Program, with Current Program as a single row.
- `SuggestionItem` gains `exerciseCount`.

**Checks**
- 645/645 in the targeted files, including the test-builder's updates and `training-home-tabs.test.tsx`.
- Full suite: 2269 passed.
- tsc, biome and eslint are clean.

**Screenshots:** `docs/assets/052/`, including `side-by-side.png`.

**Open point:** long target titles truncate in the compact rows.
