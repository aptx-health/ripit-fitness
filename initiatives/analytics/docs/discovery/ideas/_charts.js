// Tiny SVG chart helpers for the mockups. Colours come from CSS classes, so
// the same markup works in light and dark. Mirrors what a hand-rolled
// <Sparkline>/<LineChart>/<BarChart> component would draw in the app.
if (new URLSearchParams(location.search).get('mode') === 'dark') document.documentElement.dataset.mode = 'dark'

const NS = 'http://www.w3.org/2000/svg'
function svg(w, h) {
  const s = document.createElementNS(NS, 'svg')
  s.setAttribute('viewBox', `0 0 ${w} ${h}`)
  s.setAttribute('class', 'chart')
  return s
}
function add(parent, tag, attrs, text) {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  if (text !== undefined) e.textContent = text
  parent.appendChild(e)
  return e
}
function scale(values, lo, hi, padLo, padHi) {
  const min = lo ?? Math.min(...values), max = hi ?? Math.max(...values)
  return (v) => padHi - ((v - min) / (max - min || 1)) * (padHi - padLo)
}

/** Sparkline: data = numbers; prIndex marks a PR dot. */
function spark(el, data, { w = 96, h = 30, pr } = {}) {
  const s = svg(w, h)
  const y = scale(data, null, null, 3, h - 3)
  const x = (i) => 2 + (i * (w - 4)) / (data.length - 1)
  add(s, 'path', { class: 'c-line', d: data.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('') })
  if (pr !== undefined) add(s, 'circle', { class: 'c-pr', cx: x(pr), cy: y(data[pr]), r: 3.5 })
  el.appendChild(s)
}

/** Line chart with y gridlines, x labels and PR markers. */
function line(el, data, { w = 354, h = 170, labels = [], prs = [], ticks = 4, overlay } = {}) {
  const s = svg(w, h)
  const L = 34, B = h - 18, T = 8
  const all = overlay ? data.concat(overlay) : data
  const min = Math.floor(Math.min(...all) / 10) * 10, max = Math.ceil(Math.max(...all) / 10) * 10
  const y = scale(all, min, max, T, B)
  const x = (i) => L + 4 + (i * (w - L - 8)) / (data.length - 1)
  for (let t = 0; t <= ticks; t++) {
    const v = Math.round(min + ((max - min) * t) / ticks)
    add(s, 'line', { class: 'c-grid', x1: L, x2: w, y1: y(v), y2: y(v) })
    add(s, 'text', { class: 'c-axis', x: L - 6, y: y(v) + 4, 'text-anchor': 'end' }, v)
  }
  labels.forEach(([i, t]) => add(s, 'text', { class: 'c-axis', x: x(i), y: h - 2, 'text-anchor': 'middle' }, t))
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('')
  add(s, 'path', { class: 'c-area', d: `${d}L${x(data.length - 1)},${B}L${x(0)},${B}Z` })
  if (overlay) add(s, 'path', { class: 'c-line2', d: overlay.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('') })
  add(s, 'path', { class: 'c-line', d })
  data.forEach((v, i) => add(s, 'circle', { class: prs.includes(i) ? 'c-pr' : 'c-dot', cx: x(i), cy: y(v), r: prs.includes(i) ? 5 : 3 }))
  el.appendChild(s)
}

/** Weekly bars; cur = index of the current week; dl = indexes drawn as light weeks; effort = optional dots row. */
function bars(el, data, { w = 354, h = 130, labels = [], cur, dl = [], effort } = {}) {
  const s = svg(w, effort ? h + 26 : h)
  const L = 26, B = h - 18, T = 6
  const max = Math.ceil(Math.max(...data) / 20) * 20
  const y = scale(data, 0, max, T, B)
  const bw = (w - L) / data.length
  ;[0, max / 2, max].forEach((v) => {
    add(s, 'line', { class: 'c-grid', x1: L, x2: w, y1: y(v), y2: y(v) })
    add(s, 'text', { class: 'c-axis', x: L - 5, y: y(v) + 4, 'text-anchor': 'end' }, v)
  })
  data.forEach((v, i) => {
    const cls = i === cur ? 'c-bar cur' : dl.includes(i) ? 'c-bar dl' : 'c-bar'
    add(s, 'rect', { class: cls, x: L + i * bw + 3, y: y(v), width: bw - 6, height: B - y(v) })
  })
  labels.forEach(([i, t]) => add(s, 'text', { class: 'c-axis', x: L + i * bw + bw / 2, y: h - 2, 'text-anchor': 'middle' }, t))
  if (effort) {
    add(s, 'text', { class: 'c-axis', x: L - 5, y: h + 16, 'text-anchor': 'end' }, 'RPE')
    effort.forEach((v, i) => {
      if (v == null) return
      add(s, 'text', { class: 'c-axis', x: L + i * bw + bw / 2, y: h + 16, 'text-anchor': 'middle', style: v >= 9 ? 'fill:var(--error-text)' : '' }, v.toFixed(1))
    })
  }
  el.appendChild(s)
}
