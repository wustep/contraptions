import type p5 from 'p5'
import { build, defaultOptions } from '../src/core/composition'
import { FPS, LOOP_EXPORT_MAX_SECONDS } from '../src/core/constants'
import { parseOptions, serializeOptions } from '../src/core/seed'
import { themes } from '../src/core/themes'
import type { Circuit, Point } from '../src/worlds/goldberg/connected'

type Check = (name: string, ok: boolean, detail?: string) => void
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const shape = (c: Circuit) => JSON.stringify(c.parts.map((p) => ({
  kind: p.kind, start: p.start, duration: p.duration,
  samples: [0, 0.25, 0.5, 0.75, 1].map(p.at), name: p.station?.name,
})))

/** Test the model used by the actual renderer, including fractional and negative clocks. */
export function checkConnected(check: Check, stubP5: () => p5): void {
  console.log('\nconnected circuits')
  for (const mode of ['cascade', 'workshop', 'circus', 'rube'] as const) {
    for (const seed of ['first-look', 'paper-gantry-552', 'obtuse-plunger-408']) {
      for (const res of [4, 5, 6, 7, 8, 20]) {
        const label = `${mode} ${seed} / ${res} stops`
        const options = { ...defaultOptions, mode, seed, res }
        const comp = build(options, 900)
        const run = comp.circuit!
        check(`${label}: uses the connected composer`, !!run)
        if (!run) continue
        check(`${label}: honors the bounded stop count`, run.stops.length === Math.min(8, res))
        check(`${label}: every instance belongs to the path`, comp.instances.length === run.stops.length && run.parts.filter((p) => p.station).length === run.stops.length)
        check(`${label}: one rail layer and one traveler layer`, comp.underlays?.length === 1 && comp.overlays.length === 1)
        check(`${label}: full circuit fits the export`, comp.loop === FPS * LOOP_EXPORT_MAX_SECONDS)
        check(`${label}: deterministic seed`, shape(run) === shape(build(options, 900).circuit!))
        let joined = true
        let timed = true
        for (let i = 0; i < run.parts.length; i++) {
          const part = run.parts[i]
          const next = run.parts[(i + 1) % run.parts.length]
          joined &&= distance(part.at(0), part.from) < 1e-8 && distance(part.at(1), part.to) < 1e-8 && distance(part.to, next.from) < 1e-8
          timed &&= part.duration > 0 && Math.abs(part.start + part.duration - (i === run.parts.length - 1 ? run.loop : next.start)) < 1e-8
        }
        check(`${label}: all endpoints join, including the return`, joined)
        check(`${label}: timeline has no gaps or overlaps`, timed)
        let inFrame = true
        let noJumps = true
        let identity = true
        let periodic = true
        const original = run.at(0)
        let previous = run.at(-0.25)
        const visited = new Set<number>()
        for (let frame = 0; frame <= run.loop * 2; frame += 0.25) {
          const t = run.at(frame)
          const repeat = run.at(frame - run.loop * 11)
          identity &&= t.id === original.id && t.color === original.color
          inFrame &&= t.x - run.radius > 0 && t.y - run.radius > 0 && t.x + run.radius < 900 && t.y + run.radius < 900
          noJumps &&= distance(t, previous) < 6
          periodic &&= distance(t, repeat) < 1e-7 && t.id === repeat.id && t.color === repeat.color
          if (t.part.station) visited.add(t.part.station.index)
          previous = t
        }
        check(`${label}: same identity through two full circuits`, identity)
        check(`${label}: entire traveler stays on paper`, inFrame)
        check(`${label}: no jumps at tools, handoffs or wrap`, noJumps)
        check(`${label}: arbitrary scrub clocks repeat exactly`, periodic)
        check(`${label}: every stop sees the traveler`, visited.size === run.stops.length)
        const lift = run.parts.filter((p) => p.kind === 'lift')
        check(`${label}: one exposed upward return lift`, lift.length === 1 && lift[0].to.y < lift[0].from.y)
        check(`${label}: lift and passenger use one trajectory`, [0, 0.25, 0.5, 0.75].every((u) => distance(run.at(lift[0].start + u * lift[0].duration), lift[0].at(u)) < 1e-7))
        check(`${label}: tools fire where the traveler is`, comp.instances.every((i, k) => distance(run.at(i.fireFrame), run.stops[k].center) < (run.stops[k].name === 'trampoline' ? 60 : 1e-7)))
        check(`${label}: dwell under contacting tools`, run.stops.filter((s) => !['hoop', 'trampoline', 'seesaw', 'dominoes'].includes(s.name)).every((s) => distance(s.part.at(0.42), s.part.at(0.58)) < 1e-7))
        const scaled = build(options, 360).circuit!
        check(`${label}: resize preserves route and identity`, [0, 40, 180, 360, 600, 719.9].every((f) => {
          const a = run.at(f)
          const b = scaled.at(f)
          return a.id === b.id && a.color === b.color && distance({ x: a.x * 0.4, y: a.y * 0.4 }, b) < 1e-7
        }))
      }
    }
    for (const theme of themes) {
      const comp = build({ ...defaultOptions, mode, seed: 'palette', theme: theme.name, res: 6 }, 900)
      const run = comp.circuit!
      check(`${mode}/${theme.name}: permanent palette choice`, Array.from({ length: 145 }, (_, k) => run.at(k * 5).color).every((color) => color === run.color && theme.colors.includes(color)))
      let oneBody = true
      let correctPaint = true
      let carMatches = true
      for (let f = 0; f < run.loop; f += 3) {
        const body: { color: unknown; x: number; y: number }[] = []
        let fill: unknown
        let position = { x: 0, y: 0 }
        const base = stubP5()
        const p = new Proxy(base, { get(target, key) {
          if (key === 'fill') return (color: unknown) => { fill = color }
          if (key === 'translate') return (x: number, y: number) => { position = { x, y } }
          if (key === 'circle') return (_x: number, _y: number, d: number) => {
            if (Math.abs(d - run.radius * 2) < 1e-7) body.push({ color: fill, ...position })
          }
          if (key === 'rect') return (x: number, y: number, w: number, h: number) => {
            if (Math.abs(w - run.radius * 2) < 1e-7 && Math.abs(h - w) < 1e-7) body.push({ color: fill, ...position })
            if (run.at(f).part.kind === 'lift' && Math.abs(w - run.radius * 3.5) < 1e-7 && Math.abs(h - run.radius * 4) < 1e-7) {
              carMatches &&= distance({ x, y }, run.at(f)) < 1e-7
            }
          }
          return Reflect.get(target, key)
        } })
        const ctx = { theme: comp.theme, weight: () => 2 }
        for (const layer of comp.overlays) layer(p, f, ctx)
        oneBody &&= body.length === 1
        correctPaint &&= body.every((b) => b.color === run.color && distance(b, run.at(f)) < 1e-7)
        for (const layer of comp.underlays ?? []) layer(p, f, ctx)
      }
      check(`${mode}/${theme.name}: exactly one rendered traveler`, oneBody)
      check(`${mode}/${theme.name}: rendered paint and position retain identity`, correctPaint)
      check(`${mode}/${theme.name}: drawn cradle carries the traveler`, carMatches)
      // Record the complete artwork, not just the route. This catches a car,
      // mechanical reset, paint or ornament that uses the wrong clock.
      const render = (frame: number): string => {
        const calls: unknown[] = []
        const base = stubP5()
        const p = new Proxy(base, {
          get(target, key) {
            const value = Reflect.get(target, key)
            if (typeof value !== 'function') return value
            return (...args: unknown[]) => {
              calls.push([key, ...args.map((a) => typeof a === 'number' ? Math.round(a * 1e7) / 1e7 : a)])
              return value.apply(target, args)
            }
          },
        })
        const ctx = { theme: comp.theme, weight: () => 2 }
        for (const layer of comp.underlays ?? []) layer(p, frame, ctx)
        for (const i of comp.instances) {
          p.push(); p.translate(i.cell.x, i.cell.y)
          i.contraption.draw(p, i.state, { size: i.cell.size, w: i.cell.w, h: i.cell.h, theme: comp.theme, ink: comp.theme.ink, weight: 2, fired: 0, t: frame, u: ((frame % comp.loop) + comp.loop) % comp.loop / comp.loop })
          p.pop()
        }
        for (const layer of comp.overlays) layer(p, frame, ctx)
        return JSON.stringify(calls)
      }
      const before = shape(run)
      check(`${mode}/${theme.name}: complete drawing loops`, [0, 89.25, 280.5, 650.75].every((f) => render(f) === render(f + run.loop)))
      check(`${mode}/${theme.name}: drawing leaves model untouched`, shape(run) === before)
      check(`${mode}/${theme.name}: redraw after seeking is identical`, render(88.5) === (render(500), render(88.5)))
    }
    const migrated = parseOptions(`?mode=${mode}&seed=old-link&res=20&solo=rail&tag=transport&chains=0&spans=3`)
    check(`${mode}: old share link opens a complete bounded circuit`, migrated.res === 8 && migrated.solo === null && migrated.tag === null && !!build(migrated).circuit)
    check(`${mode}: migrated share round-trips`, JSON.stringify(migrated) === JSON.stringify(parseOptions(serializeOptions(migrated))))
    check(`${mode}: catalog still keeps the legacy collection`, build({ ...defaultOptions, mode, catalog: true }).instances.length > 20)
  }
}
