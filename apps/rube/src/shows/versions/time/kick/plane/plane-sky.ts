import { mixHex, type Pt } from '../../../../../parts'
import { rgba } from '../cast'
import { hash, type frame } from '../kit'
import { HOME, PLANE } from '../worlds'
import { CAB, CLOUD_DEPTH, ENGINES, GEAR, GROUND, HOME as LEAVE_T, NACELLE, TOUCH, WAKE, cloudAt, clamp01, flexAt, gearDown, groundAt, jolt, wingY } from './plane-geo'
import { box, glow, line, oval, polyline, puff, rbox, ring, shape, vwash, type Pen } from './plane-kit'

/**
 * Outside the cabin (the PLANE builder's): the sky (night over a moonlit cloud deck; a gold morning), the cloud deck
 * the plane comes down through, the ground coming up under it and the runway; and the airframe behind the section:
 * the wings with their four engines, the fin, the main gear, the smoke off the tyres as they touch.
 */

type Frame = ReturnType<typeof frame>
/** Night (boarding) or morning (waking): the one place, lit two ways. */
export const isDay = (t: number): boolean => t > 150

/* ------------------------------------------------------------------ the sky */

const SUN: Pt = [17, -0.4]

export function drawSky(pen: Pen, t: number, f: Frame): void {
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const y0 = f.y0 - 1
  const y1 = f.y1 + 1
  if (!isDay(t)) {
    vwash(pen, x0, x1, y0, y1, [
      [0, PLANE.night, 1],
      [clamp01((-7 - y0) / (y1 - y0)), PLANE.night, 1],
      [clamp01((0.9 - y0) / (y1 - y0)), mixHex(PLANE.night, PLANE.window, 0.75), 1],
      [1, mixHex(PLANE.night, PLANE.window, 0.75), 1],
    ])
    // The moon, off to the left and high: its light, never its disc.
    glow(pen, [-9, -6], 9, PLANE.dawnHigh, 0.13)
    // Stars, sparse, twinkling slowly; none low down in the haze over the clouds.
    const { ctx, k } = pen
    for (let cx = Math.floor(x0); cx <= x1; cx++) {
      for (let cy = Math.floor(y0); cy <= Math.min(y1, 0); cy++) {
        for (let i = 0; i < 2; i++) {
          const h = hash(cx, cy, i + 7)
          if (h > 0.55) continue
          const sx = cx + hash(cx, cy, i + 11)
          const sy = cy + hash(cx, cy, i + 13)
          const a = (0.35 + 0.45 * hash(cx, cy, i + 17)) * (0.75 + 0.25 * Math.sin(t * (0.6 + h) + h * 40)) * clamp01((0.6 - sy) / 1.5)
          const r = 0.008 + 0.012 * hash(cx, cy, i + 19)
          ctx.fillStyle = `rgba(221, 232, 240, ${a.toFixed(3)})`
          ctx.fillRect((sx - r) * k, (sy - r) * k, 2 * r * k, 2 * r * k)
        }
      }
    }
    drawCloudDeck(pen, t, f)
    return
  }
  // Morning: blue-grey high, gold low; the sun low on the right, off the frame, its light across everything.
  const under = clamp01((cloudAt(t) + CLOUD_DEPTH + 2 - 0) / -6)
  const high = mixHex(PLANE.dawnHigh, HOME.sky, 0.25)
  const low = mixHex(PLANE.dawn, PLANE.lamp, 0.35)
  vwash(pen, x0, x1, y0, y1, [
    [0, high, 1],
    [clamp01((-6 - y0) / (y1 - y0)), high, 1],
    [clamp01((-1.5 - y0) / (y1 - y0)), mixHex(high, low, 0.55 - 0.2 * under), 1],
    [clamp01((1.5 - y0) / (y1 - y0)), mixHex(low, PLANE.dawnHigh, 0.25 * under), 1],
    [1, mixHex(low, PLANE.dawnHigh, 0.3 * under), 1],
  ])
  glow(pen, SUN, 16, PLANE.lamp, 0.55)
  glow(pen, SUN, 6, HOME.sun, 0.55)
  drawGroundFar(pen, t, f)
  drawUnderDeck(pen, t, f)
  drawCloudDeck(pen, t, f)
}

/**
 * Below the deck, before the ground comes up: loose wisps of lower cloud in the gold, rising past with the deck as the
 * plane comes down (in a tall frame the air under the wings was one flat fill, half the picture).
 */
