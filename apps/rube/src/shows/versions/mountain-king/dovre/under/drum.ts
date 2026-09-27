import type p5 from 'p5'
import { laneAt, mixHex, type Lane, type Pt } from '../../../../../parts'
import { alpha, box, hash, part, route, smooth, type Ctx, type PartShot, type Way } from '../kit'
import { beat, FF } from '../music'
import { G_EARTH, hop } from '../physics'
import { quake } from '../rock'
import { HEART_SHOT, PLAN, SEAM_SHOT } from '../seams'
import { STONE, WORKS } from '../worlds'
import { BEGIN, BLOWS, BURST, BURST_B, BURST_X, DRUM2, DRUM3, DRUMMERS, END, FLOOR, LANDINGS, SHAFT, THROUGH, farEdge, landY, onSkin, type Drummer } from './drum-clock'
import { FIRES, drawFire, drawDrum, drawDrummer, drawDust, drawKettle, drawRoom, jolt, light, withGreatTilt } from './drum-set'

/**
 * The trolls' drum (89.23 → 101.95; phrases 10 and 11, A A, the accelerando, the crescendo to the fortissimo).
 *
 * Under the mine, the trolls' drum chamber, dark, the fires banked. Peer falls down the mine's shaft onto the
 * kettle the trolls keep under it: the first stroke, and it throws him, rising with the theme's run, across to the
 * war-drum. There a drummer climbs up the drum's back and pounds it, a fist down on every beat, and every blow
 * bounces him, as high as the note; a second drummer joins on the next bar; each blow fans the war-fires and the
 * chamber brightens. On phrase 10's strongest accent the two of them throw him across to the great drum, on its
 * trestle over the pit, where three more climb up, one a bar, the last the oldest and biggest. Phrase 11: they
 * pound on the backbeats, bigger swings, war cries, the chamber jumping on every blow and dust shaken down from the
 * vault, and he goes higher each time. The fortissimo's blow bursts the skin under him, and he falls through the
 * great drum and down its pit into the mountain's heart.
 *
 * Every blow is a beat of the measured grid; every landing is a blow (`DRUM_HITS`).
 */

export interface DrumState {
  begin: number
  lane: Lane
}

/** Every strike, show seconds: his landings (the seam's first), the blows while the drummers have him, the burst. */
function hits(): number[] {
  const out = new Set<number>()
  for (const l of LANDINGS) out.add(beat(l.b))
  const first = beat(DRUMMERS[0].up)
  for (const t of BLOWS) if (t >= first - 1e-6 && t <= BURST + 1e-6) out.add(t)
  return [...out].sort((a, b) => a - b)
}
export const DRUM_HITS: number[] = hits()

/* ------------------------------------------------------------------ the fortissimo: the great drum bursts */

/** Lit colour, as `drum-set.ts` has it: `hex` as the fire shows it, sunk toward the rock where it does not reach. */
const lit = (hex: string, L: number): string => mixHex(STONE.deep, hex, 0.14 + 0.86 * L)
const TORN = mixHex(STONE.deep, WORKS.wood, 0.25)
const HIDE = (L: number): string => lit(mixHex(WORKS.skin, WORKS.wood, 0.3), L)

/**
 * The tear: the burst's small hole (`drum-set.ts`) rips on open across the skin once he is through it, out toward
 * the east hoop, its edge ragged. It opens only after he has sunk behind the barrel's lip (0.18 s), from the size the
 * hole has, so nothing jumps.
 */
