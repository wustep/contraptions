import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { drawHeptapod, drawInk, inkAt, inkRing, mix, rgba, type Ring } from '../cast'
import { ring } from './ink'
import { drawRail } from './words'
import { frame, hash } from '../kit'
import { SHELL, TENT, VALLEY } from '../worlds'
import {
  BOARD,
  BOARDS,
  CEILING,
  FAR,
  FLOOR,
  FRANTIC,
  GT,
  GX,
  JAMB,
  LINTEL,
  LOGOS,
  PLATE,
  T,
  TOUCHES,
  WEAPON,
  abbott,
  costello,
  flipAt,
  flashAt,
  ianAt,
  lerp,
  lightAt,
  louiseAt,
  plateAt,
  smooth,
  step,
  suitOf,
  wakeAt,
  type Stand,
  type Writer,
} from './plan'

/**
 * The chamber as it stands at show time `t`: the room, the glass and the white beyond it, the heptapods, their ink, the
 * lexicon over the humans' heads, the board, the suits, the charge, the blast and what it leaves. Drawn in the shell's
 * world cells times `k`, straight onto the canvas (as `cast.ts` draws), inside save/restore.
 */

type Ctx = CanvasRenderingContext2D
const ctxOf = (p: p5): Ctx => p.drawingContext as Ctx
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export { lightAt }

/* ------------------------------------------------------------------ their limbs */

interface Grip {
  t0: number
  t1: number
  to: Pt
  open: number
  lead: number
  palm: number
}
interface Key {
  t: number
  u: number
  to: Pt
  open: number
  palm: number
}

export { ring }

/**
 * The hand: its reach from its centre (cells), about three times her size; and where its centre is when it presses the
 * glass, exactly opposite her at her height, its nearest fingers' pads flat on the glass where she is.
 */
export const PALM_R = 0.4
export const PALM: Pt = [FAR + 0.36, -0.02]
/** Where Abbott strikes the glass in the bomb. */
const SLAM: Pt = [FAR + 0.95, -1.5]

/** A ring made jagged: Abbott's frantic writing. */
const jagged = (base: Ring): Ring => ({
  ...base,
  r: (a) => base.r(a) + 0.09 * Math.sin(9 * a + 1.3) + 0.06 * Math.sin(14 * a + 0.4) + 0.05 * Math.sign(Math.sin(5 * a)),
  w: (a) => base.w(a) * (0.75 + 0.5 * Math.abs(Math.sin(7 * a))),
})
export const FRANTIC_RING = jagged(inkRing(FRANTIC.seed))

function gripsOf(who: Writer): Grip[] {
  const out: Grip[] = []
  for (const l of LOGOS) {
    if (l.who !== who) continue
    const rg = ring(l.seed)
    out.push({ t0: l.born, t1: l.born + l.form, to: inkAt(rg, l.c[0], l.c[1], l.R, rg.start), open: 0, lead: Math.min(0.9, 0.35 + l.form * 0.3), palm: PALM_R })
  }
  if (who === 'abbott') {
    // The hand comes: raised over her as she goes to the glass, then down onto it, where she is.
    out.push({ t0: T.palm - 1.25, t1: T.palm - 0.77, to: [9.3, -2.7], open: 0.45, lead: 1.2, palm: PALM_R })
    out.push({ t0: T.palm, t1: T.palm + 2.3, to: PALM, open: 1, lead: 0.77, palm: PALM_R })
    const w = ring(WEAPON.seed)
    out.push({ t0: WEAPON.born, t1: WEAPON.born + 1.3, to: inkAt(w, WEAPON.c[0], WEAPON.c[1], WEAPON.R, w.start), open: 0, lead: 0.5, palm: PALM_R })
    out.push({ t0: T.slam, t1: T.slam + 0.45, to: SLAM, open: 1, lead: 0.32, palm: 0.55 })
    out.push({ t0: T.slam + 1.3, t1: T.slam + 1.9, to: [SLAM[0] + 0.2, SLAM[1] - 1.1], open: 1, lead: 0.3, palm: 0.55 })
    FRANTIC.bursts.forEach((bt, i) => {
      const a = FRANTIC_RING.start + (i % 2 === 0 ? 1 : -1) * (0.4 + i * 0.7)
      out.push({ t0: bt, t1: bt + 0.45, to: inkAt(FRANTIC_RING, FRANTIC.c[0], FRANTIC.c[1], FRANTIC.R, a), open: 0, lead: 0.28, palm: PALM_R })
    })
  }
  return out.sort((a, b) => a.t0 - b.t0)
}
function keysOf(grips: Grip[]): Key[] {
  const keys: Key[] = []
  grips.forEach((g, i) => {
    const next = grips[i + 1]
    const last = keys[keys.length - 1]
    if (!last || last.u === 0) keys.push({ t: g.t0 - g.lead, u: 0, to: g.to, open: 0, palm: g.palm })
    keys.push({ t: g.t0, u: 1, to: g.to, open: g.open, palm: g.palm })
    keys.push({ t: g.t1, u: 1, to: g.to, open: g.open, palm: g.palm })
    if (!next || next.t0 - next.lead - g.t1 > 0.9) keys.push({ t: g.t1 + 0.9, u: 0, to: g.to, open: 0, palm: g.palm })
  })
  return keys
}
const KEYS: Record<Writer, Key[]> = { abbott: keysOf(gripsOf('abbott')), costello: keysOf(gripsOf('costello')) }
function reachOf(who: Writer, t: number): { to: Pt; u: number; open: number; palm: number } | undefined {
  const keys = KEYS[who]
  if (!keys.length || t <= keys[0].t) return undefined
  let i = 0
  while (i + 1 < keys.length && keys[i + 1].t <= t) i++
  const a = keys[i]
  const b = keys[Math.min(i + 1, keys.length - 1)]
  const e = b.t > a.t ? smooth(t, a.t, b.t) : 1
  const u = lerp(a.u, b.u, e)
  if (u <= 0.001) return undefined
  return { to: [lerp(a.to[0], b.to[0], e), lerp(a.to[1], b.to[1], e)], u, open: lerp(a.open, b.open, e), palm: lerp(a.palm, b.palm, e) }
}

/* ------------------------------------------------------------------ the set */

export function drawChamber(p: p5, k: number, t: number): void {
  const ctx = ctxOf(p)
  const f = frame(p, k)
  const wake = clamp01(wakeAt(t))
  ctx.save()
  // Everything first dark: the deep of the shell.
  ctx.fillStyle = SHELL.dark
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  if (f.x1 > GX) beyond(p, ctx, k, t, f, wake)
  room(ctx, k, t, f, wake)
  glass(ctx, k, t, f, wake)
  floor(ctx, k, t, f, wake)
  beam(ctx, k, t, f)
  board(p, ctx, k, t)
  drawRail(p, ctx, k, t)
  fallenSuits(ctx, k, t)
  charge(ctx, k, t)
  shards(ctx, k, t)
  ctx.restore()
}

