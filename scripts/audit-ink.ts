/**
 * Ink audit. Draws every placed machine in every mode through the recorder and
 * reports where the ink actually lands: past its own footprint, past the art
 * frame, or on top of the machine next door.
 *
 *   npx esbuild scripts/audit-ink.ts --bundle --platform=node --format=cjs \
 *     --external:p5 --outfile=node_modules/.cache/audit.cjs && node node_modules/.cache/audit.cjs
 */
import type p5 from 'p5'
import { build, defaultOptions, MODES, strokeWeight, type Options } from '../src/core/composition'
import { ART_INSET } from '../src/core/constants'
import { FIRE_DECAY } from '../src/core/wiring'
import { mod } from '../src/core/ease'
import { Recorder, isEmpty, type Box } from './ink'

const SAMPLES = 40
const CANVAS = 900
const only = process.argv[2]

interface Stat {
  name: string
  mode: string
  over: number
  side: string
  spanX: number
  spanY: number
  cells: number
  worst: string
}

const stats = new Map<string, Stat>()
const frameEscapes: string[] = []
const pageEscapes: string[] = []
const collisions: string[] = []
const emptyCells: string[] = []

/** Local box -> world box, given a quarter turn and a mirror. */
function toWorld(box: Box, angle: number, mirror: number, cx: number, cy: number): Box {
  const cos = Math.round(Math.cos(angle))
  const sin = Math.round(Math.sin(angle))
  const xs: number[] = []
  const ys: number[] = []
  for (const [lx, ly] of [
    [box.x0, box.y0], [box.x1, box.y0], [box.x1, box.y1], [box.x0, box.y1],
  ]) {
    const mx = lx * mirror
    xs.push(cx + mx * cos - ly * sin)
    ys.push(cy + mx * sin + ly * cos)
  }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

const overlap = (a: Box, b: Box, slack: number) =>
  Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > slack &&
  Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > slack

function measure(mode: string, options: Options): void {
  const comp = build(options, CANVAS)
  const rec = new Recorder()
  const label = `${options.mode}/${options.layout}@${options.res}/${options.seed}`
  const area = Math.floor((CANVAS * ART_INSET) / options.res) * options.res
  const origin = Math.round((CANVAS - area) / 2)
  const worlds: { box: Box; name: string; unit: number }[] = []

  for (const inst of comp.instances) {
    const { cell, contraption } = inst
    const key = `${mode}:${contraption.name}`
    const stat: Stat =
      stats.get(key) ?? { name: contraption.name, mode, over: 0, side: '', spanX: 0, spanY: 0, cells: 0, worst: '' }
    stat.cells++
    let spanX = 0
    let spanY = 0
    let world: Box | null = null
    for (let i = 0; i < SAMPLES; i++) {
      const t = inst.phase + (i / SAMPLES) * inst.period
      const u = mod(t, inst.period) / inst.period
      rec.reset()
      try {
        contraption.draw(rec as unknown as p5, inst.state, {
          size: cell.size,
          unit: comp.unit,
          w: cell.w,
          h: cell.h,
          theme: comp.theme,
          t,
          u,
          weight: strokeWeight(cell.size, comp.unit, comp.theme, options.stroke),
          ink: comp.theme.ink,
          fired: Math.max(0, 1 - mod(i - inst.fireFrame, comp.loop) / FIRE_DECAY),
        })
      } catch (e) {
        stat.worst = `threw ${(e as Error).message}`
        continue
      }
      const box = rec.ink
      if (isEmpty(box)) continue
      const hw = cell.w / 2
      const hh = cell.h / 2
      for (const [side, amount] of [
        ['W', -box.x0 - hw], ['E', box.x1 - hw], ['N', -box.y0 - hh], ['S', box.y1 - hh],
      ] as [string, number][]) {
        const rel = amount / cell.size
        if (rel > stat.over) {
          stat.over = rel
          stat.side = side
          stat.worst = `${label} u=${u.toFixed(2)}`
        }
      }
      spanX = Math.max(spanX, (box.x1 - box.x0) / cell.w)
      spanY = Math.max(spanY, (box.y1 - box.y0) / cell.h)
      const w = toWorld(box, inst.angle, inst.mirror, cell.x, cell.y)
      world = world ? { x0: Math.min(world.x0, w.x0), y0: Math.min(world.y0, w.y0), x1: Math.max(world.x1, w.x1), y1: Math.max(world.y1, w.y1) } : w
    }
    stat.spanX = Math.max(stat.spanX, spanX)
    stat.spanY = Math.max(stat.spanY, spanY)
    stats.set(key, stat)
    if (!world) {
      emptyCells.push(`${label} ${contraption.name} draws nothing`)
      continue
    }
    worlds.push({ box: world, name: contraption.name, unit: cell.size })
    const out = Math.max(origin - world.x0, origin - world.y0, world.x1 - (origin + area), world.y1 - (origin + area))
    if (out > cell.size * 0.02) {
      const dir = origin - world.x0 === out ? 'W' : origin - world.y0 === out ? 'N' : world.x1 - (origin + area) === out ? 'E' : 'S'
      frameEscapes.push(`${label} ${contraption.name} ${dir} at c${cell.col}r${cell.row} by ${(out / cell.size).toFixed(2)} cells`)
    }
    const off = Math.max(-world.x0, -world.y0, world.x1 - CANVAS, world.y1 - CANVAS)
    if (off > 0.5) {
      pageEscapes.push(`${label} ${contraption.name} runs off the page by ${off.toFixed(1)}px`)
    }
  }

  for (let i = 0; i < worlds.length; i++) {
    for (let j = i + 1; j < worlds.length; j++) {
      const slack = Math.min(worlds[i].unit, worlds[j].unit) * 0.12
      if (overlap(worlds[i].box, worlds[j].box, slack)) {
        collisions.push(`${label} ${worlds[i].name} x ${worlds[j].name}`)
      }
    }
  }
}

for (const { name: mode } of MODES) {
  if (only && only !== mode) continue
  for (const layout of ['grid', 'bricks', 'quads', 'bands']) {
    for (const res of [8, 12, 15]) {
      for (const seed of ['first-look', 'default', 'amber-shuttle-417']) {
        measure(mode, { ...defaultOptions, mode, layout, res, seed, spans: 0.6, chains: 0.7 })
      }
    }
  }
  measure(mode, { ...defaultOptions, mode, seed: 'sheet', catalog: true })
}

const all = [...stats.values()]
console.log('\n== overflow past the footprint (fraction of a cell) ==')
for (const s of all.sort((a, b) => b.over - a.over).filter((s) => s.over > 0.06)) {
  console.log(
    `${s.over.toFixed(3).padStart(7)} ${s.side}  ${(s.mode + '/' + s.name).padEnd(28)} x${String(s.cells).padStart(4)}  ${s.worst}`,
  )
}
console.log('\n== smallest footprint coverage (best span over the loop) ==')
for (const s of all.sort((a, b) => Math.max(a.spanX, a.spanY) - Math.max(b.spanX, b.spanY)).slice(0, 24)) {
  console.log(`x=${s.spanX.toFixed(2)} y=${s.spanY.toFixed(2)}  ${(s.mode + '/' + s.name).padEnd(28)} x${String(s.cells).padStart(4)}`)
}

const tally = (label: string, list: string[]) => {
  const counts = new Map<string, number>()
  for (const line of list) {
    const k = line.replace(/ by [\d.]+ cells/, '')
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  console.log(`\n== ${label} (${list.length}) ==`)
  for (const [k, n] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`  x${String(n).padStart(4)}  ${k}`)
}
tally('ink leaving the art frame', frameEscapes)
tally('ink running off the page', pageEscapes)
tally('machines whose ink boxes collide', collisions)
tally('cells that draw nothing', emptyCells)
console.log(`\n${all.length} machine/mode pairs measured\n`)