const TEAR_FROM = 0.18
const TEAR_TO = 0.5
interface Tear {
  x: number
  y: number
  rx: number
  ry: number
}
function tearOf(T: number, j: number): Tear | null {
  const s = T - BURST
  if (s < TEAR_FROM) return null
  const u = smooth(s, TEAR_FROM, TEAR_TO)
  return { x: BURST_X - 0.2 * u, y: DRUM3.skin + j + 0.01, rx: 0.62 + 1.0 * u, ry: 0.23 + 0.08 * u }
}
function tearPts(h: Tear): Pt[] {
  const out: Pt[] = []
  const n = 19
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n
    const r = i % 2 ? 1 : 0.7 + 0.22 * hash(i, 7, 1)
    out.push([h.x + Math.cos(a) * h.rx * r, h.y + Math.sin(a) * h.ry * r])
  }
  return out
}

/** The tear on the skin: `all` under the drummers (the skin's far half is in front of them), `near` over the barrel's lip. */
function drawTear(p: p5, c: Ctx, T: number, L: number, j: number, half: 'all' | 'near'): void {
  const h = tearOf(T, j)
  if (!h) return
  const k = c.k
  const cy = DRUM3.skin + j
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(DRUM3.cx * k, cy * k, DRUM3.rx * 0.985 * k, DRUM3.ry * 0.93 * k, 0, 0, Math.PI * 2)
  ctx.clip()
  if (half === 'near') {
    ctx.beginPath()
    ctx.rect((DRUM3.cx - DRUM3.rx - 1) * k, cy * k, (2 * DRUM3.rx + 2) * k, (DRUM3.ry + 1) * k)
    ctx.clip()
  }
  p.push()
  p.strokeJoin(p.ROUND)
  p.stroke(mixHex(STONE.deep, c.ink, 0.3 + 0.5 * L))
  p.strokeWeight(c.weight * 0.8)
  p.fill(TORN)
  p.beginShape()
  for (const [x, y] of tearPts(h)) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
  // Two torn flaps of hide hanging into it from the far lip, still swinging: broad and uneven, never a row of teeth.
  if (half === 'all') {
    p.noStroke()
    p.fill(HIDE(L))
    const s = T - BURST
    for (const [i, u] of [-0.5, 0.3].entries()) {
      const x = h.x + u * h.rx
      const y = h.y - h.ry * Math.sqrt(Math.max(0, 1 - u * u)) * 0.85
      const w = (0.2 + 0.1 * i) * (h.rx / 1.6)
      const len = (0.14 + 0.05 * i) * (h.rx / 1.6)
      const sway = 0.04 * Math.sin(s * 7 + u * 4) * Math.exp(-s / 0.8)
      p.beginShape()
      p.vertex((x - w) * k, y * k)
      p.vertex((x + w) * k, y * k)
      p.vertex((x + w * 0.4 + sway) * k, (y + len * 0.8) * k)
      p.vertex((x - w * 0.1 + sway) * k, (y + len) * k)
      p.vertex((x - w * 0.7 + sway) * k, (y + len * 0.55) * k)
      p.endShape(p.CLOSE)
    }
  }
  p.pop()
  ctx.restore()
}

/** Torn hide hanging over the barrel's front from the tear's near lip: the skin's rags, flopping down and settling. */
function drawRags(p: p5, c: Ctx, T: number, L: number, j: number): void {
  const h = tearOf(T, j)
  if (!h) return
  const k = c.k
  const s = T - BURST
  p.push()
  p.strokeJoin(p.ROUND)
  p.stroke(mixHex(STONE.deep, c.ink, 0.3 + 0.6 * L))
  p.strokeWeight(c.weight * 0.8)
  p.fill(lit(WORKS.skin, L))
  // Two broad rags of uneven length, their torn ends ragged, not pointed.
  for (const [i, [u, w, l]] of ([[-0.45, 0.2, 0.42], [0.35, 0.26, 0.3]] as const).entries()) {
    const x = h.x + u * h.rx
    // Only where the lip is still on the skin.
    if (Math.abs(x - DRUM3.cx) > DRUM3.rx * 0.9) continue
    const y = h.y + h.ry * Math.sqrt(Math.max(0, 1 - u * u)) * 0.92
    // It flops over the lip and down the barrel, then swings a little and settles.
    const drop = smooth(s, TEAR_FROM + 0.05 * i, TEAR_TO + 0.08 * i)
    const len = l * drop
    if (len < 0.01) continue
    const sw = 0.06 * Math.sin((s - TEAR_FROM) * 6.5 + 2 * i) * Math.exp(-(s - TEAR_FROM) / 0.7) * drop
    p.beginShape()
    p.vertex((x - w) * k, (y - 0.02) * k)
    p.vertex((x + w) * k, (y - 0.02) * k)
    p.vertex((x + w * 0.85 + sw) * k, (y + len * 0.75) * k)
    p.vertex((x + w * 0.35 + sw) * k, (y + len * 0.95) * k)
    p.vertex((x - w * 0.05 + sw) * k, (y + len * 0.8) * k)
    p.vertex((x - w * 0.45 + sw) * k, (y + len) * k)
    p.vertex((x - w * 0.9 + sw) * k, (y + len * 0.7) * k)
    p.endShape(p.CLOSE)
  }
  p.pop()
}

