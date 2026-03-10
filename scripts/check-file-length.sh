#!/usr/bin/env bash
# Checks that no file exceeds the maximum line count.
# Usage: check-file-length.sh <file1> [file2] ...

MAX_LINES=500
EXIT_CODE=0

for file in "$@"; do
  if [ ! -f "$file" ]; then
    continue
  fi

  line_count=$(wc -l < "$file")

  if [ "$line_count" -gt "$MAX_LINES" ]; then
    echo "ERROR: $file has $line_count lines (max $MAX_LINES)"
    EXIT_CODE=1
  fi
done

if [ "$EXIT_CODE" -ne 0 ]; then
  echo ""
  echo "Files exceeding $MAX_LINES lines must be split into smaller modules."
fi

exit $EXIT_CODE
