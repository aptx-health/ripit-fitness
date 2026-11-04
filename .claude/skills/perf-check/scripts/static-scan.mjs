#!/usr/bin/env node
/**
 * perf-check static scan: finds code shapes that are fast on localhost and slow on a phone.
 *
 *   node .claude/skills/perf-check/scripts/static-scan.mjs [--changed [ref]] [--report-only] [--json] [paths...]
 *
 * Checks (ids are what the allowlist matches):
 *   no-loading        app/(app) page that loads data (dynamic segment, awaited data, or a
 *                     client component it renders fetches) with no loading.tsx in or above it.
 *   sequential-awaits a read awaited right after another it doesn't use: could be Promise.all.
 *   await-in-loop     an await inside a for/while loop, an async forEach, or a .map(async) that
 *                     queries per row.
 *   mount-fetch       (report only) a client component fetching in useEffect on mount, where
 *                     the server page could pass the data in.
 *
 * Exit 1 when a blocking finding (all but mount-fetch) is left after the allowlist.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

function repoRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return process.cwd()
  }
}
const ROOT = repoRoot()
const ts = createRequire(path.join(ROOT, 'package.json'))('typescript')
const ALLOWLIST = path.join(ROOT, '.claude/skills/perf-check/allowlist.json')
const REPORT_ONLY_CHECKS = new Set(['mount-fetch'])

// ---------- args ----------
const argv = process.argv.slice(2)
const opts = { changed: null, reportOnly: false, json: false, paths: [] }
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--changed') opts.changed = argv[i + 1] && !argv[i + 1].startsWith('-') ? argv[++i] : 'origin/dev'
  else if (a === '--report-only') opts.reportOnly = true
  else if (a === '--json') opts.json = true
  else if (a === '--help' || a === '-h') {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0])
    process.exit(0)
  } else opts.paths.push(a)
}

// ---------- files ----------
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '__tests__', 'test', 'fitcsv-wt2', 'fitcsv-wt3'])
function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(p)
  }
  return out
}
const rel = (p) => path.relative(ROOT, p)
const all = ['app', 'lib', 'components', 'hooks'].flatMap((d) => walk(path.join(ROOT, d)))

let changed = null
if (opts.changed) {
  const diff = execFileSync('git', ['diff', '--name-only', opts.changed], { cwd: ROOT, encoding: 'utf8' })
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
  changed = new Set(`${diff}\n${untracked}`.split('\n').filter(Boolean))
}
const inScope = (file) => {
  const r = rel(file)
  if (opts.paths.length && !opts.paths.some((p) => r.startsWith(p.replace(/^\.\//, '')))) return false
  return !changed || changed.has(r)
}

const sources = new Map()
function source(file) {
  if (!sources.has(file)) {
    const text = readFileSync(file, 'utf8')
    sources.set(file, ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS))
  }
  return sources.get(file)
}
const lineOf = (sf, node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
const snippet = (sf, node) => node.getText(sf).replace(/\s+/g, ' ').slice(0, 90)
const isClient = (sf) => sf.statements.some((s) => ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression) && s.expression.text === 'use client')
const isFunctionLike = (n) => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n)

function visit(node, fn) {
  fn(node)
  ts.forEachChild(node, (c) => visit(c, fn))
}
/** Descendants of node that aren't inside a nested function. */
function own(node, fn) {
  ts.forEachChild(node, (c) => {
    if (isFunctionLike(c)) return
    fn(c)
    own(c, fn)
  })
}

const findings = []
const add = (check, sf, node, message) => findings.push({ check, file: rel(sf.fileName), line: lineOf(sf, node), message, text: snippet(sf, node) })