/**
 * Big shreds of the burst skin, blown up out of the tear and fluttering down (drag on a light, flat piece): the ones
 * over the floor come to rest on it and stay; the ones over the pit sink into its dark after him.
 */
interface Shred {
  x0: number
  vx: number
  vy: number
  at: number
  len: number
  wid: number
  spin: number
}
const SHRED_G = 10
const SHRED_DRAG = 1.2
const SHREDS: readonly Shred[] = [
  { x0: -0.55, vx: -3.4, vy: -5.6, at: 0.0, len: 0.46, wid: 0.2, spin: 7 },
  { x0: 0.5, vx: 2.2, vy: -6.2, at: 0.01, len: 0.4, wid: 0.18, spin: -9 },
  { x0: -0.3, vx: -1.6, vy: -7.0, at: 0.02, len: 0.34, wid: 0.16, spin: 11 },
  { x0: 0.2, vx: 0.5, vy: -5.0, at: 0.03, len: 0.3, wid: 0.15, spin: -8 },
  { x0: -0.6, vx: -4.4, vy: -4.2, at: 0.01, len: 0.38, wid: 0.17, spin: -6 },
  { x0: 0.6, vx: 1.2, vy: -4.6, at: 0.04, len: 0.28, wid: 0.14, spin: 10 },
  { x0: -0.1, vx: -0.4, vy: -6.6, at: 0.02, len: 0.32, wid: 0.15, spin: -12 },
]
const inPit = (x: number): boolean => x > SHAFT.x0 + 0.05 && x < SHAFT.x1 - 0.05
function shredAt(sh: Shred, s: number): Pt {
  const e = 1 - Math.exp(-SHRED_DRAG * s)
  const vt = SHRED_G / SHRED_DRAG
  return [BURST_X + sh.x0 + (sh.vx * e) / SHRED_DRAG, DRUM3.skin - 0.05 + vt * s + ((sh.vy - vt) * e) / SHRED_DRAG]
}
/** When each shred comes down on the floor, seconds after its launch (Infinity: it goes down the pit). */
const SHRED_LAND: readonly number[] = SHREDS.map((sh) => {
  // The top of its flight, then the fall from there to the floor.
  let lo = Math.log(1 - sh.vy / (SHRED_G / SHRED_DRAG)) / SHRED_DRAG
  let hi = 8
  for (let n = 0; n < 50; n++) {
    const mid = (lo + hi) / 2
    if (shredAt(sh, mid)[1] >= FLOOR - 0.03) hi = mid
    else lo = mid
  }
  return inPit(shredAt(sh, hi)[0]) ? Infinity : hi
})

