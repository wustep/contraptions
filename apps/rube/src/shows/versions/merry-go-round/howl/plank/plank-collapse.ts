import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, smooth } from '../kit'
import { CASTLE, MODULE_PIVOT, doorAt, drawCastle, onBody, puff, type CastlePose, type ModuleId, type ModuleMove } from '../wastes/castle'
import { ROOM, WASTES } from '../worlds'
import { BX0, c, CROUCH, deck, ring, T0, YG, type Deck } from './plank-rig'

/**
 * The castle falling apart round her (243.635 → 251.797), drawn through the castle builder's API and nothing else.
 *
 * The room's near wall is gone from the first frame (the room was always seen cut open), and on the climax its back
 * wall breaks up and falls away, so she stands on the floor in the open with the sky behind her. Then, a piece a
 * bar, the castle comes down: the flag tears off on the first downbeat, the chimney topples on its second beat, the
 * back turret, the cottage, the front turrets, the pipes, the face, and last the hull, which breaks in two and
 * falls away either side of the floor, leaving one plank on four legs. Each piece lets go on a downbeat and lands
 * on a later one, in dust.
 *
 * Every piece still on the castle is drawn with the plank's own shudder; a piece that lets go keeps where it was at
 * that moment and falls in the world, so what lies on the ground never moves again.
 */

/* ------------------------------------------------------------------ placing the castle on the plank */

/** The castle's own drawing of a standing point, at the pose we draw it in (its bob and rock taken back out). */
const POSE0: CastlePose = { t: 0, step: 0, noLegs: true }
const D0 = doorAt(POSE0)
const LEAN0 = (() => {
  const a = onBody(POSE0, [0, -6.9])
  const b = onBody(POSE0, [10, -6.9])
  return Math.atan2(b[1] - a[1], b[0] - a[0])
})()
const DOOR = CASTLE.door

/** From here the castle's standing points are drawn where they are: undo its own bob and rock about the door. */
function standing(p: p5, k: number) {
  p.translate(DOOR[0] * k, DOOR[1] * k)
  p.rotate(-LEAN0)
  p.translate(-D0[0] * k, -D0[1] * k)
}

/** A standing castle point in the plank's deck cells: the floor (the door's sill) is the deck's top. */
export const deckOf = (c: Pt): Pt => [c[0], c[1] - DOOR[1]]

/* ------------------------------------------------------------------ the pieces */

type Group = 'flag' | 'chimney' | 'back' | 'house' | 'front' | 'pipes' | 'face' | 'hullL' | 'hullR'

interface Fall {
  group: Group
  ids: ModuleId[]
  /** When it lets go, and when it lands (both on the recording). */
  at: number
  land: number
  /** What it turns about (standing cells), and a box round it (standing cells) for where it comes to rest. */
  pivot: Pt
  box: [number, number, number, number]
  /** Where its pivot comes down (castle x, from the castle's standing origin), and how far it has turned. */
  to: number
  rot: number
}

/** The hull breaks here, top to bottom: a ragged line down its middle. */
const BREAK: Pt[] = [[-0.3, -13.2], [-0.95, -12.1], [-0.4, -11.4], [-1.1, -10.3], [-0.6, -9.4], [-1.2, -8.1], [-0.7, -6.9], [-1.0, -5.5]]

