import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { sway, view, type View } from '../depth'
import { hash } from '../kit'
import { LIFE_RED, WALTER_WARM } from '../worlds'
import { contact, INK, knock, mix, ramp, rgba, rule, settle, slab } from '../negatives/hand'
import { drawCrossers, drawPeople, drawPigeons, drawSale, drawTraffic, FLASH, peopleShadows, steam, WALK } from './city'
import { AVENUE_FAR, drawFireEscape, drawFronts, drawGround, drawRoofs, skyShows } from './fronts'
import { LANE, morning, S, shadeEdge, shadeTint } from './light'
import { CELLAR, cherylAt, CLANKS, CORNER, COVER, FLIPS, HAULS, IN, KERB, PAVE, SLOT_W, SLOTS, STAND, STOP, WALTER_STOP, walterAt } from './plan'
import { drawAvenue, drawCity, drawSky } from './sky'

/**
 * The street, drawn (the B1 builder's): the negatives room's hand in a New York morning. Flat values and the one
 * graphite line; the light is the soft thing, and the shade of the buildings behind the camera lies cool over the
 * road and the near side of the pavement, to one clean edge. Nothing on it is red but the Life box on the one cover.
 *
 * In order, back to front: the sky and the city behind (`sky.ts`, only where the fronts let it be seen), the fronts
 * (`fronts.ts`), the pavement and the road, the furniture and the stand, the people and the pigeons, the traffic and
 * the steam (`city.ts`), and the shade over all of it (`light.ts`).
 */

type C2 = CanvasRenderingContext2D

/* ------------------------------------------------------------------ the magazines */

/** The other issues on the stand: muted covers, blocks of tone (nothing on them is lettered, nothing red). */
const COVERS = ['#C9A75E', '#6F8C8A', '#9AA3AE', '#D9D2C2', '#7C7A86', '#B88B6A', '#8FA48B', '#CFC3A0']

function issue(ctx: C2, k: number, x0: number, y0: number, w: number, h: number, n: number): void {
  const c = COVERS[n % COVERS.length]
  slab(ctx, k, x0, y0, x0 + w, y0 + h, c, { color: rgba(INK, 0.85), w: 0.8 })
  // A masthead band and a picture block.
  slab(ctx, k, x0 + w * 0.1, y0 + h * 0.07, x0 + w * 0.9, y0 + h * 0.2, mix(c, INK, 0.35))
  slab(ctx, k, x0 + w * 0.1, y0 + h * 0.3, x0 + w * (0.55 + hash(n, 2) * 0.35), y0 + h * (0.6 + hash(n, 3) * 0.3), mix(c, S.paper, 0.45))
}

/**
 * The last issue of Life: the red box with its white rule, and the photograph: Walter sitting outside the building
 * looking at a contact sheet. The picture is the show's first frame again (the dark, a strip of light, him at its near
 * end), but he is in it as he is now: the red ball, ringed and marked as he rolls, big enough to know at a glance, and
 * against the strip's light so he is the first thing on the cover the eye finds. He is red there from the first flip,
 * never warming: the photograph is of who he became. He sits right over the place the live ball stops (`WALTER_STOP`),
 * so on the chord the two are one above the other.
 */