function drawShreds(p: p5, c: Ctx, T: number, L: number): void {
  const k = c.k
  p.push()
  p.strokeJoin(p.ROUND)
  for (const [i, sh] of SHREDS.entries()) {
    const s = T - BURST - sh.at
    if (s <= 0) continue
    const land = SHRED_LAND[i]
    const down = s >= land
    const [x, y] = shredAt(sh, Math.min(s, land))
    // Over the pit: into its dark, and gone.
    const fade = land === Infinity ? 1 - smooth(y, 1.2, 3.4) : 1
    if (fade <= 0) continue
    // Out of the tear it grows from nothing in a twentieth of a second (it was part of the skin).
    const grow = smooth(s, 0, 0.06)
    // Tumbling: turned in the plane, its face turning to us and away (a flat thing fluttering); flat once down.
    const turn = (sh.spin * (1 - Math.exp(-0.8 * Math.min(s, land)))) / 0.8
    const lie = down ? smooth(s, land, land + 0.15) : 0
    const ang = turn + (Math.round(turn / Math.PI) * Math.PI - turn) * lie
    const face = (0.25 + 0.75 * Math.abs(Math.cos(3.1 * Math.min(s, land) + i))) * (1 - lie) + 0.35 * lie
    p.push()
    p.translate(x * k, y * k)
    p.rotate(ang)
    p.scale(1, face)
    p.stroke(alpha(p, mixHex(STONE.deep, c.ink, 0.3 + 0.6 * L), fade))
    p.strokeWeight(c.weight * 0.7)
    p.fill(alpha(p, lit(WORKS.skin, L), fade))
    const a = (sh.len / 2) * grow
    const b = (sh.wid / 2) * grow
    const r = (n: number) => 0.75 + 0.35 * hash(i, n, 4)
    p.beginShape()
    p.vertex(-a * k, -b * 0.4 * k)
    p.vertex(-a * 0.3 * k, -b * r(1) * k)
    p.vertex(a * 0.5 * k, -b * r(2) * k)
    p.vertex(a * k, b * 0.2 * k)
    p.vertex(a * 0.2 * k, b * r(3) * k)
    p.vertex(-a * 0.6 * k, b * r(5) * 0.8 * k)
    p.endShape(p.CLOSE)
    p.pop()
  }
  p.pop()
}

/**
 * The great drum's three drummers, thrown back off their galleries by the burst: as they were on the fortissimo's
 * blow, knocked backward (away from the skin) and a little up, toppling back, and dropping behind their planks,
 * gone within a second. The nearest goes first and hardest.
 */
const THROWN_AT = BURST + 0.03
const plankOf = (dr: Drummer): number => farEdge(DRUM3, dr.x) - (dr.x < DRUM3.cx ? 0.7 : 1) * 0.16
function drawThrown(p: p5, c: Ctx, dr: Drummer, T: number, L: number, peerX: number, j: number): void {
  const dist = Math.abs(dr.x - BURST_X)
  const s = Math.max(0, T - BURST - 0.012 * dist)
  const back = dr.x < DRUM3.cx ? -1 : 1
  // Lighter and nearer, thrown harder; the young one's back is to the wall, so it tips more than it travels.
  const force = Math.min(1.25, 1.9 / (0.9 + 0.3 * dist)) * Math.sqrt(1.7 / dr.size)
  const travel = (back > 0 ? 0.3 : 0.75) * force
  const dx = back * travel * (1 - Math.exp(-s / 0.18))
  const dy = -2.4 * force * s + 0.5 * 15 * s * s
  if (dy > dr.size * 1.3) return
  const tip = back * (back > 0 ? 0.55 : 0.95) * (1 - Math.exp(-s / 0.22))
  const j0 = jolt(THROWN_AT)
  const feet = plankOf(dr) + j0
  const k = c.k
  // Everything under its plank's top is behind the plank.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(-4 * k, -40 * k, 26 * k, (plankOf(dr) + j + 0.03 + 40) * k)
  ctx.clip()
  p.push()
  p.translate((dr.x + dx) * k, (feet + dy) * k)
  p.rotate(tip)
  p.translate(-dr.x * k, -feet * k)
  drawDrummer(p, c, dr, Math.min(T, THROWN_AT), L, peerX, j0)
  p.pop()
  ctx.restore()
}