export const FALLS: Fall[] = [
  { group: 'flag', ids: ['flag'], at: c(1), land: c(1) + 3.4, pivot: MODULE_PIVOT.flag, box: [-8.6, -25.7, -6.8, -23.6], to: -16, rot: 2.6 },
  { group: 'chimney', ids: ['chimney'], at: c(1, 2), land: c(3), pivot: MODULE_PIVOT.chimney, box: [0.0, -22.3, 1.4, -17.6], to: -2.8, rot: -1.62 },
  { group: 'back', ids: ['turretBack', 'cannonTop'], at: c(2), land: c(4), pivot: MODULE_PIVOT.turretBack, box: [-8.35, -23.75, -5.1, -12.0], to: -9.4, rot: -1.6 },
  { group: 'house', ids: ['house'], at: c(3), land: c(5), pivot: MODULE_PIVOT.house, box: [-5.55, -19.25, 3.2, -12.25], to: -10.5, rot: -0.36 },
  { group: 'front', ids: ['turretFront'], at: c(4), land: c(6), pivot: MODULE_PIVOT.turretFront, box: [3.05, -19.05, 8.5, -12.25], to: 8.6, rot: 1.58 },
  { group: 'pipes', ids: ['pipes'], at: c(5), land: c(7), pivot: MODULE_PIVOT.pipes, box: [4.5, -18.1, 6.35, -12.3], to: 6.6, rot: 1.25 },
  { group: 'face', ids: ['eye', 'nose', 'jaw'], at: c(6), land: c(7, 2), pivot: MODULE_PIVOT.eye, box: [6.3, -12.6, 10.85, -6.4], to: 9.8, rot: 1.45 },
  { group: 'hullL', ids: ['hull'], at: c(7), land: c(8), pivot: [-4.6, -9.2], box: [-8.6, -12.6, -0.4, -6.0], to: -12.8, rot: -0.2 },
  { group: 'hullR', ids: ['hull'], at: c(7), land: c(8), pivot: [4.2, -9.2], box: [-1.2, -12.6, 9.2, -6.0], to: 9.0, rot: 0.24 },
]

/**
 * The pieces that fall ahead of the plank, in its way: each crumbles into its own dust where it lies (hazed opaquely
 * into the dust's colour inside a dust bank that rises round it, never faded see-through), so the plank runs on over
 * clear ground and leaves the rest of the wreck behind it.
 */
const CRUMBLES = new Set<Group>(['front', 'pipes', 'face', 'hullR'])
function crumbleAt(f: Fall, t: number): number {
  return CRUMBLES.has(f.group) ? smooth(t, f.land + 0.45, f.land + 2.3) : 0
}

/** The draw order the castle draws its modules in (the hull's second call, the stair, goes with it). */
const ORDER: ModuleId[] = ['turretBack', 'cannonTop', 'flag', 'house', 'chimney', 'pipes', 'turretFront', 'hull', 'eye', 'nose', 'jaw']
const ALL = ORDER

/** How far down its pivot sits when it lies at rest turned by `rot`: its lowest corner on the ground. */
function restHeight(f: Fall): number {
  const [x0, y0, x1, y1] = f.box
  const cs = Math.cos(f.rot)
  const sn = Math.sin(f.rot)
  let low = -Infinity
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
    const dx = x - f.pivot[0]
    const dy = y - f.pivot[1]
    low = Math.max(low, dx * sn + dy * cs)
  }
  return low
}
const REST = new Map<Group, number>(FALLS.map((f) => [f.group, restHeight(f)]))

/** A falling piece at `t`: where its pivot is in the world, and how far it has turned (world). */
function fallAt(f: Fall, t: number): { at: Pt; rot: number; landed: boolean; u: number } {
  const d = deck(f.at)
  const cs = Math.cos(d.rot)
  const sn = Math.sin(d.rot)
  const [pu, pv] = deckOf(f.pivot)
  const x0 = d.x + pu * cs - pv * sn
  const y0 = d.y + pu * sn + pv * cs
  const u = Math.max(0, Math.min(1, (t - f.at) / (f.land - f.at)))
  if (f.group === 'flag') {
    // Torn off, it goes away on the wind, turning over, and is gone.
    return { at: [x0 + (BX0 + f.to - x0) * u * (0.4 + 0.6 * u), y0 - 5 * u + 2.5 * u * u], rot: d.rot + f.rot * u, landed: false, u }
  }
  const x1 = BX0 + f.to
  const y1 = YG - (REST.get(f.group) ?? 1)
  // A topple: slow to start, the turn and the drop gathering to the ground; then a jolt and a settle.
  const e = u * u
  const after = Math.max(0, t - f.land)
  const bounce = t > f.land ? 0.18 * Math.max(0, ring(after, 0.34, 0.12)) : 0
  return {
    at: [x0 + (x1 - x0) * (u * 0.35 + 0.65 * e), y0 + (y1 - y0) * e - bounce],
    rot: d.rot + (f.rot - d.rot) * e + 0.05 * Math.sign(f.rot) * ring(after, 0.4, 0.25),
    landed: t >= f.land,
    u,
  }
}