function life(ctx: C2, k: number, x0: number, y0: number, w: number, h: number): void {
  slab(ctx, k, x0, y0, x0 + w, y0 + h, S.paper, { color: rgba(INK, 0.9), w: 0.9 })
  const px0 = x0 + w * 0.06
  const px1 = x0 + w * 0.94
  const py0 = y0 + h * 0.05
  const py1 = y0 + h * 0.95
  // The photograph: the building's dark front, its pilasters just there.
  slab(ctx, k, px0, py0, px1, py1, S.photo)
  for (let i = 0; i < 4; i++) {
    const x = px0 + (px1 - px0) * (0.12 + i * 0.26)
    slab(ctx, k, x, py0, x + (px1 - px0) * 0.07, py1 - h * 0.28, '#383D41')
  }
  // A step he sits on, and the contact sheet's light on his knees: a strip, lit, starting just behind him.
  const sy = py0 + (py1 - py0) * 0.7
  const r = w * 0.095
  const wx = WALTER_STOP
  slab(ctx, k, px0, sy + h * 0.06, px1, py1, '#41474B')
  const g = ctx.createLinearGradient(0, (sy - h * 0.035) * k, 0, (sy + h * 0.035) * k)
  g.addColorStop(0, '#EEF3F0')
  g.addColorStop(1, '#CED8D4')
  // The strip's light lying on the step round it, flat.
  ctx.fillStyle = rgba('#E4ECE8', 0.16)
  ctx.beginPath()
  ctx.ellipse((wx + w * 0.16) * k, (sy + h * 0.05) * k, w * 0.4 * k, h * 0.07 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  slab(ctx, k, wx - r * 0.2, sy - h * 0.045, px0 + (px1 - px0) * 0.9, sy + h * 0.045, g)
  // Him: the ball as he rolls, an ink ring, Life's red, his mark.
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.arc(wx * k, sy * k, r * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = WALTER_WARM
  ctx.beginPath()
  ctx.arc(wx * k, sy * k, r * 0.8 * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.arc((wx - r * 0.02) * k, (sy - r * 0.42) * k, r * 0.17 * k, 0, Math.PI * 2)
  ctx.fill()
  // The red box, top left, with its white rule.
  const bx0 = x0 + w * 0.08
  const by0 = y0 + h * 0.07
  const bw = w * 0.36
  const bh = h * 0.17
  slab(ctx, k, bx0, by0, bx0 + bw, by0 + bh, LIFE_RED)
  slab(ctx, k, bx0 + bw * 0.1, by0 + bh * 0.14, bx0 + bw * 0.9, by0 + bh * 0.86, null, { color: '#FFFFFF', w: Math.max(1, 0.012 * k) })
}

/** How long each haul of the shutter takes, up to its strike. */
const HAUL = 0.55

/** The shutter's bottom edge at `t`: down, then up in two hauls, the second to the top, latched; each eases up and settles on its strike. */
function shutterAt(t: number): number {
  const { open } = STAND
  const half = open.top + (PAVE - open.top) * 0.48
  const haul = (from: number, to: number, a: number) => from + (to - from) * ramp(t, a - HAUL, a) + 0.05 * settle(t, a, 5, 0.12)
  if (t < HAULS[1] - HAUL) return haul(PAVE, half, HAULS[0])
  return haul(half, open.top, HAULS[1])
}

/** An issue's flip down onto the rack: 0 folded up, 1 down; it slaps and settles. Life settles again on the chord. */
/** Which flip each slot takes: the left, then the right, and Life, in the middle, last. */
const FLIP_OF = [0, 2, 1]
/** How long his hand takes to pull an issue down off its fold, landing on the flip's strike. */
const FLIP = 0.36
function flipAt(i: number, t: number): number {
  const a = FLIPS[FLIP_OF[i]]
  const down = ramp(t, a - FLIP, a)
  return down + (t > a ? 0.06 * settle(t, a, 4, 0.18) : 0) + (i === 1 && t > STOP ? 0.03 * settle(t, STOP, 3, 0.3) : 0)
}

/** The man's two hands and the issues each puts out, in order: [which flip, which slot]. The left does the left, then Life. */
const HANDS: [number, number][][] = [
  [
    [0, 0],
    [2, 1],
  ],
  [[1, 2]],
]

/**
 * Where one of his hands is at `t` (cells), or null while it is down behind the ledge: up out of sight to an issue's
 * fold, down with it as it flips, on to the next, and down out of sight after the last.
 */
function handAt(jobs: [number, number][], t: number): Pt | null {
  const h = COVER.y1 - COVER.y0
  const hid = COVER.y0 + 1.3
  const top = COVER.y0 + 0.02
  const gx = (s: number) => SLOTS[s] + SLOT_W * 0.62
  const at = (s: number, u: number): number => top + (h * 0.92 - 0.02) * Math.max(0, Math.min(1, flipAt(s, u)))
  let from: Pt = [gx(jobs[0][1]), hid]
  let since = FLIPS[jobs[0][0]] - FLIP - 0.46
  if (t < since) return null
  for (const [fi, s] of jobs) {
    const a = FLIPS[fi]
    const grip = a - FLIP - 0.06
    if (t < grip) {
      const u = ramp(t, since, grip)
      return [from[0] + (gx(s) - from[0]) * u, from[1] + (top - from[1]) * u]
    }
    if (t < a + 0.05) return [gx(s), at(s, t)]
    from = [gx(s), at(s, a + 0.05)]
    since = a + 0.05
  }
  // Quick after the last, so the cover is clear of his sleeve by the chord.
  const u = ramp(t, since, since + 0.3)
  return u >= 1 ? null : [from[0], from[1] + (hid - from[1]) * u]
}

function drawStand(ctx: C2, k: number, t: number): void {
  const { x0, x1, roof, eave, open } = STAND
  // This morning's delivery by its side, two bundles off the van in their straps, waiting to be cut open.
  for (const [bx, by] of [[x1 + 0.08, PAVE], [x1 + 0.12, PAVE - 0.25]] as [number, number][]) {
    slab(ctx, k, bx, by - 0.25, bx + 0.56, by, '#E6E1D5', { color: rgba(INK, 0.8), w: 0.8 })
    slab(ctx, k, bx + 0.25, by - 0.25, bx + 0.29, by, '#3A4247')
  }
  slab(ctx, k, x0, roof, x1, PAVE, S.kiosk, { color: INK, w: 1 })
  slab(ctx, k, x0 - 0.18, eave, x1 + 0.18, roof, S.kioskDark, { color: INK, w: 1 })
  // Inside: dark, the back racks of issues, the front rack's ledge and its three slots.
  slab(ctx, k, open.x0, open.top, open.x1, PAVE - 0.05, '#2C3330')
  for (let r = 0; r < 1; r++) {
    for (let i = 0; i < 5; i++) {
      const w = 0.42
      const x = open.x0 + 0.12 + i * 0.5
      const y = open.top + 0.12 + r * 0.55
      issue(ctx, k, x, y, w, 0.5, i * 3 + r * 7 + 1)
      slab(ctx, k, x, y, x + w, y + 0.5, rgba('#2C3330', 0.35))
    }
  }
  // Below the racks, the back of the stand: folded papers in two stacks, and the man who keeps it, dim in the dark
  // at the back, shifting as he works.
  for (const [x, n] of [[open.x0 + 0.15, 6], [open.x1 - 0.75, 5]] as [number, number][]) slab(ctx, k, x, -0.42 - n * 0.05, x + 0.6, -0.42, '#989B95', { color: rgba(INK, 0.5), w: 0.6 })
  {
    const lean = 0.06 * sway(t, 0.13, 4)
    const vx = 7.42 + lean
    ctx.fillStyle = '#3A4440'
    ctx.beginPath()
    ctx.arc(vx * k, -1.38 * k, 0.13 * k, 0, Math.PI * 2)
    ctx.moveTo((vx - 0.32) * k, -0.36 * k)
    ctx.quadraticCurveTo((vx - 0.3) * k, -1.15 * k, vx * k, -1.18 * k)
    ctx.quadraticCurveTo((vx + 0.3) * k, -1.15 * k, (vx + 0.32) * k, -0.36 * k)
    ctx.closePath()
    ctx.fill()
  }
  slab(ctx, k, open.x0, -0.36, open.x1, -0.28, S.kioskDark, { color: INK, w: 0.8 })
  // The front rack: a wire across, three issues hung on it, flipped down from folded as he puts them out.
  rule(ctx, k, open.x0 + 0.05, -1.58, open.x1 - 0.05, -1.58, INK, 1.1)
  SLOTS.forEach((sx, i) => {
    const f = Math.max(0, flipAt(i, t))
    const h = COVER.y1 - COVER.y0
    if (f <= 0.01) {
      slab(ctx, k, sx, COVER.y0 - 0.02, sx + SLOT_W, COVER.y0 + 0.04, S.paper, { color: rgba(INK, 0.7), w: 0.8 })
      return
    }
    ctx.save()
    ctx.translate(0, COVER.y0 * k)
    ctx.scale(1, f)
    ctx.translate(0, -COVER.y0 * k)
    if (i === 1) life(ctx, k, sx, COVER.y0, SLOT_W, h)
    else issue(ctx, k, sx, COVER.y0, SLOT_W, h, i === 0 ? 0 : 5)
    ctx.restore()
    // The clothes-peg holding it.
    slab(ctx, k, sx + SLOT_W / 2 - 0.03, COVER.y0 - 0.1, sx + SLOT_W / 2 + 0.03, COVER.y0 + 0.06, '#A89C86', { color: INK, w: 0.8 })
  })
  // The man inside: only his hands and sleeves, up from behind the ledge to pull each issue down off its fold.
  for (const jobs of HANDS) {
    const hand = handAt(jobs, t)
    if (!hand) continue
    const [hx, hy] = hand
    const elbow: [number, number] = [hx + 0.3, -0.5]
    ctx.save()
    // From behind the ledge: nothing of him below it.
    ctx.beginPath()
    ctx.rect(open.x0 * k, open.top * k, (open.x1 - open.x0) * k, (-0.36 - open.top) * k)
    ctx.clip()
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1E2421'
    ctx.lineWidth = 0.13 * k
    ctx.beginPath()
    ctx.moveTo((elbow[0] + 0.08) * k, 0)
    ctx.lineTo(elbow[0] * k, elbow[1] * k)
    ctx.lineTo((hx + 0.05) * k, (hy + 0.06) * k)
    ctx.stroke()
    ctx.fillStyle = '#B39478'
    ctx.beginPath()
    ctx.ellipse(hx * k, hy * k, 0.07 * k, 0.055 * k, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  // The shutter, rolled up to its drum.
  const bottom = shutterAt(t)
  if (bottom > open.top + 0.01) {
    slab(ctx, k, open.x0, open.top, open.x1, bottom, S.shutter, { color: INK, w: 1 })
    ctx.strokeStyle = rgba(INK, 0.35)
    ctx.lineWidth = 0.8
    for (let y = bottom - 0.09; y > open.top; y -= 0.09) {
      ctx.beginPath()
      ctx.moveTo(open.x0 * k, y * k)
      ctx.lineTo(open.x1 * k, y * k)
      ctx.stroke()
    }
    slab(ctx, k, open.x0 + 1.2, bottom - 0.08, open.x0 + 1.45, bottom, S.steel, { color: INK, w: 0.8 })
  }
  slab(ctx, k, open.x0 - 0.04, open.top - 0.16, open.x1 + 0.04, open.top, S.kioskDark, { color: INK, w: 1 })
}

/* ------------------------------------------------------------------ the set */

/** The pavement, the kerb, the road with its lanes and its manhole, the corner and the crossings, the far side's. */
function drawGroundPlane(ctx: C2, v: View): void {
  const k = v.k
  const x0 = v.x0 - 1
  const x1 = v.x1 + 1
  const end = CORNER.kerb
  // The pavement in slabs, a kerb of granite blocks.
  slab(ctx, k, x0, PAVE, end, KERB, S.pave)
  ctx.strokeStyle = S.paveLine
  ctx.lineWidth = 0.9
  ctx.beginPath()
  for (let x = Math.floor(x0 / 0.75) * 0.75; x < end; x += 0.75) {
    ctx.moveTo(x * k, PAVE * k)
    ctx.lineTo((x - 0.08) * k, KERB * k)
  }
  ctx.moveTo(x0 * k, (PAVE + KERB) * 0.5 * k)
  ctx.lineTo(end * k, (PAVE + KERB) * 0.5 * k)
  ctx.stroke()
  rule(ctx, k, x0, PAVE, end, PAVE, rgba(INK, 0.8), 0.9)
  slab(ctx, k, x0, KERB, end, KERB + 0.1, S.kerb, { color: rgba(INK, 0.6), w: 0.8 })
  // The road: plain asphalt, the gutter a little darker, the lane line, the manhole the steam comes up out of.
  slab(ctx, k, x0, KERB + 0.1, x1, v.y1 + 1, S.road)
  slab(ctx, k, x0, KERB + 0.1, x1, KERB + 0.24, rgba(S.roadDark, 0.6))
  // A vault grate in the paving by the café.
  slab(ctx, k, 8.75, PAVE + 0.06, 9.95, PAVE + 0.3, '#8E8E89', { color: rgba(INK, 0.7), w: 0.8 })
  // The line between the lanes, in dashes; the near lane's edge.
  const mid = (LANE.far + LANE.near) / 2 - 0.42
  for (let x = Math.floor(x0 / 1.2) * 1.2; x < x1; x += 1.2) if (x < CORNER.kerb - 0.6 || x > AVENUE_FAR) slab(ctx, k, x, mid, x + 0.6, mid + 0.06, '#E4E0D4')
  ctx.fillStyle = '#6E6C67'
  ctx.strokeStyle = rgba(INK, 0.7)
  ctx.beginPath()
  ctx.ellipse(11.6 * k, (KERB + 0.42) * k, 0.42 * k, 0.09 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // The corner: the pavement ends; the avenue's crossing beyond, its stripes; the stop lines; the ladder across this street.
  slab(ctx, k, CORNER.kerb, PAVE + 0.2, x1, KERB + 0.1, S.road)
  for (let i = 0; i < 6; i++) slab(ctx, k, CORNER.kerb + 0.3 + i * 0.5, PAVE + 0.32, CORNER.kerb + 0.55 + i * 0.5, KERB + 0.06, '#E0DDD5')
  for (let y = KERB + 0.22; y < v.y1 + 0.3; y += 0.3) slab(ctx, k, CORNER.kerb + 0.25, y, CORNER.kerb + 1.25, y + 0.15, '#DCD9D0')
  slab(ctx, k, CORNER.kerb - 1.05, KERB + 0.14, CORNER.kerb - 0.95, LANE.far + 0.05, '#E0DDD5')
  slab(ctx, k, AVENUE_FAR + 0.12, mid + 0.1, AVENUE_FAR + 0.22, v.y1 + 1, '#E0DDD5')
  // Across the avenue: the far corner's pavement and kerb.
  slab(ctx, k, AVENUE_FAR, PAVE, x1, KERB, mix(S.pave, S.sky, 0.15))
  ctx.strokeStyle = S.paveLine
  ctx.beginPath()
  for (let x = AVENUE_FAR + 1.1; x < x1; x += 0.75) {
    ctx.moveTo(x * k, PAVE * k)
    ctx.lineTo((x - 0.08) * k, KERB * k)
  }
  ctx.stroke()
  rule(ctx, k, AVENUE_FAR, PAVE, x1, PAVE, rgba(INK, 0.8), 0.9)
  slab(ctx, k, AVENUE_FAR, KERB, x1, KERB + 0.1, S.kerb, { color: rgba(INK, 0.6), w: 0.8 })
}

/**
 * The crossing signal on the near corner: the orange hand; when the street's light goes red, the white walker; at the
 * last, the hand flashing.
 */
function drawSignal(ctx: C2, k: number, t: number): void {
  const x = CORNER.kerb - 0.16
  slab(ctx, k, x - 0.04, -3.3, x + 0.04, PAVE, '#4E5552', { color: INK, w: 0.8 })
  slab(ctx, k, x - 0.22, -3.75, x + 0.22, -3.15, S.kioskDark, { color: INK, w: 0.9 })
  const walk = ramp(t, WALK, WALK + 0.08) * (t < FLASH ? 1 : 0)
  // The hand steady all the while they wait; then the walker; then the hand flashing as the crossing closes.
  slab(ctx, k, x - 0.15, -3.66, x + 0.15, -3.44, '#262B29')
  slab(ctx, k, x - 0.15, -3.4, x + 0.15, -3.22, '#262B29')
  const hand = t < FLASH ? 1 - walk : (t - FLASH) % 1 < 0.55 ? 1 : 0
  if (hand > 0.01) {
    ctx.fillStyle = rgba('#F2A548', 0.95 * hand)
    ctx.beginPath()
    ctx.ellipse(x * k, -3.53 * k, 0.07 * k, 0.085 * k, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  if (walk > 0.01) {
    ctx.fillStyle = rgba('#F7F4EA', walk)
    ctx.fillRect((x - 0.02) * k, -3.37 * k, 0.04 * k, 0.1 * k)
    ctx.fillRect((x - 0.06) * k, -3.3 * k, 0.12 * k, 0.03 * k)
    ctx.beginPath()
    ctx.arc(x * k, -3.39 * k, 0.025 * k, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** The lamp post by the shop: a fluted foot, a pole, an arm reaching out over the street, the lamp out by day. */
function drawLamp(ctx: C2, k: number): void {
  const x = 2.9
  const c = '#4E5552'
  slab(ctx, k, x - 0.1, -0.5, x + 0.1, PAVE, c, { color: INK, w: 0.8 })
  slab(ctx, k, x - 0.05, -4.4, x + 0.05, -0.5, c, { color: INK, w: 0.8 })
  ctx.strokeStyle = c
  ctx.lineWidth = Math.max(1.5, 0.07 * k)
  ctx.beginPath()
  ctx.moveTo(x * k, -4.3 * k)
  ctx.quadraticCurveTo(x * k, -4.75 * k, (x + 0.5) * k, -4.72 * k)
  ctx.stroke()
  slab(ctx, k, x + 0.4, -4.78, x + 0.85, -4.62, c, { color: INK, w: 0.8 })
  slab(ctx, k, x + 0.46, -4.62, x + 0.8, -4.58, '#E9E3D2')
}

/** A bicycle locked to the lamp post, its front wheel past it: the wheels, the frame, the saddle and the bars, the chain round the post. */
function drawBike(ctx: C2, k: number): void {
  const r = 0.3
  const y = PAVE - r
  const back: Pt = [2.35, y]
  const front: Pt = [3.42, y]
  const crank: Pt = [2.86, y + 0.03]
  const seat: Pt = [2.72, y - 0.5]
  const head: Pt = [3.27, y - 0.48]
  const neck: Pt = [3.31, y - 0.34]
  const line = (pts: Pt[], color: string, w: number) => {
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(1, w * k)
    ctx.beginPath()
    pts.forEach(([x, py], i) => (i ? ctx.lineTo(x * k, py * k) : ctx.moveTo(x * k, py * k)))
    ctx.stroke()
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const [wx, wy] of [back, front]) {
    ctx.strokeStyle = '#2A2E31'
    ctx.lineWidth = Math.max(1, 0.045 * k)
    ctx.beginPath()
    ctx.arc(wx * k, wy * k, r * k, 0, Math.PI * 2)
    ctx.stroke()
  }
  line([back, crank, seat, back], '#4A5E6A', 0.04)
  line([seat, head, neck, crank], '#4A5E6A', 0.04)
  line([head, front], '#4A5E6A', 0.035)
  line([[seat[0] - 0.02, seat[1]], [seat[0] - 0.04, seat[1] - 0.1]], '#4A5E6A', 0.03)
  line([[seat[0] - 0.14, seat[1] - 0.11], [seat[0] + 0.08, seat[1] - 0.12]], '#2A2E31', 0.05)
  line([head, [head[0] - 0.04, head[1] - 0.12], [head[0] - 0.16, head[1] - 0.14]], '#2A2E31', 0.035)
  line([[2.83, y - 0.42], [2.97, y - 0.36], [2.97, y - 0.3], [2.84, y - 0.25]], '#6E7478', 0.02)
  ctx.lineJoin = 'miter'
  ctx.lineCap = 'butt'
}

/** The low wire rack of papers along the stand's front, their top sheets lifting in the air off the street. */
function drawPapers(ctx: C2, k: number, t: number): void {
  const y = PAVE - 0.02
  for (let i = 0; i < 4; i++) {
    const x = STAND.x0 + 0.2 + i * 0.68
    slab(ctx, k, x, y - 0.3, x + 0.56, y, '#E6E1D5', { color: rgba(INK, 0.7), w: 0.8 })
    slab(ctx, k, x + 0.05, y - 0.26, x + 0.51, y - 0.2, rgba(INK, 0.35))
    const lift = 0.05 + 0.04 * sway(t, 0.7, i)
    ctx.fillStyle = '#F2EEE5'
    ctx.beginPath()
    ctx.moveTo(x * k, (y - 0.3) * k)
    ctx.lineTo((x + 0.56) * k, (y - 0.3) * k)
    ctx.lineTo((x + 0.56) * k, (y - 0.3 + 0.06) * k)
    ctx.lineTo((x + 0.1) * k, (y - 0.3 - lift) * k)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = rgba(INK, 0.5)
    ctx.stroke()
  }
  rule(ctx, k, STAND.x0 + 0.1, y - 0.12, STAND.x1 - 0.1, y - 0.12, rgba(INK, 0.7), 0.9)
}

/** An ellipse as its own closed shape in a path (cells). */
function blob(path: Path2D, x: number, y: number, rx: number, ry: number, rot: number): void {
  path.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot))
  path.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
  path.closePath()
}

/**
 * The shade over the street (see `light.ts`): the buildings behind the camera over the road and the near side of the
 * pavement, to one clean edge; and the shadows cast long to the left by what stands in the sun: the stand, the man at
 * the stand, the two of them. Laid on in two fills of a cool blue, lighter on the ground; every shape in them is wound
 * the same way, so where they overlap they are one shade, not two.
 */
function drawShade(ctx: C2, v: View, t: number): void {
  const k = v.k
  const walls = new Path2D()
  const ground = new Path2D()
  const edge = shadeEdge(t)
  ground.rect(v.x0 - 1, edge, v.x1 - v.x0 + 2, v.y1 + 1 - edge)
  // The stand's shadow on the front behind it and along the pavement.
  walls.rect(STAND.x0 - 0.42, STAND.eave + 0.25, 0.42, PAVE - STAND.eave - 0.25)
  ground.moveTo(STAND.x0 - 2.2, PAVE)
  ground.lineTo(STAND.x0, PAVE)
  ground.lineTo(STAND.x0 + 0.4, PAVE + 0.22)
  ground.lineTo(STAND.x0 - 1.9, PAVE + 0.22)
  ground.closePath()
  // The two of them: their shadows long on the paving.
  if (t >= IN) for (const [x] of [walterAt(t), cherylAt(t)]) blob(ground, x - 0.42, PAVE + 0.05, 0.44, 0.05, 0)
  peopleShadows(ground, t)
  ctx.save()
  ctx.scale(k, k)
  ctx.fillStyle = shadeTint(t)
  ctx.fill(walls)
  ctx.fillStyle = shadeTint(t, true)
  ctx.fill(ground)
  ctx.restore()
}

export function drawStreet(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as C2
  const v = view(p, k)
  ctx.save()
  if (skyShows(v)) {
    drawSky(ctx, v, t)
    drawCity(ctx, v, t)
    drawAvenue(ctx, v, t)
  }
  drawFronts(ctx, v, t)
  drawFireEscape(ctx, v)
  drawRoofs(ctx, v, t)
  drawGround(ctx, v, t)
  drawGroundPlane(ctx, v)
  drawSignal(ctx, k, t)
  // The cellar doors in the pavement: two plates that clank as he goes over, dipping and rattling in their frame.
  const dip = (a: number) => 0.02 * knock(t, a, 0.06) + 0.008 * settle(t, a, 9, 0.15)
  slab(ctx, k, CELLAR.x0 - 0.06, PAVE, CELLAR.x1 + 0.06, PAVE + 0.16, '#7E8282', { color: INK, w: 0.9 })
  for (const [a, b, c] of [[CELLAR.x0, CELLAR.mid, CLANKS[0]], [CELLAR.mid, CELLAR.x1, CLANKS[1]]]) {
    const y = PAVE + dip(c)
    slab(ctx, k, a, y, b, y + 0.1, S.steel, { color: INK, w: 0.9 })
  }
  drawLamp(ctx, k)
  drawBike(ctx, k)
  drawStand(ctx, k, t)
  drawPapers(ctx, k, t)
  drawSale(ctx, k, t)
  drawPeople(ctx, v, t)
  drawPigeons(ctx, v, t)
  drawTraffic(ctx, v, t, 'far')
  // Steam, the one plume: up out of the manhole by the café in the far lane; the near lane goes by in front of it,
  // and the shade falls across it.
  steam(ctx, v, t, 11.6, KERB + 0.4, 1.8, 0.32 + 0.1 * morning(t))
  drawTraffic(ctx, v, t, 'near')
  drawCrossers(ctx, v, t)
  drawShade(ctx, v, t)
  // The balls' contact on the pavement, soft.
  if (t >= IN) {
    const [wx] = walterAt(t)
    contact(ctx, k, wx + 0.02, PAVE, 0.22)
    const [cx] = cherylAt(t)
    contact(ctx, k, cx + 0.02, PAVE, 0.22)
  }
  ctx.restore()
}
