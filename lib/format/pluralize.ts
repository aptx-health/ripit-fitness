/**
 * Returns a formatted count-plus-word string with correct pluralization.
 *
 * Uses `count === 1` to pick the singular form. Counts of 0, 2, and negatives
 * all use the plural form (English convention: "0 sets", "2 sets").
 *
 * If the noun has an irregular plural, pass it as the third argument.
 *
 * Examples:
 *   pluralize(1, 'set')        // "1 set"
 *   pluralize(2, 'set')        // "2 sets"
 *   pluralize(0, 'exercise')   // "0 exercises"
 *   pluralize(1, 'man', 'men') // "1 man"
 *   pluralize(2, 'man', 'men') // "2 men"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural ?? `${singular}s`)
  return `${count} ${word}`
}
