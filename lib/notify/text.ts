/**
 * Agent-supplied text is data: strip control characters and cap the length
 * before it goes into a notification. With `keepNewlines`, line breaks
 * survive (for multi-line bodies); otherwise everything is flattened to one line.
 */
export function clean(text: string, max: number, opts: { keepNewlines?: boolean } = {}): string {
  const out = opts.keepNewlines
    ? // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control chars is the point
      text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').trim()
    : // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control chars is the point
      text.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim()
  return out.length > max ? `${out.slice(0, max - 1)}…` : out
}
