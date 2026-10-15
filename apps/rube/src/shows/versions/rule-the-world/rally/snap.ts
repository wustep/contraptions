import type p5 from 'p5'
import { live } from './live'

/**
 * The stage's engine, fetched once in the page: the show's modules never import it outright, since it brings p5 with
 * it and the checks run this show where there is no page.
 */
type Engine = typeof import('../../../../engine')
let engine: Engine | null = null
if (typeof window !== 'undefined') void import('../../../../engine').then((m) => (engine = m))

/**
 * A place, painted once into a picture of its own: what the finale hangs in the rooms of the machine (`finale.ts`).
 *
 * Each picture is the place as the stage would paint it at one moment of its story (`t`), framed on a point of its
 * own cells (`at`) and `cells` tall, with Marty and the company left out (he is at the nursery's glass by then) and
 * the show's own light on him (his glow, the blooms) asleep while it is painted; the place's grade and vignette are
 * kept, so each room keeps its own colour. They are painted on a hidden canvas of their own and kept: a picture is a
 * pure function of its moment and its framing, so it is the same every time it is made.
 */

export interface Snap {
  key: string
  /** The moment, the point it is framed on (that place's cells), and how many cells tall the picture is. */
  t: number
  at: [number, number]
  cells: number
}

let painter: { p: p5; holder: HTMLElement; job: (() => void) | null } | null = null

function getPainter(like: p5, w: number, h: number): { p: p5; holder: HTMLElement; job: (() => void) | null } | null {
  if (typeof document === 'undefined' || !engine) return null
  const { drawingModes } = engine
  // A p5 of the stage's own kind, made from the stage's.
  const P5 = like.constructor as new (sketch: (s: p5) => void) => p5
  if (painter && painter.p.width === w && painter.p.height === h) return painter
  if (painter) {
    painter.p.remove()
    painter.holder.remove()
  }
  const holder = document.createElement('div')
  holder.hidden = true
  holder.style.position = 'absolute'
  holder.style.left = '-99999px'
  document.body.append(holder)
  const box: { p: p5; holder: HTMLElement; job: (() => void) | null } = { p: null as unknown as p5, holder, job: null }
  box.p = new P5((s: p5) => {
    s.setup = () => {
      s.pixelDensity(1)
      s.createCanvas(w, h).parent(holder)
      drawingModes(s)
      s.noLoop()
    }
    s.draw = () => {
      const job = box.job
      box.job = null
      job?.()
    }
  })
  painter = box
  return box
}

const made = new Map<string, HTMLCanvasElement>()

/**
 * The picture of `snap` at `w` × `h` pixels, painting it now (with a p5 like `like`, the stage's) if it has not been
 * yet; null where there is no page.
 */
export function snapshot(snap: Snap, w: number, h: number, like: p5): HTMLCanvasElement | null {
  const id = `${snap.key}|${snap.t}|${snap.at.join(',')}|${snap.cells}|${w}x${h}`
  const have = made.get(id)
  if (have) return have
  const show = live.show
  const P = getPainter(like, w, h)
  if (!show || !P || !engine) return null
  const { drawWorld } = engine
  const here = { ...show.at(snap.t), hidden: true, balls: undefined }
  const k = h / snap.cells
  let failed: unknown = null
  P.job = () => {
    live.painting = true
    try {
      drawWorld(P.p, show, snap.t, here, { x: snap.at[0], y: snap.at[1] }, k, { x: 0, y: 0, w, h }, false)
    } catch (err) {
      failed = err
    } finally {
      live.painting = false
    }
  }
  P.p.redraw()
  // A place that cannot be painted leaves its room empty rather than the show stopped; it is said, and tried again.
  if (failed) {
    console.error(`rally: the ${snap.key} room could not be painted`, failed)
    return null
  }
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d')?.drawImage(P.p.drawingContext.canvas as HTMLCanvasElement, 0, 0)
  made.set(id, out)
  return out
}

/** Whether `snap` is painted at that size already. */
export const painted = (snap: Snap, w: number, h: number): boolean => made.has(`${snap.key}|${snap.t}|${snap.at.join(',')}|${snap.cells}|${w}x${h}`)

/**
 * Paint `snaps` ahead of time, one in each spell the page has idle (or, where it cannot say, every few frames' worth
 * of time), from as soon as the show is on the stage: so that no frame of the show pays for a picture, and every
 * place's drawing has run once before its first entrance. Asked again, it does nothing.
 */
let preparing = false
export function prepare(snaps: Snap[], w: number, h: number, like: p5): void {
  if (preparing || typeof window === 'undefined') return
  preparing = true
  type Idle = (cb: (d: { timeRemaining(): number; didTimeout: boolean }) => void, o?: { timeout: number }) => number
  const idle: Idle = (window as unknown as { requestIdleCallback?: Idle }).requestIdleCallback?.bind(window) ??
    ((cb) => window.setTimeout(() => cb({ timeRemaining: () => 12, didTimeout: true }), 150))
  const left = [...snaps]
  const step = (d: { timeRemaining(): number; didTimeout: boolean }) => {
    // The engine first, then a picture a spell, while a spell has room for one.
    if (!engine || (d.timeRemaining() < 10 && !d.didTimeout)) {
      idle(step, { timeout: 3000 })
      return
    }
    const next = left.shift()
    if (next && !painted(next, w, h)) snapshot(next, w, h, like)
    if (left.length) idle(step, { timeout: 3000 })
    else rest()
  }
  idle(step, { timeout: 3000 })
}

/** Let the painter go once every picture is made. */
export function rest(): void {
  if (!painter) return
  painter.p.remove()
  painter.holder.remove()
  painter = null
}

// Dev: a picture on demand, to frame the rooms by eye.
if (typeof window !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
  ;(window as unknown as Record<string, unknown>).__rallySnap = (key: string, t: number, x: number | null, y: number | null, cells: number, w: number, h: number) => {
    const cam = live.camera?.(t)
    const at: [number, number] = [x ?? cam?.x ?? 0, y ?? cam?.y ?? 0]
    const like = painter?.p ?? live.stage
    return { at, url: like ? snapshot({ key: `${key}?`, t, at, cells }, w, h, like)?.toDataURL('image/png') ?? null : null }
  }
}
