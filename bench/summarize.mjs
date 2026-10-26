#!/usr/bin/env node
/**
 * Writes <run>/summary.md from <run>/web.json and/or <run>/flutter.json.
 *   node bench/summarize.mjs bench/out/<date>-<label>
 * Also exports flatten() so compare.mjs reads both reports the same way.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null)

/** One row per (platform, page, scenario) with the headline numbers. */
export function flatten(dir) {
  const rows = []
  const web = read(join(dir, 'web.json'))
  for (const [browser, entry] of Object.entries(web?.browsers ?? {}))
    for (const [page, scenarios] of Object.entries(entry.pages ?? {}))
      for (const [scenario, m] of Object.entries(scenarios)) {
        if (!m || typeof m !== 'object') continue
        const key = `${browser} ${page} ${scenario}`
        if (scenario === 'idle')
          rows.push({ key, platform: browser, page, scenario, idle: true, rafCallbacks: m.rafCallbacks, infinite: m.infiniteAnimations?.length ?? 0, drawFrames: m.trace?.drawFrames ?? null, mainBusyMs: m.trace?.mainBusyMs ?? null, task: m.cdp?.task ?? null, script: m.cdp?.script ?? null, sites: m.rafSites, anims: m.infiniteAnimations })
        else rows.push({ key, platform: browser, page, scenario, frames: m.frames, p50: m.p50, p95: m.p95, max: m.max, over16: m.over16, over33: m.over33, task: m.cdp?.task ?? null, script: m.cdp?.script ?? null, layout: m.cdp?.layout ?? null, style: m.cdp?.style ?? null, longTasks: m.longTasks })
      }
  const flutter = read(join(dir, 'flutter.json'))
  for (const [page, scenarios] of Object.entries(flutter?.pages ?? {}))
    for (const [scenario, m] of Object.entries(scenarios)) {
      const key = `flutter ${page} ${scenario}`
      if (scenario === 'idleByExample' || !m) continue
      if (scenario === 'idle')
        rows.push({ key, platform: 'flutter', page, scenario, idle: true, drawFrames: m.frames, mainBusyMs: m.buildTotalMs, rasterMs: m.rasterTotalMs, byExample: scenarios.idleByExample })
      else rows.push({ key, platform: 'flutter', page, scenario, frames: m.frames, p50: m.build?.p50, p95: m.build?.p95, max: m.build?.max, rp50: m.raster?.p50, rp95: m.raster?.p95, rmax: m.raster?.max, over16: m.missed, over33: m.missed33 })
    }
  return { rows, web, flutter }
}

const f = (x, d = 1) => (x === null || x === undefined ? '–' : typeof x === 'number' ? x.toFixed(d).replace(/\.0+$/, '') : String(x))