function drawUnderDeck(pen: Pen, t: number, f: Frame): void {
  const bottom = cloudAt(t) + CLOUD_DEPTH
  const floor = Math.min(groundAt(t) - 1.2, f.y1 + 2)
  if (bottom + 1 > floor || bottom > f.y1 + 2) return
  const lit = mixHex(PLANE.dawn, HOME.sun, 0.45)
  const shade = mixHex(PLANE.dawnHigh, PLANE.window, 0.15)
  for (let row = 0; row < 7; row++) {
    const y = bottom + 1.6 + row * 2.3
    if (y > floor) break
    if (y < f.y0 - 2) continue
    for (let i = Math.floor((f.x0 - 6) / 4.5); i <= Math.ceil((f.x1 + 6) / 4.5); i++) {
      if (hash(i, row, 51) < 0.45) continue
      const x = i * 4.5 + 2 * hash(i, row, 52)
      const w = 1.6 + 2.6 * hash(i, row, 53)
      const fade = clamp01((floor - y) / 2) * (0.75 - row * 0.06)
      puff(pen, [x, y + 0.14], w, 0.36, shade, 0.7 * fade)
      puff(pen, [x - 0.2, y], w * 0.85, 0.28, lit, 0.85 * fade)
    }
  }
}

/**
 * The cloud deck: soft, never outlined; its top in rolling heaps, lit from the moon (night) or the low sun (morning).
 * At cruise it lies just under the wings; coming down, the plane passes through it and it goes up over the frame.
 */
function drawCloudDeck(pen: Pen, t: number, f: Frame): void {
  const top = cloudAt(t)
  const bottom = top + CLOUD_DEPTH
  if (top > f.y1 + 2 || bottom < f.y0 - 3) return
  const day = isDay(t)
  const lit = day ? mixHex(PLANE.dawn, HOME.sun, 0.35) : mixHex(PLANE.dawnHigh, PLANE.night, 0.35)
  const body = day ? mixHex(PLANE.dawnHigh, PLANE.dawn, 0.35) : mixHex(PLANE.window, PLANE.night, 0.25)
  const shade = day ? mixHex(PLANE.dawnHigh, PLANE.window, 0.35) : mixHex(PLANE.window, PLANE.night, 0.6)
  const x0 = f.x0 - 2
  const x1 = f.x1 + 2
  // The deck's body: a wash from its lit top into its shaded underside.
  vwash(pen, x0, x1, top + 0.25, bottom, [
    [0, body, 1],
    [0.55, body, 0.98],
    [1, shade, day ? 0.9 : 0.95],
  ])
  const drift = t * 0.05
  // Its body is not one flat grey: deeper billows in it, each rounded top a little lit, the lower ones in shade.
  for (let row = 0; row < 4; row++) {
    const y = top + 1.3 + row * 1.05
    if (y - 1 > f.y1 || y + 1 < f.y0) continue
    const s = 1.1 + 0.25 * row
    const off = drift * (0.6 - 0.1 * row)
    for (let i = Math.floor((x0 - off) / s) - 2; i <= Math.ceil((x1 - off) / s) + 2; i++) {
      const h = hash(i, 20 + row, 5)
      const x = i * s + off + (hash(i, 30 + row, 5) - 0.5) * 0.6
      const r = 0.6 + 0.7 * h
      const deep = row / 3
      puff(pen, [x, y + r * 0.2], r, r * 0.5, mixHex(body, shade, 0.35 + 0.5 * deep), 0.35)
      puff(pen, [x - r * 0.12, y - r * 0.08], r * 0.65, r * 0.26, mixHex(body, lit, 0.5 - 0.35 * deep), 0.22)
    }
  }
  // Heaps along the top: many sizes, their tops caught by the light; drifting a little on the show's clock.
  const step = 0.55
  for (let i = Math.floor((x0 - drift) / step) - 2; i <= Math.ceil((x1 - drift) / step) + 2; i++) {
    const h = hash(i, 3, 5)
    const x = i * step + drift + (hash(i, 4, 5) - 0.5) * 0.4
    const r = 0.45 + 0.9 * h
    const y = top + 0.35 - 0.3 * hash(i, 6, 5)
    puff(pen, [x, y + r * 0.35], r, r * 0.55, body, 0.85)
    puff(pen, [x - r * 0.15, y], r * 0.7, r * 0.32, lit, day ? 0.5 : 0.3)
  }
  // And a ragged underside as it goes up past.
  if (bottom < f.y1 + 2) {
    for (let i = Math.floor(x0 / 0.7) - 1; i <= Math.ceil(x1 / 0.7) + 1; i++) {
      const h = hash(i, 8, 5)
      const r = 0.5 + 0.8 * h
      puff(pen, [i * 0.7, bottom - 0.2 + 0.3 * hash(i, 9, 5)], r, r * 0.45, shade, 0.8)
    }
  }
}

