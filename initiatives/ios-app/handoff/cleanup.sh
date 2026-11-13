#!/usr/bin/env bash
# Cleanup collected from the iOS 4h run (2026-11-07). Agents deferred all deletes.
# Review, then run: bash initiatives/ios-app/handoff/cleanup.sh
set -u
SP=/private/tmp/claude-501

# Simulators created by the agents
for id in 6D438DC4-A1C3-4380-8C9A-7DAB6881E9C2 03769AD8-8523-4EAA-8A1E-831C5F585B26 \
          B8EF9477-01AB-4FE3-B0CC-9C6D4A9BB4B3 D43E5170-51DB-4D32-A864-483EC7F914D6 \
          66E7D165-0F47-44ED-AAD5-09D5B8E43D44 5BFA4E68-231A-44F0-AC3D-7DC8606941DA; do
  xcrun simctl shutdown "$id" 2>/dev/null; xcrun simctl delete "$id"
done

# Stray dev stacks and containers
tmux -L overmind-worktree5-kAkeVdmL5tVf2GV4FMfIw kill-server 2>/dev/null
docker stop fitcsv-postgres-wt7 fitcsv-redis-wt7 fitcsv-postgres-wt6 2>/dev/null
docker rm fitcsv-postgres-review155 2>/dev/null && docker volume rm fitcsv-pgdata-review155
(cd ~/projects/worktrees/ripit-fitness/worktree3 && ./scripts/dev.sh quit 2>/dev/null)

# Test temp DBs from before the 6b0ae6fa fix, and lead's log
rm -rf "${TMPDIR:-/tmp}"/ripitcore-* /tmp/ioscheck.log

# Agent scratchpads (screenshots, scratch fakes with .build, DerivedData)
rm -rf "$SP/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/"{7797f706-e961-4bd7-bd21-9fa811a085e3,42c9e48e-383c-40cc-8a8f-da18d573ba81,63d03f56-5ac0-462c-ab31-d70b9d53b0e3,643821d1-2005-4e50-b99d-dd541f067605}
rm -rf "$SP/-Users-dustin-projects-worktrees-ripit-fitness-worktree5/"{76ad4392-92f4-42ed-bc0b-9906a5acf6d6,fff5394c-578e-4e17-9207-813c494cb97e}
rm -rf "$SP/-Users-dustin-projects-worktrees-ripit-fitness-worktree3/"{6449178e-aa08-460e-a5a7-05ff335c022d,5715dc96-7aaa-46fd-87db-437691c06eb7}

# Build output (git-ignored, hundreds of MB)
rm -rf ~/.herdr/worktrees/ripit-fitness/worktree-brave-field-c150/ios/build

# Worktrees used only for this run (branches are kept): worktree5 = feature/ios-programs (merged), worktree6 = detached review copy
git -C ~/projects/ripit-fitness worktree remove ~/projects/worktrees/ripit-fitness/worktree6
git -C ~/projects/ripit-fitness worktree remove ~/projects/worktrees/ripit-fitness/worktree5

# Slice 5 run (items 173-178)
for id in 06CEC7E3-537B-4866-8153-F71E8CC87FA1 AC0A4C20-488B-4434-B0C3-0B1B31447959; do
  xcrun simctl shutdown "$id" 2>/dev/null; xcrun simctl delete "$id"
done
rm -rf "$SP/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/"{dc0702dd-f34d-46ac-8b2a-ec5acf33b91b,44afb9af-41a6-40d7-89a7-85bb6d797219,ba850211-9970-4a09-8ca1-a87a94c21da7}
rm -f "${TMPDIR:-/tmp}"/ioscheck{5,6,7,8}.log

# Slice 6 run (items 179-181)
rm -rf "$SP/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/"{3b341d8a-5281-42dc-ab51-6e6f0dbe963e,e707016a-8e70-425e-b299-c1acfaf8cd6c}
rm -f /var/folders/h9/x7jsdhy915scf8vf47smkshc0000gn/check181.log "${TMPDIR:-/tmp}"/ioscheck9.log

# Slice 7 run (items 184-188)
for id in E5D3C467-6F9A-4DE0-BFBF-E31F8E268D92; do xcrun simctl shutdown "$id" 2>/dev/null; xcrun simctl delete "$id"; done
xcrun simctl delete ripit-185-impl ripit-180-impl 2>/dev/null
rm -rf "$SP/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/"{d54f3816-2aa9-4269-9f06-dbd9cd779fbb,690bd726-172a-46d9-a380-7c6304e3b4c4,79a9abe2-03cb-4a79-97c9-4f587c871889}
rm -f "${TMPDIR:-/tmp}"/ioscheck1{0,1,2}.log
