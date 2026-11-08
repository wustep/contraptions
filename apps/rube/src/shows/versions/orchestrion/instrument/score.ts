import { METAL_E } from './design'
import type { Performance } from './run'
import { SR, bar, chime, knock, pipe, pipeKnock, string, type Out } from './voices'

/**
 * The score is the simulation's log, read out. Every contact on a bar or a string, every passage of a ball down a
 * pipe, every chime the gates strike and every knock of the machine's own works becomes one voice, at the moment it
 * happened, as hard as it happened, panned to where it happened. Nothing is added that the log does not say.
 */

export type NoteKind = 'bar' | 'string' | 'pipe' | 'pipe-knock' | 'chime' | 'knock'

export interface Note {
  t: number
  kind: NoteKind
  /** The sounding part, or -1 for a knock of the works. */
  part: number
  hz: number
  /** How hard, cells a second. */
  v: number
  /** Where along the part. */
  u: number
  x: number
  /** A pipe's breath: how long the ball was in it, and its speed coming out. */
  dur?: number
  vOut?: number
  metal?: boolean
  knock?: 'tick' | 'seat' | 'felt' | 'bowl' | 'flap'
}

export function notes(perf: Performance): Note[] {
  const { parts } = perf.machine
  const out: Note[] = []
  for (const c of perf.contacts) {
    if (c.part < 0) continue
    const p = parts[c.part]
    if (c.material === 'bar') out.push({ t: c.t, kind: 'bar', part: c.part, hz: p.hz, v: c.v, u: c.u, x: c.x, metal: p.e >= METAL_E })
    else if (c.material === 'string') out.push({ t: c.t, kind: 'string', part: c.part, hz: p.hz, v: c.v, u: c.u, x: c.x })
    else if (c.material === 'brass' && p.kind === 'pipe') out.push({ t: c.t, kind: 'pipe-knock', part: c.part, hz: p.hz, v: c.v, u: 0.5, x: c.x })
  }
  for (const g of perf.passages) {
    const p = parts[g.part]
    out.push({ t: g.tIn, kind: 'pipe', part: g.part, hz: p.hz, v: g.vIn, u: 0.5, x: p.ax, dur: g.tOut - g.tIn, vOut: g.vOut })
  }
  for (const s of perf.strikes) {
    const p = parts[s.part]
    out.push({ t: s.t, kind: 'chime', part: s.part, hz: p.hz, v: s.v, u: 0.5, x: p.ax })
  }
  for (const k of perf.knocks) out.push({ t: k.t, kind: 'knock', part: -1, hz: 0, v: k.v, u: 0.5, x: k.x, knock: k.kind })
  return out.sort((a, b) => a.t - b.t)
}

/** How loud each kind sits in the mix, before the room and the limiter. */
const LEVEL: Record<NoteKind, number> = {
  bar: 0.075,
  string: 0.6,
  pipe: 1.25,
  'pipe-knock': 0.6,
  chime: 0.2,
  knock: 0.7,
}

/**
 * The dry mix: every note into two channels, `seconds` long. Equal-power panning across the machine, kept inside
 * three quarters of the way to either side, so the instrument sits in front of you and not round you.
 */
export function mixdown(
  perf: Performance,
  list: Note[] = notes(perf),
  seconds = perf.duration,
  into?: { L: Float32Array; R: Float32Array },
): { L: Float32Array; R: Float32Array } {
  const n = into ? into.L.length : Math.ceil(seconds * SR)
  const L = into?.L ?? new Float32Array(n)
  const R = into?.R ?? new Float32Array(n)
  const { box } = perf.machine
  const mid = (box.x0 + box.x1) / 2
  const half = (box.x1 - box.x0) / 2
  for (const note of list) {
    const at = Math.round(note.t * SR)
    if (at < 0 || at >= n) continue
    const pan = Math.max(-1, Math.min(1, (note.x - mid) / half)) * 0.75
    const angle = ((pan + 1) * Math.PI) / 4
    const level = LEVEL[note.kind]
    const out: Out = { L, R, at, gl: Math.cos(angle) * level, gr: Math.sin(angle) * level }
    switch (note.kind) {
      case 'bar':
        bar(out, note.hz, note.v, note.u, !!note.metal)
        break
      case 'string':
        string(out, note.hz, note.v, note.u)
        break
      case 'pipe':
        pipe(out, note.hz, note.dur ?? 0.2, note.v, note.vOut ?? note.v, Math.round(note.t * 1000))
        break
      case 'pipe-knock':
        pipeKnock(out, note.hz, note.v)
        break
      case 'chime':
        chime(out, note.hz, note.v)
        break
      case 'knock':
        knock(out, note.knock ?? 'tick', note.v)
        break
    }
  }
  return { L, R }
}