/** Drawn over the balls: the suits they wear, the flash, the dust, the white coming in. */
export function drawChamberOver(p: p5, k: number, t: number): void {
  const ctx = ctxOf(p)
  const f = frame(p, k)
  ctx.save()
  wornSuits(ctx, k, t)
  dust(ctx, k, t, f)
  pour(ctx, k, t, f)
  const fl = flashAt(t)
  if (fl > 0.002) {
    // The blast: the whole frame white for an instant, burning from the charge.
    ctx.fillStyle = rgba(SHELL.glow, 0.97 * fl)
    ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  }
  // The white coming in through the broken glass, over everything, whitening the dust into the veil.
  const flood = smooth(t, T.flood - 0.4, T.fog)
  if (flood > 0.001 && t < T.fog + 2) {
    const reach = 3 + 14 * flood
    const g = ctx.createLinearGradient(FAR * k, 0, (FAR - reach) * k, 0)
    g.addColorStop(0, rgba(SHELL.glow, 0.85 * flood))
    g.addColorStop(1, rgba(SHELL.glow, 0.12 * flood))
    ctx.fillStyle = g
    ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  }
  ctx.restore()
}

type Frame = ReturnType<typeof frame>

/** The heptapods' side: their white, the fog moving in it, the two of them, their ink. */
function beyond(p: p5, ctx: Ctx, k: number, t: number, f: Frame, wake: number): void {
  // Once the glass is broken its hole shows the white too.
  const x0 = (t >= T.blast ? GX : FAR) * k
  const x1 = (f.x1 + 1) * k
  const y0 = (f.y0 - 1) * k
  const y1 = (f.y1 + 1) * k
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, x1 - x0, y1 - y0)
  ctx.clip()
  // The white: brightest low and near the glass, greyer up in the height and far back.
  const lit = (c: string, a: number) => mix(SHELL.dark, c, clamp01(wake * a))
  const g = ctx.createLinearGradient(0, -12 * k, 0, 4 * k)
  g.addColorStop(0, lit(SHELL.mist, 0.75))
  g.addColorStop(0.45, lit(SHELL.fogLit, 1))
  g.addColorStop(0.8, lit(SHELL.glow, 1))
  g.addColorStop(1, lit(SHELL.screen, 1))
  ctx.fillStyle = g
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  const near = ctx.createLinearGradient(x0, 0, (FAR + 7) * k, 0)
  near.addColorStop(0, rgba(SHELL.screen, 0.3 * wake))
  near.addColorStop(1, rgba(SHELL.screen, 0))
  ctx.fillStyle = near
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  // Fog drifting in long soft banks.
  // It lights from below first, like a dawn in the fog: the height stays dark a little longer.
  const dawn = ctx.createLinearGradient(0, -11 * k, 0, 1 * k)
  const late = clamp01(1 - wake) * 0.85
  dawn.addColorStop(0, rgba(SHELL.dark, late))
  dawn.addColorStop(1, rgba(SHELL.dark, 0))
  ctx.fillStyle = dawn
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  for (let i = 0; i < 6; i++) {
    const by = (-8.5 + i * 1.9 + 0.5 * Math.sin(t * 0.07 + i * 1.7)) * k
    const h = (1.1 + 0.6 * hash(i, 3, 5)) * k
    const bank = ctx.createLinearGradient(0, by - h, 0, by + h)
    const a = (0.06 + 0.05 * hash(i, 7, 1)) * wake
    bank.addColorStop(0, rgba(SHELL.mist, 0))
    bank.addColorStop(0.5, rgba(SHELL.mist, a))
    bank.addColorStop(1, rgba(SHELL.mist, 0))
    ctx.fillStyle = bank
    ctx.fillRect(x0, by - h, x1 - x0, 2 * h)
  }
  // The two of them, Costello further back.
  if (wake > 0.05) {
    heptapod(p, ctx, k, t, costello(t), 2, 'costello', wake, SHELL.heptapod)
    heptapod(p, ctx, k, t, abbott(t), 1, 'abbott', wake, SHELL.heptapodDark)
  }
  // Fog in front of them, low: they stand in it. It holds its last on down to the frame's foot, which a frame taller
  // than 16:9 sees: stopped three cells down, its edge was a hard line across the white.
  const low = ctx.createLinearGradient(0, 0.25 * k, 0, 3 * k)
  low.addColorStop(0, rgba(SHELL.glow, 0))
  low.addColorStop(1, rgba(SHELL.glow, 0.85 * wake))
  ctx.fillStyle = low
  ctx.fillRect(x0, 0.25 * k, x1 - x0, Math.max(3 * k, y1 - 0.25 * k))
  // Their ink, on the glass: what is being written, and what is waiting to be read.
  for (const l of LOGOS) {
    if (t < l.born || t >= l.slotIn) continue
    const u = (t - l.born) / l.form
    drawInk(p, k, l.c[0], l.c[1], l.R, ring(l.seed), u, { color: SHELL.ink, bloom: smooth(t, l.born + l.form, l.born + l.form + 2.5) })
  }
  weapon(p, ctx, k, t)
  frantic(p, k, t)
  ctx.restore()
}

function heptapod(p: p5, ctx: Ctx, k: number, t: number, st: Stand, seed: number, who: Writer, wake: number, color: string): void {
  if (st.alpha <= 0.01) return
  ctx.save()
  ctx.globalAlpha *= st.alpha * clamp01(wake * 1.4)
  drawHeptapod(p, k, st.x, st.y, st.s, {
    t,
    fog: st.fog,
    fogColor: mix(SHELL.dark, SHELL.glow, wake),
    color,
    lean: st.lean,
    face: -1,
    seed,
    reach: reachOf(who, t),
  })
  ctx.restore()
}

