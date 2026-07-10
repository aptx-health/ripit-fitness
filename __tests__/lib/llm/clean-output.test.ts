import { describe, expect, it } from 'vitest'

import { cleanLLMOutput } from '@/lib/llm/clean-output'

/**
 * Each test feeds a known cheap-model failure mode into cleanLLMOutput
 * and asserts that the result is parseable AND structurally equal to the
 * expected object.
 */
function parse(raw: string): unknown {
  const cleaned = cleanLLMOutput(raw)
  return JSON.parse(cleaned)
}

describe('cleanLLMOutput', () => {
  it('passes valid JSON unchanged', () => {
    expect(parse('{"a":1}')).toEqual({ a: 1 })
  })

  it('strips ```json code fences', () => {
    const raw = '```json\n{"a":1,"b":[1,2]}\n```'
    expect(parse(raw)).toEqual({ a: 1, b: [1, 2] })
  })

  it('strips plain ``` code fences', () => {
    const raw = '```\n{"a":1}\n```'
    expect(parse(raw)).toEqual({ a: 1 })
  })

  it('strips preamble prose before JSON', () => {
    const raw = "Here's your workout: {\"name\":\"squat\"}"
    expect(parse(raw)).toEqual({ name: 'squat' })
  })

  it('strips trailing prose after JSON', () => {
    const raw = '{"name":"squat"} — let me know if you want more!'
    expect(parse(raw)).toEqual({ name: 'squat' })
  })

  it('strips both preamble and trailing prose', () => {
    const raw = 'Sure! {"x":1} hope that helps.'
    expect(parse(raw)).toEqual({ x: 1 })
  })

  it('handles preamble + code fences combined', () => {
    const raw = "Here you go:\n```json\n{\"a\":1}\n```\nlet me know!"
    expect(parse(raw)).toEqual({ a: 1 })
  })

  it('removes trailing commas in objects', () => {
    const raw = '{"a":1, "b":2,}'
    expect(parse(raw)).toEqual({ a: 1, b: 2 })
  })

  it('removes trailing commas in arrays', () => {
    const raw = '{"xs":[1,2,3,]}'
    expect(parse(raw)).toEqual({ xs: [1, 2, 3] })
  })

  it('converts single-quoted strings to double-quoted', () => {
    const raw = "{'name': 'squat', 'reps': 5}"
    expect(parse(raw)).toEqual({ name: 'squat', reps: 5 })
  })

  it('handles nested objects with depth counting', () => {
    const raw = 'preamble {"a":{"b":{"c":1}}} trailing'
    expect(parse(raw)).toEqual({ a: { b: { c: 1 } } })
  })

  it('handles braces inside string values without breaking', () => {
    const raw = '{"template":"hello {name}"}'
    expect(parse(raw)).toEqual({ template: 'hello {name}' })
  })

  it('handles arrays as the top-level structure', () => {
    const raw = '```json\n[1,2,3]\n```'
    expect(parse(raw)).toEqual([1, 2, 3])
  })

  it('handles JSON with embedded escaped quotes', () => {
    const raw = '{"q":"she said \\"hi\\""}'
    expect(parse(raw)).toEqual({ q: 'she said "hi"' })
  })

  it('handles unwanted wrapper like {"response": {...}}', () => {
    // We don't unwrap, but we should still extract the outer object.
    const raw = '```json\n{"response":{"exercises":[1,2]}}\n```'
    expect(parse(raw)).toEqual({ response: { exercises: [1, 2] } })
  })

  it('handles single quotes + trailing commas combined', () => {
    const raw = "{'a': 1, 'b': [1,2,],}"
    expect(parse(raw)).toEqual({ a: 1, b: [1, 2] })
  })

  it('throws on non-string input', () => {
    // @ts-expect-error testing runtime guard
    expect(() => cleanLLMOutput(123)).toThrow(TypeError)
  })

  it('returns input gracefully when no JSON is present', () => {
    // Cleanup falls back to a string the caller can fail to parse.
    const out = cleanLLMOutput('no json here')
    expect(typeof out).toBe('string')
    expect(() => JSON.parse(out)).toThrow()
  })

  it('handles fenced JSON with language tag uppercase', () => {
    const raw = '```JSON\n{"a":1}\n```'
    expect(parse(raw)).toEqual({ a: 1 })
  })

  it('handles JSON with newlines/indentation', () => {
    const raw = '```json\n{\n  "a": 1,\n  "b": 2\n}\n```'
    expect(parse(raw)).toEqual({ a: 1, b: 2 })
  })
})