export function summarize(dir) {
  const { rows, web, flutter } = flatten(dir)
  const out = []
  out.push(`# Performance bench: ${web?.label ?? flutter?.label ?? dir}`, '')
  if (web) {
    out.push(`Web: ${web.date}, ${web.viewport.width}×${web.viewport.height} @${web.viewport.deviceScaleFactor}x, median of ${web.reps} reps. Machine ${web.machine.cpus} CPUs, load avg ${web.machine.loadavg.join(' / ')}.`, '')
    for (const [b, e] of Object.entries(web.browsers)) {
      out.push(`- **${b}** ${e.version ?? ''}: backdrop-filter painted: ${e.backdropFilter?.painted ?? '?'}${e.warning ? `. ⚠ ${e.warning}` : ''}${e.error ? ` (error: ${e.error})` : ''}`)
    }
    out.push('')
  }
  if (flutter) out.push(`Flutter: ${flutter.date}, ${flutter.device ?? ''} ${flutter.mode ?? ''}. ${flutter.note ?? ''}`, '')

  const idle = rows.filter((r) => r.idle)
  if (idle.length) {
    out.push('## Steady state (3 s idle, nothing moving; ideally all zero)', '')
    out.push('| platform | page | frames drawn | page rAF callbacks | infinite animations | main-thread ms (trace / Flutter build) | task ms (CDP) | script ms | raster ms (Flutter) |', '|---|---|--:|--:|--:|--:|--:|--:|--:|')
    for (const r of idle) out.push(`| ${r.platform} | ${r.page} | ${f(r.drawFrames, 0)} | ${f(r.rafCallbacks, 0)} | ${f(r.infinite, 0)} | ${f(r.mainBusyMs)} | ${f(r.task)} | ${f(r.script)} | ${f(r.rasterMs)} |`)
    out.push('', 'Web frames drawn = Chrome trace DrawFrame events (Firefox: not available). Page rAF callbacks = the page\'s own requestAnimationFrame callbacks (the bench\'s recorder is off while idle).')
    out.push('')
    const loud = idle.filter((r) => (r.rafCallbacks ?? 0) > 0 || (r.infinite ?? 0) > 0 || (r.platform === 'flutter' && (r.drawFrames ?? 0) > 0))
    if (loud.length) {
      out.push('Idle pages that keep working:', '')
      for (const r of loud) {
        if (r.platform === 'flutter') {
          out.push(`- **flutter ${r.page}**: ${f(r.drawFrames, 0)} frames in 3.4 s, build ${f(r.mainBusyMs)} ms, raster ${f(r.rasterMs)} ms`)
          for (const [id, m] of Object.entries(r.byExample ?? {})) if (m?.frames) out.push(`  - alone, \`${id}\` renders ${f(m.frames, 0)} frames (raster ${f(m.rasterTotalMs)} ms)`)
          continue
        }
        out.push(`- **${r.platform} ${r.page}**: ${f(r.drawFrames, 0)} frames, ${f(r.rafCallbacks, 0)} rAF callbacks, ${r.infinite} infinite animations`)
        for (const [site, n] of r.sites ?? []) out.push(`  - rAF ${n}× from \`${site}\``)
        const anims = {}
        for (const a of r.anims ?? []) anims[`${a.name} on ${a.target}`] = (anims[`${a.name} on ${a.target}`] ?? 0) + 1
        for (const [a, n] of Object.entries(anims)) out.push(`  - animation \`${a}\`${n > 1 ? ` ×${n}` : ''}`)
      }
      out.push('')
    }
  }
  const active = rows.filter((r) => !r.idle)
  if (active.length) {
    out.push('## Interactions', '')
    out.push('Web: rAF frame deltas (ms). Flutter: build times (ms), raster in its own columns. `>16` = frames over budget (web: > 19.2 ms delta; Flutter: build or raster > 16.7 ms).', '')
    out.push('| platform | page | scenario | frames | p50 | p95 | max | >16 | >33 | task ms | script ms | layout+style ms | long tasks | raster p50/p95/max |', '|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|')
    for (const r of active)
      out.push(`| ${r.platform} | ${r.page} | ${r.scenario} | ${f(r.frames, 0)} | ${f(r.p50)} | ${f(r.p95)} | ${f(r.max)} | ${f(r.over16, 0)} | ${f(r.over33, 0)} | ${f(r.task)} | ${f(r.script)} | ${r.layout === undefined || r.layout === null ? '–' : f(r.layout + r.style)} | ${f(r.longTasks, 0)} | ${r.platform === 'flutter' ? `${f(r.rp50)}/${f(r.rp95)}/${f(r.rmax)}` : ''} |`)
    out.push('')
    const worstOf = (r) => Math.max(r.p95 ?? 0, r.rp95 ?? 0)
    const worst = [...active].sort((a, b) => worstOf(b) - worstOf(a) || (b.over16 ?? 0) - (a.over16 ?? 0)).slice(0, 10)
    out.push('Worst by p95 (Flutter: the worse of build and raster):', '')
    for (const r of worst) out.push(`- ${r.key}: p95 ${f(r.p95)}${r.rp95 != null ? ` build / ${f(r.rp95)} raster` : ''} ms, max ${f(Math.max(r.max ?? 0, r.rmax ?? 0))} ms, ${f(r.over16, 0)} over budget`)
    out.push('')
  }
  const text = out.join('\n')
  writeFileSync(join(dir, 'summary.md'), text)
  return text
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2]
  if (!dir) throw new Error('usage: node bench/summarize.mjs <run dir>')
  summarize(dir)
  console.log(`wrote ${join(dir, 'summary.md')}`)
}