/** "Weapon": a ring closed hard and a spike flung out of it at her: it strikes the glass before her face. */
export const WEAPON_HIT: Pt = [FAR, -0.1]
export const weaponFling = (t: number): number => step(t - (WEAPON.born + WEAPON.form * 0.75), 18, 0.3)
function weapon(p: p5, ctx: Ctx, k: number, t: number): void {
  if (t < WEAPON.born || t > T.out + 1) return
  const rg = ring(WEAPON.seed)
  const u = (t - WEAPON.born) / WEAPON.form
  drawInk(p, k, WEAPON.c[0], WEAPON.c[1], WEAPON.R, rg, u, { color: SHELL.ink, tendrils: 0 })
  const fling = weaponFling(t)
  if (fling <= 0) return
  const ang = Math.atan2(WEAPON_HIT[1] - WEAPON.c[1], WEAPON_HIT[0] - WEAPON.c[0])
  const dx = Math.cos(ang)
  const dy = Math.sin(ang)
  const root = inkAt(rg, WEAPON.c[0], WEAPON.c[1], WEAPON.R, ang)
  const len = (Math.hypot(WEAPON_HIT[0] - root[0], WEAPON_HIT[1] - root[1]) + 0.3) * fling
  // A stroke of their ink, not a cut-out: it starts inside the ring's band and leaves it as a heavy blot (so it grows
  // out of the ring, with no stub standing off its far side), bends a little, and tapers to a point, with the rings'
  // own bleed round it. Every stroke turns the same way round, so the spike and its barbs fill as one shape.
  const centre = (from: Pt, dir: Pt, l: number, curl: number, q: number): Pt => [
    from[0] + dir[0] * l * q - dir[1] * curl * l * q * q,
    from[1] + dir[1] * l * q + dir[0] * curl * l * q * q,
  ]
  const stroke = (from: Pt, dir: Pt, l: number, curl: number, w: number) => {
    const m = 20
    const left: Pt[] = []
    const right: Pt[] = []
    for (let i = 0; i <= m; i++) {
      const q = i / m
      const [cx, cy] = centre(from, dir, l, curl, q)
      const tx = dir[0] - dir[1] * curl * 2 * q
      const ty = dir[1] + dir[0] * curl * 2 * q
      const tl = Math.hypot(tx, ty) || 1
      // Full at the root, a little swell just out of it, and a long taper to the point.
      const hw = (w * Math.pow(1 - q, 0.85) * (1 + 0.18 * Math.exp(-((q - 0.12) ** 2) / 0.006))) / 2
      left.push([(cx - (ty / tl) * hw) * k, (cy + (tx / tl) * hw) * k])
      right.push([(cx + (ty / tl) * hw) * k, (cy - (tx / tl) * hw) * k])
    }
    ctx.moveTo(left[0][0], left[0][1])
    for (const q of left) ctx.lineTo(q[0], q[1])
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1])
    ctx.closePath()
  }
  const dir: Pt = [dx, dy]
  // Bent like a thorn: straight, out of a ring, it read as the handle of a magnifying glass.
  const CURL = -0.2
  const w0 = WEAPON.R * rg.w(ang) * 2.3
  const from: Pt = [root[0] - dx * w0 * 0.3, root[1] - dy * w0 * 0.3]
  const reach = len + w0 * 0.3
  // Barbs thrown back off it and hooked: it is hard all over.
  const barbs = [
    { at: 0.4, side: 1, l: 0.55 },
    { at: 0.62, side: -1, l: 0.42 },
    { at: 0.8, side: 1, l: 0.3 },
  ].map((b) => {
    const bdx = dx * -0.55 - dy * b.side
    const bdy = dy * -0.55 + dx * b.side
    const bl = Math.hypot(bdx, bdy)
    return { from: centre(from, dir, reach, CURL, b.at), dir: [bdx / bl, bdy / bl] as Pt, l: b.l * fling, curl: 0.3 * b.side, w: w0 * 0.75 * Math.pow(1 - b.at, 0.85) }
  })
  for (const [widen, alpha] of [[1.9, 0.12], [1.35, 0.22], [1, 0.97]] as const) {
    ctx.beginPath()
    stroke(from, dir, reach, CURL, w0 * widen)
    for (const b of barbs) stroke(b.from, b.dir, b.l, b.curl, b.w * widen)
    ctx.fillStyle = rgba(SHELL.ink, alpha)
    ctx.fill()
  }
}

/** Abbott's jagged writing before the blast: it grows in bursts, on the beats. */
function frantic(p: p5, k: number, t: number): void {
  if (t < FRANTIC.bursts[0] || t > T.blast + 3) return
  let u = 0
  FRANTIC.bursts.forEach((bt, i) => {
    u += 0.26 * smooth(t, bt, bt + 0.35) * (i === FRANTIC.bursts.length - 1 ? 0.9 : 1)
  })
  // The blast tears it apart: it spreads and pales into the fog.
  const fade = smooth(t, T.blast, T.blast + 1.6)
  drawInk(p, k, FRANTIC.c[0], FRANTIC.c[1], FRANTIC.R, FRANTIC_RING, u, { color: SHELL.ink, fade, tendrils: 0 })
}

/** The room: the tall chamber's back wall and its dark overhead, the low tunnel they came up by, the light off the glass. */
function room(ctx: Ctx, k: number, t: number, f: Frame, wake: number): void {
  const x0 = (f.x0 - 1) * k
  const xg = GX * k
  const top = (f.y0 - 1) * k
  const fl = FLOOR * k
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, top, xg - x0, (f.y1 + 1) * k - top)
  ctx.clip()
  // The back wall, darker as it goes up into the dark.
  const g = ctx.createLinearGradient(0, CEILING * k, 0, fl)
  g.addColorStop(0, SHELL.dark)
  g.addColorStop(0.55, mix(SHELL.dark, SHELL.wall, 0.8))
  g.addColorStop(1, SHELL.wall)
  ctx.fillStyle = g
  ctx.fillRect(x0, top, xg - x0, fl - top)
  // The stone: broad soft upright bands, a little lighter and darker.
  for (let i = -8; i < 8; i++) {
    const bx = (i * 1.7 + 0.6 * hash(i, 2, 9)) * k
    const bw = (0.5 + 0.9 * hash(i, 4, 9)) * k
    const a = 0.045 + 0.05 * hash(i, 6, 9)
    const band = ctx.createLinearGradient(bx - bw, 0, bx + bw, 0)
    const c = hash(i, 8, 9) > 0.5 ? SHELL.wallLit : SHELL.dark
    band.addColorStop(0, rgba(c, 0))
    band.addColorStop(0.5, rgba(c, a))
    band.addColorStop(1, rgba(c, 0))
    ctx.fillStyle = band
    ctx.fillRect(bx - bw, CEILING * k, 2 * bw, fl - CEILING * k)
  }
  // The tunnel mouth at the left: low and deep, and the faint cool light still coming up it from the belly as they
  // come in, which they leave behind.
  if (f.x0 < JAMB) {
    const deep = ctx.createLinearGradient(JAMB * k, 0, (JAMB - 5) * k, 0)
    deep.addColorStop(0, mix(SHELL.dark, SHELL.wall, 0.45))
    deep.addColorStop(1, SHELL.dark)
    ctx.fillStyle = deep
    ctx.fillRect(x0, LINTEL * k, JAMB * k - x0, fl - LINTEL * k)
    // The lintel: a heavy stone over the mouth.
    ctx.fillStyle = mix(SHELL.wall, SHELL.wallLit, 0.3)
    ctx.fillRect(x0, (LINTEL - 0.55) * k, JAMB * k - x0 + 0.3 * k, 0.55 * k)
    ctx.fillStyle = mix(SHELL.wall, SHELL.wallLit, 0.15)
    ctx.fillRect(JAMB * k, (LINTEL - 0.55) * k, 0.3 * k, fl - (LINTEL - 0.55) * k)
    const behind = 0.22 * (1 - smooth(t, T.in, T.in + 4.5)) + 0.05
    const tg = ctx.createLinearGradient(JAMB * k, 0, (JAMB - 6) * k, 0)
    tg.addColorStop(0, rgba(SHELL.mist, 0.04 + 0.35 * behind))
    tg.addColorStop(1, rgba(SHELL.mist, 0))
    ctx.fillStyle = tg
    ctx.fillRect((JAMB - 6) * k, LINTEL * k, 6 * k, fl - LINTEL * k)
    // The lintel's underside and the jamb's edge, caught by the glass's light.
    const edge = 0.1 + 0.4 * wake
    ctx.fillStyle = rgba(SHELL.wallLit, edge)
    ctx.fillRect(JAMB * k - 0.06 * k, LINTEL * k, 0.06 * k, fl - LINTEL * k)
    ctx.fillStyle = rgba(SHELL.wallLit, edge * 0.6)
    ctx.fillRect(x0, LINTEL * k - 0.05 * k, JAMB * k - x0, 0.05 * k)
  }
  // The glass's light on the wall: strongest low and near it.
  if (wake > 0.01) {
    // Reaching far down the room even while it is still waking: the first light comes to them from off the frame.
    const reachOut = Math.sqrt(wake)
    const cx = GX * k
    const cy = -2.2 * k
    const r = 12 * k
    const lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    lg.addColorStop(0, rgba(mix(SHELL.wallLit, SHELL.mist, 0.35), 0.75 * reachOut))
    lg.addColorStop(0.3, rgba(SHELL.wallLit, 0.5 * reachOut))
    lg.addColorStop(0.65, rgba(SHELL.wallLit, 0.2 * reachOut))
    lg.addColorStop(1, rgba(SHELL.wallLit, 0))
    ctx.fillStyle = lg
    ctx.fillRect(Math.max(x0, cx - r), cy - r, Math.min(r, cx - x0), 2 * r)
  }
  ctx.restore()
}

