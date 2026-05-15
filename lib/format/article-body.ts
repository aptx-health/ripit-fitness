/**
 * Strips a leading H1 from article markdown when its text duplicates the
 * article's `title`. The Learn article page renders the title as page chrome,
 * so a matching H1 at the top of the body would render the title twice.
 *
 * Behavior:
 * - Only the first non-empty line of the body is considered.
 * - Match is case-insensitive and whitespace-normalized.
 * - Trailing markdown formatting (e.g. `# Title #`) and surrounding inline
 *   markup tokens (`*`, `_`) are tolerated.
 * - If the leading H1 doesn't match the title, or there is no leading H1, the
 *   body is returned unchanged.
 */
export function stripDuplicateTitleHeading(
  body: string,
  title: string,
): string {
  if (!body) return body

  // Find the first non-empty line
  const lines = body.split('\n')
  let firstIdx = 0
  while (firstIdx < lines.length && lines[firstIdx].trim() === '') {
    firstIdx++
  }
  if (firstIdx >= lines.length) return body

  const firstLine = lines[firstIdx]
  // Match a Markdown ATX H1: leading `#` (not `##`), optional trailing `#`s
  const h1Match = firstLine.match(/^\s*#\s+(.+?)\s*#*\s*$/)
  if (!h1Match) return body

  if (normalize(h1Match[1]) !== normalize(title)) return body

  // Strip the H1 line plus any immediately-following blank lines
  let nextIdx = firstIdx + 1
  while (nextIdx < lines.length && lines[nextIdx].trim() === '') {
    nextIdx++
  }
  return lines.slice(nextIdx).join('\n')
}

function normalize(s: string): string {
  return s
    // Strip surrounding inline emphasis tokens so `# *Title*` matches `Title`
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}