/**
 * The rock between the mine's floor and the chamber's vault. The drum's wide keys and his two flights up under the
 * vault (the throw across, the hang) reach a little over it, where the mine's floor, its rails and its wreck would
 * show along the top of the frame (the Zoom crop keeps him in frame only if the frame goes that high); while the drum
 * has the ball that band is plain rock.
 *
 * A stage taller than 16:9 (a phone) sees far over it: the mine is a whole room there, and the band would be a black
 * box laid over its floor. So it fades out as the view's top rises past the band's own top.
 */
const CEIL_TOP = -9.5
function drawCeiling(p: p5, c: Ctx, T: number): void {
  if (T < BEGIN || T > END) return
  const k = c.k
  const m = (p.drawingContext as CanvasRenderingContext2D).getTransform()
  const viewTop = -m.f / m.d / k
  const a = 1 - smooth(CEIL_TOP - viewTop, -0.1, 0.7)
  if (a <= 0.004) return
  p.push()
  p.noStroke()
  p.fill(alpha(p, c.bg, a))
  p.rectMode(p.CORNER)
  p.rect(0.55 * k, CEIL_TOP * k, 24 * k, (-CEIL_TOP - 6.52) * k)
  p.pop()
}

/*
 * Dark until he drops into it. The part draws whenever its cells are in view, and the opening wide and the mine's
 * chase both see down here (a tall phone frame most of all), so until he falls through the vault the room is solid
 * rock: a cover over its box and the pit. As he comes through the vault the cover lifts from the top down with a
 * soft edge, just ahead of him, so he is seen falling into a place, and the room is all there well before the kettle.
 */
const COVER_TOP = -6.5 - 0.2
const COVER_BOTTOM = FLOOR + 0.4
const COVER_FEATHER = 1.0
/** He passes the vault (-6.5) about 0.68 s before he lands on the kettle (`BEGIN`), just after the cart hits the stop. */
const OPEN_FROM = BEGIN - 0.68
const OPEN_FOR = 0.42
/** The cover's top edge, part frame: over the vault until he reaches it, then under the floor. */
const coverEdge = (T: number): number => COVER_TOP + (COVER_BOTTOM + COVER_FEATHER - COVER_TOP) * smooth(T, OPEN_FROM, OPEN_FROM + OPEN_FOR)
const covered = (T: number): boolean => T <= OPEN_FROM
const lifted = (T: number): boolean => T >= OPEN_FROM + OPEN_FOR

function drawCover(p: p5, c: Ctx, T: number): void {
  if (lifted(T)) return
  const k = c.k
  const edge = coverEdge(T)
  const x0 = -1.0 - 0.2
  const x1 = 17.0 + 0.2
  p.push()
  p.noStroke()
  p.rectMode(p.CORNER)
  p.fill(STONE.deep)
  // The pit under the great drum, down to the heart's ceiling (the heart covers its own room).
  p.rect((SHAFT.x0 - 0.15) * k, (FLOOR - 0.1) * k, (SHAFT.x1 - SHAFT.x0 + 0.3) * k, (SHAFT.bottom - FLOOR + 0.1) * k)
  if (edge < COVER_BOTTOM) {
    const top = Math.max(COVER_TOP, edge)
    p.rect(x0 * k, top * k, (x1 - x0) * k, (COVER_BOTTOM - top) * k)
  }
  // The upper edge is soft: a feather of bands over the cell above it, never above the vault's own rock.
  if (edge > COVER_TOP) {
    const n = 10
    for (let i = 0; i < n; i++) {
      const y0 = edge - COVER_FEATHER * (1 - i / n)
      const y1 = Math.min(COVER_BOTTOM, y0 + COVER_FEATHER / n)
      const yy = Math.max(COVER_TOP, y0)
      if (y1 <= yy) continue
      p.fill(alpha(p, STONE.deep, (i + 0.5) / n))
      p.rect(x0 * k, yy * k, (x1 - x0) * k, (y1 - yy) * k)
    }
  }
  p.pop()
}