/** Inside the cloud: the fog that closes round the plane as it goes through the deck (drawn over the plane). */
export function drawCloudFog(pen: Pen, t: number, f: Frame): void {
  if (!isDay(t)) return
  const top = cloudAt(t)
  const bottom = top + CLOUD_DEPTH
  // How far inside the deck the plane's middle is: 0 outside, 1 deep in.
  const mid = CAB.cy
  const inside = clamp01(Math.min(mid - top, bottom - mid) / 1.6)
  if (inside <= 0.01) return
  const col = mixHex(PLANE.dawnHigh, PLANE.dawn, 0.3)
  vwash(pen, f.x0 - 1, f.x1 + 1, f.y0 - 1, f.y1 + 1, [
    [0, col, 0.7 * inside],
    [1, col, 0.7 * inside],
  ])
}

/**
 * The ground far and near, coming up under the plane: hazy hills and the city, palms, and the runway's concrete under
 * the wheels. All of it stands on the ground's line and rises with it.
 */
function drawGroundFar(pen: Pen, t: number, f: Frame): void {
  const gy = groundAt(t)
  if (gy > f.y1 + 6) return
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const haze = mixHex(PLANE.dawnHigh, PLANE.dawn, 0.45)
  // The hills, far: two long soft ridges, paler the further.
  for (const [lay, hgt, col, a] of [
    [0, 2.6, mixHex(haze, PLANE.dawnHigh, 0.35), 0.55],
    [1, 1.3, mixHex(haze, PLANE.window, 0.18), 0.75],
  ] as const) {
    const pts: Pt[] = [[x0, gy + 0.2]]
    for (let x = Math.floor(x0); x <= x1 + 1; x += 0.5) {
      const n = 0.5 + 0.3 * Math.sin(x * 0.21 + lay * 2.1) + 0.2 * Math.sin(x * 0.53 + lay * 5.3)
      pts.push([x, gy - hgt * n])
    }
    pts.push([x1 + 1, gy + 0.2])
    shape(pen, pts, `${col}${Math.round(a * 255).toString(16).padStart(2, '0')}`, 0)
  }
  // The city, low and flat along the ground, in the haze.
  for (let i = Math.floor(x0 / 0.9) - 1; i <= Math.ceil(x1 / 0.9); i++) {
    const h = hash(i, 21, 2)
    if (h < 0.3) continue
    const w = 0.4 + 0.5 * hash(i, 22, 2)
    const ht = 0.25 + 0.7 * h * h
    box(pen, i * 0.9, gy - ht, i * 0.9 + w, gy + 0.05, `${mixHex(haze, PLANE.window, 0.3)}99`, 0)
  }
  // The runway's concrete, and the ground under it, cut away to the frame's foot. In a tall frame that is near half
  // the picture, so it is not one flat grey: the slabs and their joints, a bed of crushed stone, then the earth in
  // soft bands, darker going down, a few stones in it.
  const concrete = mixHex(PLANE.hull, PLANE.caseDark, 0.45)
  const bottom = Math.max(gy + 1, f.y1 + 1)
  box(pen, x0, gy, x1, gy + 0.6, mixHex(concrete, PLANE.dawn, 0.12), 0)
  vwash(pen, x0, x1, gy, gy + 0.12, [
    [0, HOME.sun, 0.35],
    [1, HOME.sun, 0],
  ])
  for (let x = Math.ceil(x0 / 2.4) * 2.4; x < x1; x += 2.4) line(pen, [x, gy + 0.12], [x, gy + 0.55], rgba(PLANE.night, 0.16), 0.5)
  const bed = mixHex(mixHex(concrete, PLANE.caseDark, 0.35), PLANE.dawn, 0.1)
  box(pen, x0, gy + 0.55, x1, Math.min(bottom, gy + 1.0), bed, 0)
  const { ctx, k } = pen
  ctx.fillStyle = rgba(mixHex(PLANE.caseDark, PLANE.night, 0.3), 0.35)
  for (let i = Math.floor(x0 / 0.3); i <= x1 / 0.3; i++)
    for (let j = 0; j < 2; j++) {
      const x = (i + hash(i, j, 61)) * 0.3
      const y = gy + 0.62 + 0.3 * j + 0.08 * hash(i, j, 62)
      const r = 0.018 + 0.022 * hash(i, j, 63)
      ctx.fillRect((x - r) * k, (y - r * 0.7) * k, 2 * r * k, 1.4 * r * k)
    }
  if (bottom > gy + 1.0) {
    const top = gy + 1.0
    const soil = mixHex(mixHex(HOME.floorShade, PLANE.caseDark, 0.4), PLANE.dawn, 0.2)
    vwash(pen, x0, x1, top, bottom, [
      [0, soil, 1],
      [clamp01(3 / (bottom - top)), mixHex(soil, PLANE.night, 0.22), 1],
      [1, mixHex(soil, PLANE.night, 0.22), 1],
    ])
    ;[0.6, 1.5, 2.7, 4.2, 5.9, 7.9, 10.2].forEach((d, i) => {
      if (top + d > bottom) return
      ctx.beginPath()
      ctx.moveTo(x0 * k, bottom * k)
      for (let x = x0; x <= x1 + 0.2; x += 0.25) ctx.lineTo(x * k, (top + d + 0.07 * Math.sin(x * 1.1 + i * 2.1) + 0.04 * Math.sin(x * 2.9 + i)) * k)
      ctx.lineTo(x1 * k, bottom * k)
      ctx.closePath()
      ctx.fillStyle = rgba(mixHex(soil, PLANE.night, 0.5), 0.1 + 0.02 * i)
      ctx.fill()
    })
    ctx.fillStyle = rgba(mixHex(PLANE.caseDark, soil, 0.4), 0.45)
    for (let i = Math.floor(x0); i < x1; i++)
      for (let j = 0; j < 15; j++) {
        const [x, y] = [i + hash(i, j, 71), top + 0.3 + j * 0.7 + 0.5 * hash(i, j, 72)]
        if (y > bottom || hash(i, j, 73) < 0.5) continue
        const r = 0.035 + 0.05 * hash(i, j, 74)
        ctx.beginPath()
        ctx.ellipse(x * k, y * k, r * 1.5 * k, r * k, (hash(i, j, 75) - 0.5) * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }
  }
  line(pen, [x0, gy + 0.55], [x1, gy + 0.55], rgba(PLANE.night, 0.25), 0.6)
  line(pen, [x0, gy + 1.0], [x1, gy + 1.0], rgba(PLANE.night, 0.18), 0.5)
}

/* ------------------------------------------------------------------ the airframe, behind the section */

/**
 * The wings, the engines and the fin, as a 747 is seen from dead ahead: the section is cut through its nose, and all of
 * this stands behind it. `dy` is the cabin's jolt (the whole airframe moves with it; the gear's wheels do not).
 */
export function drawAirframe(pen: Pen, t: number, f: Frame): void {
  const day = isDay(t)
  const dy = jolt(t)
  const skin = day ? mixHex(PLANE.hull, PLANE.dawn, 0.18) : mixHex(PLANE.hull, PLANE.night, 0.66)
  const under = day ? mixHex(PLANE.hull, PLANE.dawnHigh, 0.55) : mixHex(PLANE.hull, PLANE.night, 0.8)
  const cx = CAB.cx
  // The fin, tall over the crown.
  if (f.y0 < CAB.cy - CAB.rOut) {
    shape(pen, [[cx - 0.2, CAB.cy - CAB.rOut + 0.3 + dy], [cx - 0.09, -10.5 + dy], [cx + 0.09, -10.5 + dy], [cx + 0.2, CAB.cy - CAB.rOut + 0.3 + dy]], skin, 0.7)
  }
  // The wings, each side, rising gently outward; their undersides in shade.
  for (const s of [-1, 1]) {
    const pts: Pt[] = []
    const lower: Pt[] = []
    // From under the hull (at the wing's height it is about 1.45 wide), so the root meets the body and no sky shows
    // between them.
    // From well inside the hull, and clipped to outside its outline: the hull is cut through and the wing stands behind
    // it, so its root goes in under the ring (started at a fixed span, it showed a gap or lay over the ring, ending
    // square, the hull's edge curving fast so low down).
    const root = 0.6
    for (let d = root; d <= 34; d += 1) {
      const thick = 0.34 * (1 - d / 44)
      const fl = flexAt(t, d)
      pts.push([cx + s * d, wingY(d) + fl + dy])
      lower.push([cx + s * d, wingY(d) + fl + thick + dy])
    }
    const xs = [cx + s * root, cx + s * 34]
    if (Math.max(...xs) < f.x0 - 1 || Math.min(...xs) > f.x1 + 1) continue
    const { ctx, k } = pen
    ctx.save()
    ctx.beginPath()
    ctx.rect((f.x0 - 2) * k, (f.y0 - 2) * k, (f.x1 - f.x0 + 4) * k, (f.y1 - f.y0 + 4) * k)
    ctx.arc(cx * k, (CAB.cy + dy) * k, (CAB.rOut - 0.02) * k, 0, Math.PI * 2)
    ctx.clip('evenodd')
    shape(pen, [...pts, ...lower.reverse()], skin, 0.7)
    polyline(pen, lower.map(([x, y]) => [x, y - 0.06] as Pt), under, 1.6)
    ctx.restore()
  }
  // The main gear: under the body and the wings, behind the nose gear; swung down with it.
  const down = gearDown(t)
  if (down > 0.01) {
    for (const d of [-3.6, -1.35, 1.35, 3.6]) drawMainGear(pen, t, cx + d, Math.abs(d) > 2 ? wingY(Math.abs(d)) + 0.25 : CAB.cy + Math.sqrt(CAB.rOut ** 2 - d * d) - 0.3, down, dy, day)
  }
  // The engines: four, hung under the wings, their fans turning.
  for (const s of [-1, 1]) {
    for (const d of ENGINES) {
      const ex = cx + s * d
      if (ex + NACELLE < f.x0 - 0.5 || ex - NACELLE > f.x1 + 0.5) continue
      const ey = wingY(d) + flexAt(t, d) + 1.05 + dy
      drawEngine(pen, t, ex, ey, skin, day)
    }
  }
}

function drawEngine(pen: Pen, t: number, x: number, y: number, skin: string, day: boolean): void {
  const r = NACELLE
  // The pylon up to the wing's underside (drawn over the wing to its top edge, on the wing's rise it stood up above
  // it, and the engine seemed to hang from whatever was over it: the jet bridge, at the gate).
  // The engine's top sits just under the wing's top edge (y - r is wingY + 0.1), so the pylon is a short stub to it.
  shape(pen, [[x - 0.14, y - r + 0.1], [x - 0.09, y - r + 0.03], [x + 0.09, y - r + 0.03], [x + 0.14, y - r + 0.1]], skin, 0.6)
  ring(pen, x, y, r * 0.8, r, skin, 0.7)
  const fan = day ? mixHex(PLANE.night, PLANE.cabinLit, 0.6) : PLANE.night
  oval(pen, x, y, r * 0.8, r * 0.8, fan, 0.5)
  // The blades: a slow turning of light wedges (what the eye makes of a fan at speed).
  const { ctx, k } = pen
  const spin = t * (day ? 0.55 : 0.8)
  ctx.save()
  ctx.beginPath()
  ctx.arc(x * k, y * k, r * 0.78 * k, 0, Math.PI * 2)
  ctx.clip()
  const n = 18
  for (let i = 0; i < n; i++) {
    const a = spin + (i / n) * Math.PI * 2
    const a2 = a + 0.1
    ctx.beginPath()
    ctx.moveTo(x * k, y * k)
    ctx.lineTo((x + Math.cos(a) * r) * k, (y + Math.sin(a) * r) * k)
    ctx.lineTo((x + Math.cos(a2) * r) * k, (y + Math.sin(a2) * r) * k)
    ctx.closePath()
    ctx.fillStyle = day ? 'rgba(159, 179, 200, 0.22)' : 'rgba(58, 69, 96, 0.35)'
    ctx.fill()
  }
  ctx.restore()
  // The spinner, small, with its one swirl.
  oval(pen, x, y, 0.1, 0.1, skin, 0.5)
  const sw: Pt[] = []
  for (let i = 0; i <= 10; i++) {
    const a = spin * 2 + i * 0.35
    const rr = 0.1 * (i / 10)
    sw.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr])
  }
  polyline(pen, sw, PLANE.night, 0.4)
}