// ---------- no-loading ----------
function resolveImport(from, spec) {
  let base
  if (spec.startsWith('@/')) base = path.join(ROOT, spec.slice(2))
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec)
  else return null
  for (const c of [base, `${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
    if (existsSync(c) && statSync(c).isFile()) return c
  }
  return null
}
const FETCHES = /\bfetch\(|\buseSWR\(|\buseQuery\(/
function hasLoading(dir) {
  const stop = path.join(ROOT, 'app')
  for (let d = dir; d.startsWith(stop); d = path.dirname(d)) {
    if (existsSync(path.join(d, 'loading.tsx')) || existsSync(path.join(d, 'loading.ts'))) return true
    if (d === stop) break
  }
  return false
}
/** The page component: the default export's function, if it can be found. */
function pageFunction(sf) {
  let fn = null
  let exported = null
  for (const s of sf.statements) {
    if (ts.isFunctionDeclaration(s) && s.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) fn = s
    if (ts.isExportAssignment(s) && ts.isIdentifier(s.expression)) exported = s.expression.text
  }
  if (!fn && exported) fn = sf.statements.find((s) => ts.isFunctionDeclaration(s) && s.name?.text === exported) ?? null
  return fn
}
/** What a server page awaits in its own body besides params/searchParams, if anything. */
function awaitedData(fn) {
  let found = null
  if (fn?.body)
    own(fn.body, (n) => {
      if (found || !ts.isAwaitExpression(n)) return
      if (!/^(params|searchParams|props\.params|props\.searchParams)$/.test(n.expression.getText())) found = n
    })
  return found
}
for (const file of all) {
  if (!/app\/\(app\)\/.*page\.tsx$/.test(rel(file))) continue
  const sf = source(file)
  const imports = sf.statements
    .filter((s) => ts.isImportDeclaration(s) && !s.importClause?.isTypeOnly)
    .map((s) => resolveImport(file, s.moduleSpecifier.text))
    .filter(Boolean)
  if (!(inScope(file) || imports.some(inScope))) continue
  if (hasLoading(path.dirname(file))) continue
  const reasons = []
  if (/\[[^/]+\]/.test(rel(file))) reasons.push('dynamic segment')
  const fn = pageFunction(sf)
  if (isClient(sf)) {
    if (FETCHES.test(sf.text)) reasons.push('the page fetches on the client')
  } else {
    const awaited = awaitedData(fn)
    if (awaited) reasons.push(`awaits ${snippet(sf, awaited.expression).slice(0, 40)}`)
  }
  const fetchers = imports.filter((f) => f.endsWith('.tsx') && isClient(source(f)) && FETCHES.test(source(f).text))
  if (fetchers.length) reasons.push(`renders ${fetchers.map((f) => path.basename(f)).join(', ')}, which fetches on the client`)
  if (reasons.length) {
    add('no-loading', sf, fn ?? sf.statements[0] ?? sf, `no loading.tsx in or above ${rel(path.dirname(file))}: a tap shows nothing until it loads (${reasons.join('; ')})`)
  }
}

// ---------- sequential-awaits / await-in-loop ----------
const GATE = /rate|limit|consume|auth|session|currentuser|requireuser|requireadmin|verify|^params$|searchparams|headers\(|cookies\(|\.json\(\)|formdata|\.text\(\)/i
const WRITE = /\.(create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany)\(|\$executeRaw|\$transaction|send|enqueue|publish|track|log/i
const SLEEP = /sleep|delay|setTimeout|wait\(/i
const unwrap = (e) => (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) ? unwrap(e.expression) : e)

/** An await statement: { names it binds, the awaited expression }, or null. */
function awaitStatement(s) {
  if (ts.isVariableStatement(s) && s.declarationList.declarations.length === 1) {
    const d = s.declarationList.declarations[0]
    const init = d.initializer && unwrap(d.initializer)
    if (init && ts.isAwaitExpression(init)) {
      const names = []
      visit(d.name, (n) => ts.isIdentifier(n) && names.push(n.text))
      return { names, expr: init.expression, bare: false }
    }
  }
  if (ts.isExpressionStatement(s)) {
    const e = unwrap(s.expression)
    if (ts.isAwaitExpression(e)) return { names: [], expr: e.expression, bare: true }
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isAwaitExpression(unwrap(e.right))) {
      return { names: [e.left.getText()], expr: unwrap(e.right).expression, bare: false }
    }
  }
  return null
}
function identifiers(node) {
  const ids = new Set()
  visit(node, (n) => ts.isIdentifier(n) && ids.add(n.text))
  return ids
}

function scanAwaits(sf) {
  visit(sf, (node) => {
    // Statement lists: a run of awaits where a later one uses nothing an earlier one bound.
    if (ts.isBlock(node) || ts.isSourceFile(node)) {
      let run = []
      for (const s of node.statements) {
        const a = awaitStatement(s)
        if (!a) {
          run = []
          continue
        }
        const text = a.expr.getText(sf)
        const gateOrWrite = a.bare || GATE.test(text) || WRITE.test(text) || /^tx\./.test(text)
        if (!gateOrWrite && run.length) {
          const ids = identifiers(a.expr)
          if (!run.some((r) => r.names.some((n) => ids.has(n)))) {
            add('sequential-awaits', sf, s, `doesn't use the result of line ${lineOf(sf, run.at(-1).stmt)}: the two could run in one Promise.all`)
          }
        }
        run = gateOrWrite ? [] : [...run, { ...a, stmt: s }]
      }
    }
    // Loops.
    const isLoop =
      ts.isForStatement(node) || ts.isForInStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node) || (ts.isForOfStatement(node) && !node.awaitModifier)
    if (isLoop) {
      const awaits = []
      own(node.statement, (n) => ts.isAwaitExpression(n) && !SLEEP.test(n.expression.getText(sf)) && awaits.push(n))
      if (awaits.length) add('await-in-loop', sf, awaits[0], `${awaits.length} await(s) inside a loop at line ${lineOf(sf, node)}: one round trip per item`)
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text
      const cb = node.arguments[0]
      const isAsync = cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) && cb.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)
      if (isAsync && method === 'forEach') add('await-in-loop', sf, node, 'async forEach: the awaits are not waited for, and run one per item')
      if (isAsync && (method === 'map' || method === 'flatMap')) {
        const queries = []
        own(cb.body, (n) => ts.isAwaitExpression(n) && /\b(prisma|tx|db)\.|\bfetch\(/.test(n.expression.getText(sf)) && queries.push(n))
        if (queries.length) add('await-in-loop', sf, queries[0], `.${method}(async) queries once per item (${queries.length} per row): batch with one findMany/in`)
      }
    }
  })
}
const SERVER_CODE = (r) =>
  (/^app\//.test(r) && /(route\.ts|page\.tsx|layout\.tsx)$/.test(r)) || (/^lib\//.test(r) && !/^lib\/test\//.test(r))
for (const file of all) {
  if (SERVER_CODE(rel(file)) && inScope(file) && !isClient(source(file))) scanAwaits(source(file))
}

// ---------- mount-fetch ----------
function fetchingFunctions(sf) {
  // Local functions (declarations, consts, useCallback-wrapped) whose bodies call fetch.
  const names = new Set()
  visit(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name && FETCHES.test(n.getText(sf))) names.add(n.name.text)
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && FETCHES.test(n.initializer.getText(sf))) {
      const init = unwrap(n.initializer)
      if (isFunctionLike(init) || (ts.isCallExpression(init) && /useCallback$/.test(init.expression.getText(sf)))) names.add(n.name.text)
    }
  })
  return names
}
for (const file of all) {
  const r = rel(file)
  if (!/^(app|components|hooks)\//.test(r) || !inScope(file)) continue
  const sf = source(file)
  if (!isClient(sf)) continue
  const fetchers = fetchingFunctions(sf)
  visit(sf, (n) => {
    if (!ts.isCallExpression(n) || !/(^|\.)useEffect$/.test(n.expression.getText(sf))) return
    const [effect, deps] = n.arguments
    if (!effect || !deps || !ts.isArrayLiteralExpression(deps)) return
    const body = effect.getText(sf)
    const calls = [...identifiers(effect)].filter((id) => fetchers.has(id))
    if (!FETCHES.test(body) && calls.length === 0) return
    // On mount: no deps, or only the fetching callbacks themselves.
    const onMount = deps.elements.every((e) => ts.isIdentifier(e) && fetchers.has(e.text))
    if (onMount) add('mount-fetch', sf, n, `fetches in useEffect on mount (deps ${deps.getText(sf)}): could the server page pass this in?`)
  })
}

// ---------- allowlist, output ----------
const allow = existsSync(ALLOWLIST) ? JSON.parse(readFileSync(ALLOWLIST, 'utf8')) : []
const allowed = (f) => allow.some((a) => a.check === f.check && a.file === f.file && (!a.match || f.text.includes(a.match) || f.message.includes(a.match)))
const kept = findings.filter((f) => !allowed(f)).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
const blocking = kept.filter((f) => !REPORT_ONLY_CHECKS.has(f.check))

if (opts.json) console.log(JSON.stringify({ findings: kept, allowlisted: findings.length - kept.length }, null, 2))
else {
  for (const f of kept) console.log(`${f.file}:${f.line}  [${f.check}${REPORT_ONLY_CHECKS.has(f.check) ? ', report only' : ''}]  ${f.message}\n    ${f.text}`)
  const counts = {}
  for (const f of kept) counts[f.check] = (counts[f.check] ?? 0) + 1
  console.log(
    `\nperf-check static: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ') || 'no findings'}` +
      `${findings.length > kept.length ? ` (${findings.length - kept.length} allowlisted)` : ''}${changed ? ` in files changed since ${opts.changed}` : ''}`,
  )
}
process.exit(blocking.length && !opts.reportOnly ? 1 : 0)