/**
 * While the cover lifts, what is drawn over the ball (the kettle's and the drums' fronts) is clipped to the room
 * already uncovered (to the feather's middle): the cover itself is under the ball, so he is never hidden by it.
 */
function clipUncovered(p: p5, c: Ctx, T: number): void {
  const k = c.k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const edge = coverEdge(T) - 0.5 * COVER_FEATHER
  ctx.beginPath()
  ctx.rect(-4 * k, (COVER_TOP - 4) * k, 26 * k, (edge - COVER_TOP + 4) * k)
  ctx.clip()
}

export const drum = part<DrumState>(
  {
    name: 'drum',
    draw: (p, s, c) => {
      const T = s.begin + c.t
      if (covered(T)) {
        drawCover(p, c, T)
        return
      }
      const L = light(T)
      const peerX = laneAt(s.lane, c.t).x
      const [qx, qy] = quake(T)
      const j = jolt(T)
      p.push()
      p.translate(qx * c.k, qy * c.k)
      drawRoom(p, c, T, L)
      for (const [n, x] of FIRES.entries()) drawFire(p, c, x, T, L, n + 1, j)
      drawDust(p, c, T, L)
      drawKettle(p, c, T, L, 'back')
      drawDrum(p, c, DRUM2, 2, T, L, 'back', j, peerX)
      for (const d of DRUMMERS) if (d.drum === 2) drawDrummer(p, c, d, T, L, peerX, j)
      drawDrum(p, c, DRUM3, 3, T, L, 'back', j, peerX)
      withGreatTilt(p, c, T, j, () => drawTear(p, c, T, L, j, 'all'))
      for (const d of DRUMMERS) {
        if (d.drum !== 3) continue
        if (T > BURST) drawThrown(p, c, d, T, L, peerX, j)
        else drawDrummer(p, c, d, T, L, peerX, j)
      }
      p.pop()
      drawCover(p, c, T)
    },
    over: (p, s, c) => {
      const T = s.begin + c.t
      if (covered(T)) return
      const L = light(T)
      const peerX = laneAt(s.lane, c.t).x
      const [qx, qy] = quake(T)
      const j = jolt(T)
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const lifting = !lifted(T)
      if (lifting) {
        ctx.save()
        clipUncovered(p, c, T)
      }
      p.push()
      p.translate(qx * c.k, qy * c.k)
      drawKettle(p, c, T, L, 'front')
      drawDrum(p, c, DRUM2, 2, T, L, 'front', j, peerX)
      drawDrum(p, c, DRUM3, 3, T, L, 'front', j, peerX)
      if (T > BURST) {
        withGreatTilt(p, c, T, j, () => {
          drawTear(p, c, T, L, j, 'near')
          drawRags(p, c, T, L, j)
        })
        drawShreds(p, c, T, L)
      }
      drawCeiling(p, c, T)
      p.pop()
      if (lifting) ctx.restore()
    },
  },
  (slot) => {
    const at = (b: number) => beat(b) - slot.begin
    const span = slot.end - slot.begin
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }]
    for (const l of LANDINGS.slice(1)) {
      const to: Pt = [l.x, landY(l)]
      const prev = ways[ways.length - 1]
      ways.push(l.arc ? { at: at(l.b), p: to, arc: l.arc } : hop(prev, to, at(l.b), G_EARTH))
    }
    // Through the burst skin, straight down the great drum and its pit onto the heart: slowed by the skin, then
    // falling under gravity. The ramp's two speeds give exactly the time the slot has left.
    const tB = at(BURST_B)
    const drop = PLAN.drum.exit[1] - onSkin(DRUM3)
    const dur = span - tB
    const v1 = (2 * drop) / dur - THROUGH
    ways.push({ at: span, p: [BURST_X, PLAN.drum.exit[1]], ramp: [THROUGH, v1] })
    const lane: Lane = { segs: route(ways), fire: at(164) }
    const [x0, y0, x1, y1] = PLAN.drum.footprint
    return {
      cells: box(x0, y0, x1, y1).concat(box(SHAFT.x0, 1, SHAFT.x1, SHAFT.bottom)),
      exit: PLAN.drum.exit,
      lane,
      state: { begin: slot.begin, lane },
    }
  },
  (slot): PartShot[] => [
    // The seam's framing (6 cells, following), leaning east into the room he falls into, so the room is seen (its
    // banked fires, the kettle, the drums) and not the rock of its west wall.
    { t: slot.begin, ...SEAM_SHOT, off: [1.7, SEAM_SHOT.off[1]] },
    // The kettle's three strokes: the landing settles first (the camera eases out of the dive onto him on the kettle,
    // a held point, over a beat), and only then leans the way he will be thrown.
    { t: beat(161.2), cells: 6.1, hold: [-0.2, -0.55], w: 0.75, off: [0.2, -0.3] },
    { t: beat(162.4), cells: 6.3, hold: [1.2, -1.1], w: 0.35, off: [0.9, -0.9] },
    // On the war-drum: close, the drummers over him. Held a little west of him, so the frame runs from the room's west
    // wall to the far war-fire: the kettle whole at its west edge (never half out of it), both fires whole over the
    // floor, and the great drum's gallery out past its east edge. Low enough for the fires, high enough that the
    // clubs at the top of their swing stay in the Zoom crop.
    { t: beat(164.6), cells: 6.6, hold: [4.46, -2.21], w: 0.8 },
    // A slow push in as the second drummer comes up, then back out for the throw.
    { t: beat(168.5), cells: 6.5, hold: [4.5, -2.17], w: 0.8 },
    { t: beat(171.5), cells: 6.7, hold: [4.42, -2.27], w: 0.8 },
    // The throw across: the whole chamber. (Every key's frame top stays near the vault: the rock over it is plain,
    // `drawCeiling`, but a frame kept low wastes none of itself on it. His two flights up under the vault set how low:
    // the Zoom crop must still hold him at their tops.)
    { t: beat(174.8), cells: 8.0, hold: [9.0, -2.8], w: 0.7 },
    // The great drum: three drummers, two clubs each.
    { t: beat(177.8), cells: 7.0, hold: [13.3, -3.2], w: 0.5 },
    // (Held west of him, so the frame's east edge stays near the room's east wall at x 17.)
    { t: beat(181), cells: 6.9, hold: [12.5, -3.1], w: 0.8 },
    { t: beat(185), cells: 6.6, hold: [12.25, -3.3], w: 0.85 },
    // The top of the bar he hangs under the vault while they wind up: already opening out for the fortissimo, so the
    // pull-back is one even move over the whole bar.
    { t: beat(187), cells: 7.6, hold: [11.3, -3.6], w: 0.9 },
    // The fortissimo: opening out as he comes down onto the skin, wide on the blow: the great drum whole, the skin
    // bursting, its drummers thrown off their galleries, the war-drum's pair still pounding, the pit's mouth under it.
    // Then down the pit after him, only tilting and a little closer, onto the heart's wide seam (`HEART_SHOT`: the
    // machine he falls into already in the frame).
    // (A little of the follow in it, so the frame is already going down with him on the blow, not stopped there.)
    { t: FF, cells: 9.0, hold: [10.6, -2.0], w: 0.8 },
    { t: slot.end, cells: HEART_SHOT.cells, hold: [HEART_SHOT.world[0] - 46, HEART_SHOT.world[1] - 25], w: HEART_SHOT.w },
  ],
)