/* ------------------------------------------------------------------ the room, torn open */

/** The room's opening in the hull (standing cells): from the floor up to under the deck, torn at the edges. */
const HOLE: Pt[] = [
  [-4.6, -6.8], [-4.75, -7.6], [-4.45, -8.3], [-4.8, -9.2], [-4.5, -10.1], [-4.7, -11.0], [-3.9, -11.25], [-3.0, -11.05], [-2.1, -11.3],
  [-1.1, -11.1], [-0.1, -11.35], [0.9, -11.1], [1.8, -11.3], [2.7, -11.0], [3.0, -10.2], [2.75, -9.3], [3.05, -8.5], [2.8, -7.6], [3.0, -6.8],
]

/** The room's back wall, which breaks into slabs on the climax: columns and rows of the opening. */
const XS = [-4.8, -2.6, -0.6, 0.15, 1.2, 3.1]
const YS = [-11.4, -9.3, -6.8]
interface Slab {
  pts: Pt[]
  mid: Pt
  at: number
  vx: number
  spin: number
  g: number
}
const SLABS: Slab[] = (() => {
  const out: Slab[] = []
  const j = (i: number, n: number, s: number) => (hash(i, n, s) - 0.5) * 0.35
  for (let ci = 0; ci < XS.length - 1; ci++) {
    for (let ri = 0; ri < YS.length - 1; ri++) {
      const x0 = XS[ci] + (ci ? j(ci, ri, 1) : 0)
      const x1 = XS[ci + 1] + (ci < XS.length - 2 ? j(ci + 1, ri, 1) : 0)
      const y0 = YS[ri] + (ri ? j(ci, ri, 2) : 0)
      const y1 = YS[ri + 1] + (ri < YS.length - 2 ? j(ci, ri + 1, 2) : 0)
      // A ragged slab: a notch in its top edge and one down a side, so no two read as boxes.
      const nx = x0 + (x1 - x0) * (0.3 + 0.4 * hash(ci, ri, 8))
      const ny = y0 + (y1 - y0) * (0.3 + 0.4 * hash(ci, ri, 9))
      const pts: Pt[] = [[x0, y0], [nx, y0 + 0.25 + j(ci, ri, 3)], [x1, y0 + j(ci, ri, 3) * 0.5], [x1 - 0.2 * hash(ci, ri, 10), ny], [x1, y1], [x0 + 0.25, y1 + j(ci, ri, 4) * 0.5], [x0 + 0.15 * hash(ci, ri, 12), ny + 0.3]]
      const mid: Pt = [(x0 + x1) / 2, (y0 + y1) / 2]
      const at = T0 + 0.02 + 0.16 * hash(ci, ri, 5) + (ri === 0 ? 0.06 : 0)
      // They break away from the top first and drop behind the floor, turning, gone into the hull's hold.
      out.push({ pts, mid, at, vx: (mid[0] + 0.8) * 0.25 + (hash(ci, ri, 6) - 0.5) * 0.6, spin: (hash(ci, ri, 7) - 0.5) * 2.2, g: 13 + 4 * hash(ci, ri, 11) })
    }
  }
  return out
})()

