# Ripit iOS slice 8: picker filters and custom exercises

**What you need to do:** try it on your phone, then accept the slice or tell me what to change. Say "install" and I'll put it on your phone. Slice 9 (the smart picker) is ready to start once you've had a look.

## Outcome

The exercise picker now works like the web's Add exercise picker, and you can create your own exercises.

**Checks:**
- An independent reviewer accepted it.
- Every scenario passes by real taps.
- Results match the local web row for row in 16 side-by-side searches.
- `mise run ios-check` passes: 263 tests, plus the simulator build.

**What's new:**
- **Search like the web:** the same matching, order and aliases. For example, "ohp" finds Overhead Press and "pull up" finds Pull-Up.
- **Two filters,** muscle group and equipment, one choice each as on the web, plus "All" to clear. "Other" covers the specialised kit, as on the web.
- **Pick several:** tick exercises, then Add (n) adds them in the order you ticked. Ticks survive a new search. This works in a workout, the program builder and the program editor.
- **Create your own:** from "+ Create", or "Create "&lt;your search&gt;"" when nothing matches. The name is filled in from the search. Equipment and primary muscle are one choice each. Secondary muscles can be several. Instructions take up to 4000 characters.
- **Your exercises are marked MINE** and can be edited. A rename shows everywhere: the open workout, History, Progress and programs. Built-in exercises can't be edited.
- **Import** matches your web custom exercises by name, so nothing is duplicated.

## Screens

Search and filters:

![Search](slice8-assets/ios-a-q-bench.png) ![Muscle filter](slice8-assets/ios-a-muscle-sheet.png) ![Search plus both filters](slice8-assets/ios-a-both-squat.png)

Pick several, then create your own:

![Three ticked](slice8-assets/ios-b-01-ticked3.png) ![Added in order](slice8-assets/ios-b-03-logger.png) ![Create from search](slice8-assets/ios-c-00-nomatch.png) ![Saved and ticked](slice8-assets/ios-c-07-saved-ticked.png)

The editor after the fixes (opens clean; errors after Save; duplicate warning stays above the keyboard):

![Editor](slice8-assets/recheck-pairs-editor.png)

Web vs iOS:

![Web vs iOS](slice8-assets/pairs-web-vs-ios.png)

Largest text:

![Largest text](slice8-assets/pairs-ax5.png)

## Calls made (overrule any)

1. **Three deliberate differences from the web** (your calls):
   - Names are trimmed.
   - Search ranks every match, then shows the top 50.
   - A name needs a letter or digit, so "!!!" is refused.
2. **The editor shows errors only after you touch a field or tap Save,** as on the web. The reviewer flagged errors showing on open, and this is the fix.
3. **An imported web exercise the phone doesn't know counts as built-in:** no MINE badge, no Edit. It's a web built-in added after the phone's catalog was made. Your own custom exercises stay MINE.
4. **A saved workout keeps a renamed exercise's old name.** The web does the same, because it stores a copy.
5. **iOS shows photos and tick boxes;** the web shows text cards with one Add button per row. The iOS editor leaves out the web's Category, Notes and Preview fields.

## Not verified

- **Not on your phone yet.**
- **E-ink and the other themes** weren't walked in the editor. RIPIT dark, light and the largest text were.
- **Rows imported before this fix aren't changed.** Only matters if your phone imported a web export before today. If you see a web exercise marked MINE, a re-import won't clear it; tell me and I'll add a one-line fix.

## Also done today

- **PRs into dev are open:** #1054 (web export, merge first) and #1055 (iOS, slices 1–7). Slice 8 is committed locally but not pushed, so it's not in #1055 yet.
- **iOS work items moved** to `initiatives/ios-app/work/`, because another stream's numbers clashed on dev.
- **Disk space:** 11 old simulators deleted (40 GB → 11 GB). Agents now reuse one simulator each.

Records: `initiatives/ios-app/work/189`–`195` with handbacks; `features/ios-app/picker-custom.feature`.