/** A main gear leg with its bogie's two front tyres. */
function drawMainGear(pen: Pen, t: number, x: number, top: number, down: number, dy: number, day: boolean): void {
  const strut = day ? mixHex(PLANE.caseDark, PLANE.dawnHigh, 0.25) : PLANE.caseDark
  const tyre = mixHex(PLANE.night, PLANE.cabin, 0.4)
  const bottom = GROUND
  // Swung down from the side about its top (it hangs out from the wing root as it goes).
  const a = (1 - down) * 1.35 * Math.sign(x - CAB.cx)
  const len = bottom - 0.45 - (top + dy)
  const len0 = GROUND - 0.45 - top
  const axle: Pt = [x + Math.sin(a) * len0, top + dy + Math.cos(a) * len]
  pen.ctx.save()
  shape(pen, [[x - 0.15, top + dy], [x + 0.15, top + dy], [axle[0] + 0.12, axle[1] - 0.3], [axle[0] - 0.12, axle[1] - 0.3]], strut, 0.6)
  box(pen, axle[0] - 0.07, axle[1] - 0.32, axle[0] + 0.07, axle[1], mixHex(strut, PLANE.hull, 0.35), 0.5)
  box(pen, axle[0] - 0.44, axle[1] - 0.06, axle[0] + 0.44, axle[1] + 0.06, strut, 0.5)
  const spin = spinAt(t)
  for (const s of [-1, 1]) {
    const tx = axle[0] + s * 0.24
    rbox(pen, tx - 0.18, axle[1] - 0.44, tx + 0.18, axle[1] + 0.44, 0.12, tyre, 0.6)
    treads(pen, tx, axle[1], 0.18, 0.44, spin)
  }
  pen.ctx.restore()
}