/** The back wall as it was: plaster, the brick breast behind the hearth, a shelf; lit red by the war. */
function wall(p: p5, k: number, W: number) {
  p.push()
  p.rectMode(p.CORNER)
  const war = (h: string) => mixHex(mixHex(h, ROOM.night, 0.28), ROOM.warLight, 0.22)
  p.noStroke()
  p.fill(war(ROOM.plaster))
  p.rect(-5 * k, -11.6 * k, 8.4 * k, 4.9 * k)
  // The chimney breast behind the grate, as the room has it: brick to the ceiling, an arched fireplace, a mantel.
  const b0 = -0.35
  const b1 = 1.75
  p.fill(war(ROOM.brick))
  p.rect(b0 * k, -11.6 * k, (b1 - b0) * k, 4.9 * k)
  p.stroke(alpha(p, war(ROOM.brickDark), 1))
  p.strokeWeight(W * 0.5)
  for (let i = 0; i < 12; i++) {
    const y = -6.8 - (i + 1) * 0.38
    p.line(b0 * k, y * k, b1 * k, y * k)
    for (let x = b0 + (i % 2 ? 0.3 : 0.6); x < b1; x += 0.6) p.line(x * k, y * k, x * k, (y + 0.38) * k)
  }
  p.noStroke()
  p.fill(war(ROOM.hearth))
  p.beginShape()
  p.vertex((b0 + 0.25) * k, -6.8 * k)
  p.vertex((b0 + 0.25) * k, -7.9 * k)
  p.bezierVertex((b0 + 0.25) * k, -8.45 * k, (b1 - 0.25) * k, -8.45 * k, (b1 - 0.25) * k, -7.9 * k)
  p.vertex((b1 - 0.25) * k, -6.8 * k)
  p.endShape(p.CLOSE)
  p.fill(war(ROOM.woodDark))
  p.rect((b0 - 0.2) * k, -8.72 * k, (b1 - b0 + 0.4) * k, 0.2 * k)
  p.pop()
}

/* ------------------------------------------------------------------ drawing */

const tracePath = (ctx: CanvasRenderingContext2D, pts: Pt[], k: number) => {
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
}

/** The torn edge of the room's opening: the plating's thickness, dark, and its ragged line. */
function rim(p: p5, k: number, W: number, ink: string) {
  p.push()
  p.noFill()
  p.stroke(WASTES.ironDark)
  p.strokeWeight(Math.max(W * 2.5, 0.16 * k))
  p.beginShape()
  for (const [x, y] of HOLE.slice(1)) p.vertex(x * k, y * k)
  p.endShape()
  p.stroke(ink)
  p.strokeWeight(W)
  p.beginShape()
  for (const [x, y] of HOLE.slice(1)) p.vertex(x * k, y * k)
  p.endShape()
  p.pop()
}

/** Clip to everything but the room's opening (standing cells): what the hull is drawn through. */
function clipHole(p: p5, k: number) {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  ctx.rect(-400 * k, -400 * k, 800 * k, 800 * k)
  tracePath(ctx, HOLE, k)
  ctx.clip('evenodd')
}

/** Clip to one side of the hull's break (standing cells). */
function clipSide(p: p5, k: number, side: -1 | 1) {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  const far = side * 60
  tracePath(ctx, [...BREAK, [far, BREAK[BREAK.length - 1][1]], [far, BREAK[0][1]]], k)
  ctx.clip()
}

/** The castle pose with only `show` drawn, each as the caller has placed it. */
function only(t: number, show: ModuleId[], extra: Partial<CastlePose> = {}): CastlePose {
  const modules: Partial<Record<ModuleId, ModuleMove>> = {}
  for (const id of ALL) if (!show.includes(id)) modules[id] = { gone: 1 }
  return { ...POSE0, t, modules, ...extra }
}

/** Into the deck's frame at `d`. */
function onto(p: p5, k: number, d: Deck) {
  p.translate(d.x * k, d.y * k)
  p.rotate(d.rot)
}