/**
 * The glass: a pane standing from the floor up into the dark, a faint pale sheet a little greyer than the white behind
 * it, with a bright edge on our side and a fine grey one on theirs, so there is glass between them. The rail runs in
 * through a slot in it. Where she touches it, it brightens; where the hand presses it opposite her, a soft warm print.
 */
function glass(ctx: Ctx, k: number, t: number, f: Frame, wake: number): void {
  const top = Math.max(CEILING - 2, f.y0 - 1)
  const broken = t >= T.blast
  const hole = broken ? HOLE_TOP : FLOOR
  const gone = smooth(t, T.flood, T.flood + 0.9)
  const x = GX * k
  const w = (FAR - GX) * k
  const slab = clamp01(wake * 2.4)
  const sheet = mix(SHELL.wall, mix(SHELL.screenEdge, SHELL.glow, 0.4), slab)
  ctx.save()
  ctx.globalAlpha *= 1 - gone
  ctx.fillStyle = sheet
  const bottom = broken ? hole : FLOOR
  if (!broken) ctx.fillRect(x, top * k, w, (FLOOR - top) * k)
  else {
    // Broken: what is left hangs from above with a torn edge.
    ctx.beginPath()
    ctx.moveTo(x, top * k)
    ctx.lineTo(x + w, top * k)
    const n = 7
    for (let i = n; i >= 0; i--) {
      const u = i / n
      const yy = hole + 0.9 * (hash(i, 17, 3) - 0.5) + (i === 0 || i === n ? 0.6 : 0)
      ctx.lineTo(x + w * u, yy * k)
    }
    ctx.closePath()
    ctx.fill()
    // A stub at the foot.
    ctx.beginPath()
    ctx.moveTo(x, FLOOR * k)
    ctx.lineTo(x + w, FLOOR * k)
    ctx.lineTo(x + w * 0.7, (FLOOR - 0.5) * k)
    ctx.lineTo(x + w * 0.2, (FLOOR - 0.28) * k)
    ctx.closePath()
    ctx.fill()
  }
  // Its sheen, and its two faces: a bright line on ours, a fine grey one on theirs.
  if (slab > 0.02) {
    const lineTop = top
    const lineBottom = broken ? bottom - 0.5 : FLOOR
    const sh = ctx.createLinearGradient(x, 0, x + w, 0)
    sh.addColorStop(0, rgba(SHELL.glow, 0.45 * slab))
    sh.addColorStop(0.45, rgba(SHELL.glow, 0))
    sh.addColorStop(1, rgba(SHELL.mist, 0.12 * slab))
    ctx.fillStyle = sh
    ctx.fillRect(x, lineTop * k, w, (lineBottom - lineTop) * k)
    ctx.fillStyle = rgba(SHELL.glow, 0.95 * slab)
    ctx.fillRect(x - 0.012 * k, lineTop * k, 0.03 * k, (lineBottom - lineTop) * k)
    ctx.fillStyle = rgba(SHELL.mist, 0.6 * slab)
    ctx.fillRect(x + w - 0.018 * k, lineTop * k, 0.018 * k, (lineBottom - lineTop) * k)
  }
  // The light off its face on our side: a soft band, not a line.
  const face = ctx.createLinearGradient(x - 0.3 * k, 0, x, 0)
  face.addColorStop(0, rgba(SHELL.glow, 0))
  face.addColorStop(1, rgba(SHELL.glow, 0.22 * slab))
  ctx.fillStyle = face
  ctx.fillRect(x - 0.3 * k, top * k, 0.3 * k, ((broken ? bottom - 0.5 : FLOOR) - top) * k)
  // Where she touches, the glass brightens and slowly lets go.
  if (!broken) {
    let touch = 0
    for (const tt of [...TOUCHES, WEAPON.born + WEAPON.form * 0.75 + 0.1]) {
      const u = t - tt
      if (u >= 0) touch = Math.max(touch, Math.exp(-u / 1.3) * Math.min(1, u / 0.08))
    }
    if (touch > 0.01) {
      const cy = -0.15 * k
      const h = 1.6 * k
      const tg = ctx.createLinearGradient(0, cy - h, 0, cy + h)
      tg.addColorStop(0, rgba(SHELL.glow, 0))
      tg.addColorStop(0.5, rgba(SHELL.glow, 0.9 * touch))
      tg.addColorStop(1, rgba(SHELL.glow, 0))
      ctx.fillStyle = tg
      ctx.fillRect(x - 0.12 * k, cy - h, w + 0.12 * k, 2 * h)
    }
    // The hand's print: where its pads meet the glass opposite her, a soft warm light blooms on the pane between them,
    // and stays while it presses.
    const print = smooth(t, T.palm - 0.05, T.palm + 0.7) - smooth(t, T.palm + 2.2, T.palm + 3.6)
    if (print > 0.01) {
      ctx.save()
      ctx.translate((GX + GT / 2) * k, PALM[1] * k)
      ctx.scale(0.6, 1)
      const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.6 * k)
      pg.addColorStop(0, rgba(VALLEY.floodlight, 0.85 * print))
      pg.addColorStop(0.45, rgba(VALLEY.floodlight, 0.45 * print))
      pg.addColorStop(1, rgba(VALLEY.floodlight, 0))
      ctx.fillStyle = pg
      ctx.fillRect(-0.6 * k, -0.6 * k, 1.2 * k, 1.2 * k)
      ctx.restore()
    }
  }
  // The blast: cracks run up the pane from the hole, outward from where the charge was.
  if (broken) {
    const cr = smooth(t, T.blast, T.blast + 0.25)
    ctx.strokeStyle = rgba(SHELL.mist, 0.85)
    ctx.lineWidth = 0.022 * k
    ctx.lineJoin = 'round'
    for (let c = 0; c < 4; c++) {
      ctx.beginPath()
      let cx = GX + GT * (0.2 + 0.6 * hash(c, 1, 77))
      let cy = HOLE_TOP + 0.3
      ctx.moveTo(cx * k, cy * k)
      const len = (2.5 + 3 * hash(c, 2, 77)) * cr
      for (let s = 0; s < 8; s++) {
        cy -= len / 8
        cx = Math.max(GX + 0.03, Math.min(FAR - 0.03, cx + (hash(c, s, 78) - 0.5) * 0.18))
        ctx.lineTo(cx * k, cy * k)
      }
      ctx.stroke()
    }
  }
  // The slam: the whole slab shivers bright.
  const slam = t >= T.slam && t < T.blast ? Math.exp(-(t - T.slam) / 0.35) : 0
  if (slam > 0.01) {
    ctx.fillStyle = rgba(SHELL.glow, 0.8 * slam)
    ctx.fillRect(x - 0.1 * k, top * k, w + 0.2 * k, (FLOOR - top) * k)
  }
  ctx.restore()
  void f
}