/** How far round the wheels have turned since they touched (cells of tread), spinning up at once and slowing. */
export function spinAt(t: number): number {
  const u = t - TOUCH
  if (u <= 0) return 0
  // From runway speed to a crawl over the rollout, then still at the gate.
  return 14 * 1.6 * (1 - Math.exp(-u / 1.6))
}

/** Grooves across a tyre seen from ahead, running down as it turns. */
export function treads(pen: Pen, x: number, y: number, hw: number, hh: number, spin: number): void {
  const n = 5
  for (let i = 0; i < n; i++) {
    const v = ((((i / n + spin * 0.9) % 1) + 1) % 1) * 2 - 1
    const yy = y + v * hh * 0.85
    const w = hw * 0.75 * Math.sqrt(Math.max(0, 1 - v * v))
    if (w < 0.02) continue
    polyline(pen, [[x - w, yy], [x + w, yy]], 'rgba(233, 238, 242, 0.18)', 0.5)
  }
}

/** The smoke off the tyres as they touch: soft puffs either side of each, growing and drifting out, gone in two seconds. */
export function drawSmoke(pen: Pen, t: number): void {
  const u = t - TOUCH
  if (u < 0 || u > 2.6) return
  const col = mixHex(PLANE.hull, PLANE.dawnHigh, 0.35)
  const a0 = 0.8 * (1 - clamp01(u / 2.6)) ** 1.4 * clamp01(u / 0.04)
  for (const x of [CAB.cx - 3.6, CAB.cx - 1.35, CAB.cx, CAB.cx + 1.35, CAB.cx + 3.6]) {
    const w = x === CAB.cx ? 0.85 : 1
    // A burst off the tyre as it spins up, and the billow spreading out and up behind it.
    puff(pen, [x, GROUND - 0.2], 0.5 + 0.9 * (1 - Math.exp(-u / 0.35)), 0.3 + 0.4 * (1 - Math.exp(-u / 0.5)), HOME.sun, a0 * 0.8 * w)
    for (const s of [-1, 1]) {
      const d = 0.35 + 1.3 * (1 - Math.exp(-u / 0.7))
      const r = 0.35 + 1.1 * (1 - Math.exp(-u / 0.9))
      puff(pen, [x + s * d, GROUND - 0.2 - 0.45 * (1 - Math.exp(-u / 1.2))], r, r * 0.6, col, a0 * w)
    }
  }
}

/** Whether the morning's approach has begun (for what only the descent shows). */
export const approaching = (t: number): boolean => t > WAKE && t < LEAVE_T && t > GEAR - 3
