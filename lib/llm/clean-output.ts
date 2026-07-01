/**
 * Cheap LLM models routinely produce malformed JSON. This module strips
 * the common failure-mode garbage and returns a best-effort JSON string
 * that the caller can pass to `JSON.parse`.
 *
 * Known failure modes handled:
 * - Markdown code fences (```json ... ``` or ``` ... ```)
 * - Preambles ("Here's your workout: { ... }")
 * - Trailing prose after the JSON body
 * - Trailing commas before } or ]
 * - Single-quoted JSON strings/keys
 *
 * Pure function. No I/O, no side effects.
 */

/**
 * Strip leading/trailing markdown code fences from a string. Handles
 * ```json, ```JSON, plain ``` and optional surrounding whitespace.
 */
function stripCodeFences(input: string): string {
  let s = input.trim()
  // Leading fence
  const leading = s.match(/^```[a-zA-Z0-9_-]*\s*\n?/)
  if (leading) {
    s = s.slice(leading[0].length)
  }
  // Trailing fence
  const trailing = s.match(/\n?```\s*$/)
  if (trailing) {
    s = s.slice(0, s.length - trailing[0].length)
  }
  return s.trim()
}

/**
 * Extract the first balanced JSON object or array substring using depth
 * counting. Returns null if no balanced structure is found.
 *
 * Walks the string while tracking depth across `{}` and `[]`. Skips over
 * string literals (both " and ') so that braces inside strings don't
 * affect depth.
 */
function extractBalancedJson(input: string): string | null {
  // Find the first { or [
  let start = -1
  let opener: '{' | '[' | null = null
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (c === '{' || c === '[') {
      start = i
      opener = c
      break
    }
  }
  if (start === -1 || opener === null) return null

  const closer = opener === '{' ? '}' : ']'
  let depth = 0
  let inString: '"' | "'" | null = null
  let escapeNext = false

  for (let i = start; i < input.length; i++) {
    const c = input[i]
    if (escapeNext) {
      escapeNext = false
      continue
    }
    if (inString) {
      if (c === '\\') {
        escapeNext = true
        continue
      }
      if (c === inString) {
        inString = null
      }
      continue
    }
    if (c === '"' || c === "'") {
      inString = c
      continue
    }
    if (c === opener) depth++
    else if (c === closer) {
      depth--
      if (depth === 0) {
        return input.slice(start, i + 1)
      }
    }
  }
  return null
}

/**
 * Remove trailing commas before } or ]. Naive, but safe enough for
 * post-extraction cleanup since we've already isolated JSON.
 */
function removeTrailingCommas(input: string): string {
  return input.replace(/,(\s*[}\]])/g, '$1')
}

/**
 * Replace single-quoted strings/keys with double-quoted equivalents.
 *
 * Only operates when the input does NOT already contain double-quoted
 * strings, OR when single quotes appear in JSON-key/value positions. We
 * use a careful regex that:
 *   1. Only replaces single quotes that look like JSON delimiters
 *      (preceded by `{`, `[`, `,`, `:` or whitespace, and the closing
 *      quote followed by `}`, `]`, `,`, `:` or whitespace).
 *   2. Escapes any existing double quotes inside the captured content.
 */
function convertSingleQuotes(input: string): string {
  return input.replace(
    /([{\[,:\s])'((?:[^'\\]|\\.)*)'(?=[}\],:\s])/g,
    (_match, prefix, content) => {
      const escaped = content
        .replace(/\\'/g, "'") // unescape single quotes
        .replace(/"/g, '\\"') // escape double quotes
      return `${prefix}"${escaped}"`
    },
  )
}

/**
 * Clean a raw LLM response and return a string that should parse as JSON.
 *
 * The returned string is NOT guaranteed to parse — callers should still
 * wrap `JSON.parse` in a try/catch — but it removes the common failure
 * modes that cheap models produce. If no balanced JSON structure can be
 * found, returns the trimmed/fence-stripped input so the caller's parse
 * error message points at the original content.
 */
export function cleanLLMOutput(raw: string): string {
  if (typeof raw !== 'string') {
    throw new TypeError('cleanLLMOutput: expected string input')
  }

  // 1. Strip markdown code fences
  const fenced = stripCodeFences(raw)

  // 2. Find balanced JSON object/array
  const extracted = extractBalancedJson(fenced)
  const candidate = extracted ?? fenced

  // 3. Try parse as-is. If it works we're done.
  try {
    JSON.parse(candidate)
    return candidate
  } catch {
    // fall through to repairs
  }

  // 4. Repair: remove trailing commas + convert single quotes
  let repaired = removeTrailingCommas(candidate)
  repaired = convertSingleQuotes(repaired)
  // Re-run trailing-comma removal in case quote conversion exposed any
  repaired = removeTrailingCommas(repaired)

  return repaired
}