/** The floor: dark stone, the glass's light lying along it, their long shadows away from the glass. */
function floor(ctx: Ctx, k: number, t: number, f: Frame, wake: number): void {
  const x0 = (f.x0 - 1) * k
  const xg = FAR * k
  const fl = FLOOR * k
  const bottom = (f.y1 + 1) * k
  ctx.fillStyle = SHELL.floor
  ctx.fillRect(x0, fl, xg - x0, bottom - fl)
  // Its lip, lit toward the glass.
  const lip = ctx.createLinearGradient(GX * k, 0, (GX - 9) * k, 0)
  lip.addColorStop(0, rgba(SHELL.fogLit, 0.55 * wake))
  lip.addColorStop(1, rgba(SHELL.wallLit, 0.12 * wake))
  ctx.fillStyle = lip
  ctx.fillRect(x0, fl, xg - x0, 0.045 * k)
  // The glass on the polished floor.
  const refl = ctx.createLinearGradient(xg, 0, (GX - 4.5) * k, 0)
  refl.addColorStop(0, rgba(SHELL.fogLit, 0.24 * wake))
  refl.addColorStop(1, rgba(SHELL.fogLit, 0))
  const rh = ctx.createLinearGradient(0, fl, 0, fl + 0.9 * k)
  ctx.fillStyle = refl
  ctx.save()
  ctx.beginPath()
  ctx.rect((GX - 4.5) * k, fl, 4.5 * k + (FAR - GX) * k, 0.9 * k)
  ctx.clip()
  ctx.fillRect((GX - 4.5) * k, fl, 4.5 * k + (FAR - GX) * k, 0.9 * k)
  rh.addColorStop(0, rgba(SHELL.floor, 0))
  rh.addColorStop(1, rgba(SHELL.floor, 1))
  ctx.fillStyle = rh
  ctx.fillRect((GX - 4.5) * k, fl, 4.5 * k + (FAR - GX) * k, 0.9 * k)
  ctx.restore()
  // Under the glass, where the floor ends, the white goes on down.
  // The glass's first light, on the chord they come in on: it runs down the polished floor from the far end and
  // comes to their feet.
  if (t >= T.kindle && t < T.wake + 3) {
    const run = smooth(t, T.kindle, T.kindle + 1.7)
    const front = GX - 12 * run
    const a = 0.5 * (1 - 0.6 * smooth(t, T.wake, T.wake + 2.5))
    const lg = ctx.createLinearGradient(GX * k, 0, front * k, 0)
    lg.addColorStop(0, rgba(SHELL.fogLit, a))
    lg.addColorStop(0.8, rgba(SHELL.fogLit, a * 0.55))
    lg.addColorStop(1, rgba(SHELL.fogLit, 0))
    ctx.fillStyle = lg
    ctx.fillRect(front * k, fl, (GX - front) * k, 0.05 * k)
    // Its sheen on the stone below the lip, fading down.
    ctx.save()
    for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = 0.3 * (1 - i / 6) ** 2
      ctx.fillRect(front * k, fl + (0.05 + i * 0.1) * k, (GX - front) * k, 0.1 * k)
    }
    ctx.restore()
  }
  // Shadows, thrown back from the glass.
  if (wake > 0.05) {
    for (const at of [louiseAt(t), ianAt(t)]) {
      if (!at) continue
      const lift = Math.max(0, -at[1])
      const a = 0.6 * Math.sqrt(lightAt(at[0], t)) * Math.exp(-lift / 0.8) * (t < T.wake ? smooth(t, T.kindle + 0.8, T.kindle + 1.8) : 1)
      if (a < 0.01) continue
      const len = 0.45 + 0.16 * Math.max(0, GX - at[0]) + lift * 0.4
      const sx = at[0] * k
      const sg = ctx.createLinearGradient(sx, 0, sx - len * k, 0)
      sg.addColorStop(0, rgba(SHELL.dark, a))
      sg.addColorStop(1, rgba(SHELL.dark, 0))
      ctx.fillStyle = sg
      ctx.beginPath()
      ctx.ellipse(sx - len * 0.5 * k, fl + 0.02 * k, len * 0.55 * k, 0.05 * k, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** After the blast: the white through the hole in the glass, lying in a long wedge on the wall and the floor. */
export const HOLE_TOP = -4.7
function beam(ctx: Ctx, k: number, t: number, f: Frame): void {
  if (t < T.blast) return
  const a = 0.26 * clamp01(wakeAt(t)) * smooth(t, T.blast, T.blast + 0.25)
  if (a < 0.003) return
  const reach = 11
  ctx.save()
  // Soft-edged: the same wedge many times, each a little wider, so its edges have no line.
  const layers = 9
  for (let i = 0; i < layers; i++) {
    const spread = i * 0.26
    ctx.beginPath()
    ctx.moveTo(GX * k, (HOLE_TOP - spread * 0.4) * k)
    ctx.lineTo(GX * k, FLOOR * k)
    ctx.lineTo((GX - reach) * k, (FLOOR + 0.6 + spread) * k)
    ctx.lineTo((GX - reach) * k, (HOLE_TOP + 2.4 - spread * 1.6) * k)
    ctx.closePath()
    const g = ctx.createLinearGradient(GX * k, 0, (GX - reach) * k, 0)
    const ai = (a * 1.3) / layers
    g.addColorStop(0, rgba(SHELL.glow, ai))
    g.addColorStop(0.5, rgba(SHELL.fogLit, ai * 0.4))
    g.addColorStop(1, rgba(SHELL.fogLit, 0))
    ctx.fillStyle = g
    ctx.fill()
  }
  ctx.restore()
  void f
}

/** The heptapods' white coming in through the broken glass: a slow bank along the floor, over them. */
function pour(ctx: Ctx, k: number, t: number, f: Frame): void {
  if (t < T.blast + 0.3 || t > T.fog + 2) return
  const u = smooth(t, T.blast + 0.3, T.fog)
  const front = FAR - (1.5 + 9 * u)
  const top = HOLE_TOP * (0.35 + 0.35 * u)
  const a = 0.5 + 0.35 * smooth(t, T.flood, T.fog)
  ctx.save()
  const layers = 7
  for (let layer = 0; layer < layers; layer++) {
    const lift = layer * 0.2
    const al = (a * 1.1) / layers
    const gx = ctx.createLinearGradient(FAR * k, 0, (front - layer * 0.35) * k, 0)
    gx.addColorStop(0, rgba(SHELL.glow, al))
    gx.addColorStop(0.7, rgba(SHELL.fogLit, al * 0.45))
    gx.addColorStop(1, rgba(SHELL.fogLit, 0))
    ctx.fillStyle = gx
    ctx.beginPath()
    ctx.moveTo(FAR * k, (top - lift) * k)
    const n = 16
    for (let i = 0; i <= n; i++) {
      const v = i / n
      const x = FAR + (front - layer * 0.35 - FAR) * v
      const y = top - lift + (FLOOR - 0.15 - top + lift * 0.6) * v ** 0.7 + 0.18 * Math.sin(v * 7 + t * 0.9 + layer)
      ctx.lineTo(x * k, y * k)
    }
    ctx.lineTo((front - layer * 0.35) * k, (FLOOR + 0.3) * k)
    ctx.lineTo(FAR * k, (FLOOR + 0.3) * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  void f
}

/** The board: it lies flat on the floor until a ball presses the plate, then flips up to stand, facing the glass. */
function board(p: p5, ctx: Ctx, k: number, t: number): void {
  const light = 0.25 + 0.75 * lightAt(PLATE, t)
  // The plate in the floor.
  const press = plateAt(t)
  ctx.fillStyle = mix(SHELL.dark, SHELL.wallLit, 0.35 + 0.4 * light)
  ctx.fillRect((PLATE - 0.28) * k, (FLOOR + 0.012 + 0.025 * press) * k, 0.56 * k, 0.07 * k)
  ctx.fillStyle = SHELL.dark
  ctx.fillRect((PLATE - 0.3) * k, FLOOR * k, 0.02 * k, 0.1 * k)
  ctx.fillRect((PLATE + 0.28) * k, FLOOR * k, 0.02 * k, 0.1 * k)
  // The board, turned up toward us about its foot: how tall it looks is how far up it stands.
  const flip = flipAt(t)
  const up = Math.sin(Math.min(Math.PI * 0.62, flip * (Math.PI / 2)))
  const w = BOARD.w * k
  const legs = BOARD.legs * up
  const h = Math.max(0.035, BOARD.h * up)
  const x0 = (BOARD.x - BOARD.w / 2) * k
  const face = 0.35 + 0.65 * up
  ctx.save()
  // Its legs, and the board on them.
  ctx.fillStyle = mix(SHELL.dark, SHELL.wallLit, 0.4 + 0.5 * light)
  ctx.fillRect(x0 + w * 0.14, (FLOOR - legs) * k, 0.045 * k, legs * k)
  ctx.fillRect(x0 + w * 0.86 - 0.045 * k, (FLOOR - legs) * k, 0.045 * k, legs * k)
  const top = FLOOR - legs - h
  ctx.fillStyle = mix(SHELL.dark, SHELL.board, (0.25 + 0.75 * light) * face)
  ctx.fillRect(x0, top * k, w, h * k)
  ctx.fillStyle = rgba(SHELL.dark, 0.3)
  ctx.fillRect(x0, (top + h) * k - 0.035 * k * up, w, 0.035 * k * up)
  if (up > 0.25) {
    ctx.translate(BOARD.x * k, (top + h / 2) * k)
    ctx.scale(1, up)
    ctx.globalAlpha *= Math.min(1, (up - 0.25) / 0.35)
    marks(p, ctx, k, t, 0, light)
  }
  ctx.restore()
}

/** What is on the board: her marks, which become their rings as she learns. Never letters. */
function marks(p: p5, ctx: Ctx, k: number, t: number, cy: number, light: number): void {
  let n = 0
  BOARDS.forEach((bd, i) => {
    if (bd.t - 1.2 <= t) n = i
  })
  const ink = mix(SHELL.board, SHELL.marker, 0.25 + 0.75 * light)
  ctx.strokeStyle = ink
  ctx.lineWidth = 0.028 * k
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const scribble = (y: number, x0: number, x1: number, seed: number) => {
    ctx.beginPath()
    const m = 40
    for (let i = 0; i <= m; i++) {
      const u = i / m
      const x = x0 + (x1 - x0) * u
      const loop = Math.sin(u * 16 + seed) * 0.035 + Math.sin(u * 37 + seed * 2) * 0.015
      const dx = Math.cos(u * 16 + seed) * 0.018
      const px = (x + dx) * k
      const py = cy + (y + loop) * k
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
  }
  if (n === 0) {
    scribble(-0.12, -0.34, 0.3, 1)
    scribble(0.12, -0.34, 0.08, 4)
  } else if (n === 1) {
    scribble(-0.09, -0.34, 0.34, 2)
    scribble(0.13, -0.34, -0.06, 7)
  } else if (n === 2) {
    scribble(0, -0.34, -0.03, 3)
    drawInk(p, k, 0.19, cy / k, 0.15, ring(1021), 1, { color: ink, tendrils: 0 })
  } else if (n === BOARDS.length - 1) {
    // Her question, in their writing: two of her rings joined.
    drawInk(p, k, -0.13, cy / k, 0.16, ring(2201), 1, { color: ink, tendrils: 0.6 })
    drawInk(p, k, 0.13, cy / k, 0.15, ring(2214), 1, { color: ink, tendrils: 0.6 })
  } else {
    // Her own rings now.
    drawInk(p, k, 0, cy / k, 0.21, ring(2000 + n * 13), 1, { color: ink, tendrils: n > 4 ? 0.6 : 0 })
  }
}

/* ------------------------------------------------------------------ the suits */

const SUIT = { w: 0.46, h: 0.56 }
/** The suit's outline, whole or one half (side -1 left, 1 right), drawn about its foot (0, 0) in pixels. */
function suitPath(ctx: Ctx, k: number, side: 0 | -1 | 1): void {
  const w = SUIT.w * k
  const h = SUIT.h * k
  const n = 28
  ctx.beginPath()
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + (i / n) * Math.PI * 2
    // An egg, fuller low, flat at the foot.
    const v = Math.sin(a)
    const x = Math.cos(a) * (w / 2) * (1 + 0.08 * v)
    const y = -h / 2 - v * (h / 2)
    pts.push([x, Math.min(0, y)])
  }
  const keep = pts.filter(([x]) => side === 0 || Math.sign(x) === side || Math.abs(x) < 1e-6)
  keep.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  if (side !== 0) ctx.lineTo(0, 0)
  ctx.closePath()
}

/**
 * A suit worn round a ball whose centre is at (x, y) in cells of whatever frame the caller draws in, `light` 0 (in
 * the dark) to 1: for anyone who shows them in their suits before the chamber (the lift), so the suits do not appear at
 * the cut. Draw it over the balls.
 */
export function drawSuit(p: p5, k: number, x: number, y: number, light = 1): void {
  const ctx = ctxOf(p)
  ctx.save()
  ctx.translate(x * k, (y + FLOOR) * k)
  suitAt(ctx, k, 0.5 + 0.5 * clamp01(light))
  ctx.restore()
}
function suitAt(ctx: Ctx, k: number, light: number): void {
  suitPath(ctx, k, 0)
  const vy = -FLOOR * k
  ctx.moveTo(0.11 * k, vy)
  ctx.arc(0, vy, 0.11 * k, 0, Math.PI * 2, true)
  const g = ctx.createLinearGradient(-SUIT.w * 0.5 * k, 0, SUIT.w * 0.5 * k, 0)
  g.addColorStop(0, mix(SHELL.dark, SHELL.suit, light * 0.7))
  g.addColorStop(1, mix(SHELL.dark, SHELL.suit, light))
  ctx.fillStyle = g
  ctx.fill('evenodd')
  ctx.beginPath()
  ctx.arc(0, vy, 0.11 * k, 0, Math.PI * 2)
  ctx.fillStyle = rgba(SHELL.dark, 0.28)
  ctx.fill()
}

function wornSuits(ctx: Ctx, k: number, t: number): void {
  for (const who of ['louise', 'ian'] as const) {
    if (suitOf(who, t) > 0) continue
    const at = who === 'louise' ? louiseAt(t) : ianAt(t)
    if (!at) continue
    // Pale even in the dark: the suits are the brightest thing they bring in.
    const light = 0.5 + 0.5 * lightAt(at[0], t)
    ctx.save()
    ctx.translate(at[0] * k, (FLOOR + at[1]) * k)
    // A window for her face: the ball shows through it.
    suitAt(ctx, k, light)
    ctx.restore()
  }
}

/** A suit off: its halves fall away either side and lie there. */
function fallenSuits(ctx: Ctx, k: number, t: number): void {
  if (t > T.out + 1) return
  for (const who of ['louise', 'ian'] as const) {
    const u = suitOf(who, t)
    if (u <= 0) continue
    const when = who === 'louise' ? T.suit : T.ianSuit
    const at = who === 'louise' ? louiseAt(when) : ianAt(when)
    if (!at) continue
    const light = 0.5 + 0.5 * lightAt(at[0], t)
    for (const side of [-1, 1] as const) {
      // Open a crack, then fall outward about its outer foot, a little bounce, and lie still.
      const crack = 0.035 * smooth(u, 0, 0.12)
      const fall = Math.min(1, Math.max(0, u - 0.1) ** 2 * 5.5)
      const bounce = u > 0.53 ? 0.1 * Math.exp(-(u - 0.53) / 0.18) * Math.abs(Math.sin((u - 0.53) * 16)) : 0
      const ang = side * (Math.PI / 2) * (fall - bounce)
      const slide = side * (crack + 0.16 * smooth(u, 0.3, 1.4))
      const gone = smooth(u, 0.45, 0.95)
      if (gone >= 1) continue
      ctx.save()
      // They go down into the floor as they fade: nothing is left lying there.
      ctx.beginPath()
      ctx.rect((at[0] - 2) * k, (FLOOR - 2) * k, 4 * k, 2 * k)
      ctx.clip()
      ctx.translate((at[0] + slide + side * SUIT.w * 0.5) * k, (FLOOR + 0.3 * gone) * k)
      ctx.rotate(ang)
      ctx.translate(-side * SUIT.w * 0.5 * k, 0)
      suitPath(ctx, k, side)
      ctx.globalAlpha *= 1 - gone
      ctx.fillStyle = mix(SHELL.dark, SHELL.suit, light * (side < 0 ? 0.75 : 1))
      ctx.fill()
      ctx.restore()
    }
  }
}

/* ------------------------------------------------------------------ the bomb */

/** The soldiers' charge, on the floor between them and the glass. */
export const CHARGE: Pt = [6.3, FLOOR]
function charge(ctx: Ctx, k: number, t: number): void {
  if (t < T.bomb - 1 || t >= T.blast) return
  const [x, y] = CHARGE
  const light = lightAt(x, t)
  ctx.fillStyle = mix(SHELL.dark, SHELL.heptapodDark, 0.8)
  ctx.fillRect((x - 0.19) * k, (y - 0.2) * k, 0.38 * k, 0.2 * k)
  // Its light's post.
  ctx.fillRect((x + 0.005) * k, (y - 0.25) * k, 0.03 * k, 0.06 * k)
  ctx.fillStyle = rgba(SHELL.wallLit, 0.5 * light)
  ctx.fillRect((x - 0.19) * k, (y - 0.2) * k, 0.38 * k, 0.03 * k)
  // One bright light on it, flashing on each beat.
  let on = 0
  for (const bt of BLINKS) {
    const u = t - bt
    if (u >= 0 && u < 0.3) on = Math.max(on, 1 - u / 0.3)
  }
  const lx = (x + 0.02) * k
  const ly = (y - 0.25) * k
  if (on > 0.01) {
    ctx.save()
    ctx.translate(lx, ly)
    ctx.scale(1.8, 1)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.3 * k)
    g.addColorStop(0, rgba(TENT.keypad, 0.5 * on))
    g.addColorStop(1, rgba(TENT.keypad, 0))
    ctx.fillStyle = g
    ctx.fillRect(-0.3 * k, -0.3 * k, 0.6 * k, 0.6 * k)
    ctx.restore()
  }
  ctx.fillStyle = mix(SHELL.dark, TENT.keypad, 0.3 + 0.7 * on)
  ctx.fillRect(lx - 0.07 * k, ly - 0.035 * k, 0.14 * k, 0.07 * k)
}
/** The charge's light: on each beat from the one after the slam to the blast. */
export const BLINKS: number[] = [215.65, 216.625, 217.513, 218.424, 219.417, 220.375, 221.362, 222.348]

interface Shard {
  x: number
  y: number
  vx: number
  vy: number
  spin: number
  len: number
  w: number
  t0: number
  /** Comes down point first, stands a moment on the floor and topples back into the chamber. */
  upright?: boolean
}
/** The pane blown outward, away from the charge, into their white; a few pieces back onto our floor. */
const SHARDS: Shard[] = Array.from({ length: 10 }, (_, i) => {
  const out = i < 7
  return {
    x: GX + 0.14 + 0.1 * (hash(i, 1, 44) - 0.5),
    y: -0.2 - 3.6 * hash(i, 2, 44),
    vx: out ? 1.6 + 4 * hash(i, 3, 44) : -1.0 - 2.5 * hash(i, 3, 44),
    vy: -2.4 + 2.2 * hash(i, 4, 44),
    spin: (hash(i, 5, 44) - 0.5) * 14,
    len: 0.2 + 0.36 * hash(i, 6, 44),
    w: 0.04 + 0.045 * hash(i, 7, 44),
    t0: T.blast,
  }
})
// The long one that comes down on its chord, and the last of the glass, falling on the flood.
SHARDS.push({ x: GX + 0.14, y: FLOOR - 0.65 - 6 * (T.shard - (T.blast + 2.6)) ** 2, vx: 0, vy: 0, spin: 0, len: 1.3, w: 0.1, t0: T.blast + 2.6, upright: true })

/** Where a shard is at `t`: flying under gravity, then skidding along the floor to rest. */
function shardAt(s: Shard, t: number): { x: number; y: number; a: number } | null {
  const u = t - s.t0
  if (u < 0) return null
  const G = 12
  if (s.upright) {
    const fallFor = Math.sqrt((2 * (FLOOR - s.len / 2 - s.y)) / G)
    if (u < fallFor) return { x: s.x, y: s.y + 0.5 * G * u * u, a: Math.PI / 2 }
    // On the floor: it stands, then goes over backward into the chamber, and settles with a knock.
    const v = u - fallFor
    const tip = v < 0.15 ? 0 : Math.min(1, ((v - 0.15) / 0.42) ** 2)
    const knock = v > 0.57 ? 0.06 * Math.exp(-(v - 0.57) / 0.1) * Math.abs(Math.sin((v - 0.57) * 30)) : 0
    const phi = (Math.PI / 2) * (tip - knock)
    const cx = s.x - (s.len / 2) * Math.sin(phi)
    const cy = FLOOR - (s.len / 2) * Math.cos(phi) - (s.w / 2) * Math.sin(phi)
    return { x: cx, y: cy, a: Math.atan2(-Math.cos(phi), -Math.sin(phi)) }
  }
  // Out into their white there is no floor: it falls away into the fog.
  if (s.vx > 0) return u < 2.2 ? { x: s.x + s.vx * u * (1 - 0.25 * u), y: s.y + s.vy * u + 0.5 * G * 0.35 * u * u, a: s.spin * u } : null
  const yLand = FLOOR - s.w / 2
  // Time to the floor.
  const disc = s.vy * s.vy + 2 * G * (yLand - s.y)
  const tl = (-s.vy + Math.sqrt(Math.max(0, disc))) / G
  if (u < tl) return { x: s.x + s.vx * u, y: s.y + s.vy * u + 0.5 * G * u * u, a: s.spin * u }
  const v = s.vx * 0.35
  const skid = Math.min(u - tl, 0.5)
  const x = s.x + s.vx * tl + v * skid - (v * skid * skid) / (2 * 0.5)
  return { x, y: yLand, a: Math.round((s.spin * tl) / Math.PI) * Math.PI }
}

function shards(ctx: Ctx, k: number, t: number): void {
  if (t < T.blast || t > T.fog + 2) return
  const light = 0.5 + 0.5 * clamp01(wakeAt(t))
  for (const s of SHARDS) {
    const at = shardAt(s, t)
    if (!at) continue
    ctx.save()
    ctx.translate(at.x * k, at.y * k)
    ctx.rotate(at.a)
    ctx.beginPath()
    ctx.moveTo((-s.len / 2) * k, 0)
    ctx.lineTo((-s.len * 0.1) * k, (-s.w / 2) * k)
    ctx.lineTo((s.len / 2) * k, 0)
    ctx.lineTo((s.len * 0.15) * k, (s.w / 2) * k)
    ctx.closePath()
    ctx.fillStyle = rgba(mix(SHELL.screenEdge, SHELL.glow, 0.5), 0.85 * light)
    ctx.fill()
    // A grey edge, so a piece of glass is seen against the white too.
    ctx.strokeStyle = rgba(SHELL.mist, 0.8)
    ctx.lineWidth = Math.max(0.7, 0.012 * k)
    ctx.stroke()
    ctx.restore()
  }
}

/** Dust hanging after the blast, lit by the broken glass, whitening into the veil. Sparse. */
function dust(ctx: Ctx, k: number, t: number, f: Frame): void {
  if (t < T.blast + 0.05 || t > T.fog + 2) return
  const u = t - T.blast
  const white = smooth(t, T.flood - 1, T.fog)
  for (let i = 0; i < 12; i++) {
    const sx = GX - 0.2 - 9 * hash(i, 1, 61) ** 1.3
    const sy = -0.1 - 4.5 * hash(i, 2, 61)
    const out = 1 - Math.exp(-u / 0.6)
    const x = sx - (0.6 + 1.4 * hash(i, 3, 61)) * out - 0.08 * u + 0.15 * Math.sin(u * 0.5 + i)
    const y = sy - 0.45 * out * hash(i, 4, 61) + 0.04 * u * (hash(i, 5, 61) - 0.3) + 0.1 * Math.sin(u * 0.37 + i * 2)
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    const r = (0.016 + 0.034 * hash(i, 6, 61) ** 2) * (1 + 0.6 * white)
    // Brighter where the white through the hole falls on them.
    const inBeam = Math.exp(-(((y - lerp(-2.2, 0, (GX - x) / 11)) / 1.9) ** 2))
    const a = (0.2 + 0.45 * hash(i, 7, 61)) * smooth(u, 0.05, 0.6) * (0.45 + 0.4 * inBeam + 0.4 * white)
    ctx.beginPath()
    ctx.arc(x * k, y * k, Math.max(0.6, r * k), 0, Math.PI * 2)
    ctx.fillStyle = rgba(SHELL.glow, a)
    ctx.fill()
  }
}