/** Everything of the castle's collapse at `t`, in the part's frame; `vis` is the frame's box (to skip what is out of it). */
export function drawCollapse(p: p5, k: number, W: number, ink: string, t: number, vis: { x0: number; x1: number; y0: number; y1: number }): void {
  if (t < T0 - 0.5) return
  if (vis.x0 > BX0 + 26 || vis.x1 < BX0 - 26) return
  const d = deck(t)
  const gone = new Set<Group>(FALLS.filter((f) => t >= f.at).map((f) => f.group))
  const attached = (ids: ModuleId[]) => ids.filter((id) => !FALLS.some((f) => gone.has(f.group) && f.ids.includes(id) && id !== 'hull'))
  const hullAttached = !gone.has('hullL')
  const fade = smooth(t, T0, T0 + 1.6)
  const light = { lights: 0.5 * (1 - fade), night: 0.3 * (1 - smooth(t, T0, T0 + 8)) }

  // The slabs of the back wall, falling away behind the floor.
  const holdCtx = p.drawingContext as CanvasRenderingContext2D
  holdCtx.save()
  {
    // They go down behind the hull's belly: nothing of them below it.
    const m = holdCtx.getTransform()
    onto(p, k, deck(T0))
    holdCtx.beginPath()
    holdCtx.rect(-30 * k, -30 * k, 60 * k, (30 + deckOf([0, -6.05])[1]) * k)
    holdCtx.clip()
    holdCtx.setTransform(m)
  }
  for (const s of SLABS) {
    if (t < s.at || t > s.at + 1.2) continue
    const u = t - s.at
    const dd = deck(s.at)
    const [mu, mv] = deckOf(s.mid)
    const mx = dd.x + mu * Math.cos(dd.rot) - mv * Math.sin(dd.rot) + s.vx * u
    const my = dd.y + mu * Math.sin(dd.rot) + mv * Math.cos(dd.rot) + 0.5 * s.g * u * u
    if (my > vis.y1 + 3) continue
    p.push()
    p.translate(mx * k, my * k)
    p.rotate(dd.rot + s.spin * u)
    p.translate(-s.mid[0] * k, -s.mid[1] * k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.beginPath()
    tracePath(ctx, s.pts, k)
    ctx.clip()
    wall(p, k, W)
    ctx.restore()
    p.stroke(ink)
    p.strokeWeight(W * 0.8)
    p.noFill()
    p.beginShape()
    for (const [x, y] of s.pts) p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)
    p.pop()
  }
  holdCtx.restore()

  // The pieces still on the castle, with the plank's shudder. The hull through its torn-open room.
  p.push()
  onto(p, k, d)
  p.translate(0, -DOOR[1] * k)
  // Before the break the room's back wall fills the opening.
  if (t < T0 + 0.04) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.beginPath()
    tracePath(ctx, HOLE, k)
    ctx.clip()
    wall(p, k, W)
    ctx.restore()
  }
  const before = attached(['turretBack', 'cannonTop', 'flag', 'house', 'chimney', 'pipes', 'turretFront'])
  if (before.length) {
    p.push()
    standing(p, k)
    drawCastle(p, k, W, ink, only(t, before, { ...light, smoke: 0.5 * (1 - fade) }))
    p.pop()
  }
  if (hullAttached) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    clipHole(p, k)
    p.push()
    standing(p, k)
    drawCastle(p, k, W, ink, only(t, ['hull'], light))
    p.pop()
    ctx.restore()
    rim(p, k, W, ink)
  }
  const after = attached(['eye', 'nose', 'jaw'])
  if (after.length) {
    p.push()
    standing(p, k)
    drawCastle(p, k, W, ink, only(t, after, light))
    p.pop()
  }
  p.pop()

  // The pieces that have let go: each where it was when it went, falling in the world, then lying there.
  const dustCol = mixHex(WASTES.rock, WASTES.mist, 0.5)
  for (const f of FALLS) {
    if (t < f.at) continue
    const crumble = crumbleAt(f, t)
    if ((f.group === 'flag' && t > f.land) || crumble >= 0.985) continue
    const { at, rot } = fallAt(f, t)
    if (at[0] < vis.x0 - 16 || at[0] > vis.x1 + 16) continue
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    p.push()
    p.translate(at[0] * k, at[1] * k)
    p.rotate(rot)
    p.translate(-f.pivot[0] * k, -f.pivot[1] * k)
    if (f.group === 'hullL' || f.group === 'hullR') {
      clipSide(p, k, f.group === 'hullL' ? -1 : 1)
      clipHole(p, k)
    }
    standing(p, k)
    if (f.group === 'hullL' || f.group === 'hullR') {
      p.push()
      p.translate(D0[0] * k, D0[1] * k)
      p.rotate(LEAN0)
      p.translate(-DOOR[0] * k, -DOOR[1] * k)
      rim(p, k, W, ink)
      p.pop()
    }
    // The flag goes on the wind; what lies in the plank's way crumbles into its dust.
    const fadeOut = f.group === 'flag' ? smooth(t, f.land - 1.2, f.land) : 0
    const pose = only(t, f.ids, { night: light.night, haze: crumble, hazeTo: dustCol })
    if (fadeOut > 0) pose.modules = { ...pose.modules, [f.ids[0]]: { gone: fadeOut } }
    drawCastle(p, k, W, ink, pose)
    p.pop()
    ctx.restore()
  }

  // The dust bank each crumbling piece goes into: as thick as the piece is hazed, over the whole of it, thinning
  // away once it has gone.
  for (const f of FALLS) {
    if (!CRUMBLES.has(f.group) || t < f.land || t > f.land + 5) continue
    const bank = smooth(t, f.land + 0.1, f.land + 1.9) * (1 - smooth(t, f.land + 2.4, f.land + 4.8))
    if (bank < 0.01) continue
    const [x0, x1] = spanOnGround(f)
    const H = heightOnGround(f)
    const nx = Math.max(2, Math.round((x1 - x0) / 1.3))
    const ny = Math.max(1, Math.round(H / 1.4))
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const x = x0 + ((i + 0.5) / nx) * (x1 - x0) + (hash(i, j, 41) - 0.5) * 0.6
        const y = YG - ((j + 0.5) / ny) * H - (t - f.land) * 0.15
        const r = 1.1 + 0.6 * hash(i, j, 43) + 0.25 * (t - f.land)
        puff(p, k, x, y, r, dustCol, 0.62 * bank * (0.75 + 0.25 * hash(i, j, 47)), 0.85)
      }
    }
  }

  // Dust where each piece comes down: soft, rolling out along the ground and up.
  for (const f of FALLS) {
    if (f.group === 'flag' || t < f.land || t > f.land + 4) continue
    const a = t - f.land
    const [x0, x1] = spanOnGround(f)
    const n = Math.max(3, Math.round((x1 - x0) / 1.4))
    const big = f.group === 'hullR' ? 1.8 : 1
    for (let i = 0; i < n; i++) {
      const x = x0 + ((i + 0.5) / n) * (x1 - x0)
      const r = (0.9 + a * (1.1 + hash(i, 3) * 0.8)) * big
      const drift = (x - (x0 + x1) / 2) * 0.12 * a
      puff(p, k, x + drift, YG - 0.3 * big - a * (0.5 + 0.4 * hash(i, 5)) * big, r, dustCol, Math.min(0.75, 0.42 * big) * Math.exp(-a / (1.3 * big)) * (0.7 + 0.3 * hash(i, 7)), big > 1 ? 1 : 0.75)
    }
  }
}

/** Where a fallen piece meets the ground, x from and to (world). */
function spanOnGround(f: Fall): [number, number] {
  const [x0, y0, x1, y1] = f.box
  const cs = Math.cos(f.rot)
  const sn = Math.sin(f.rot)
  const xs = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => (x - f.pivot[0]) * cs - (y - f.pivot[1]) * sn)
  const cx = BX0 + f.to
  return [cx + Math.min(...xs), cx + Math.max(...xs)]
}

/** How tall a fallen piece stands off the ground as it lies. */
function heightOnGround(f: Fall): number {
  const [x0, y0, x1, y1] = f.box
  const cs = Math.cos(f.rot)
  const sn = Math.sin(f.rot)
  const vs = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => (x - f.pivot[0]) * sn + (y - f.pivot[1]) * cs)
  return Math.max(...vs) - Math.min(...vs)
}

/** The strikes of the collapse: each piece's letting go and each landing. */
export const COLLAPSE_HITS: number[] = [...new Set([T0, ...FALLS.map((f) => f.at), ...FALLS.filter((f) => f.group !== 'flag').map((f) => f.land)])].sort((a, b) => a - b)

/** When the collapse is done: the plank stands on its own. */
export const BARE = CROUCH
