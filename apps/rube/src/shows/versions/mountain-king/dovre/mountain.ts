import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../parts'
import { frame, hash, scenery, smooth } from './kit'
import { CODA, LAST1, LAST2 } from './music'
import { LAMP, SKY, STONE, WORKS } from './worlds'

/**
 * The mountain seen from outside: the director's scenery, drawn first, behind everything. The paper is the rock, so
 * the mountain itself is what is not drawn; this draws the sky above its skyline, the stars, the far ridges and the
 * valley beyond, the stave church in the east valley whose bell rings the trolls out, the turf on the upper flanks,
 * and the dawn that comes up once Peer is out.
 *
 * World cells (the gate part's entry is 0, 0; y down). The skyline is `skyline(x)`: the west flank the gate part's
 * path climbs, a cliff with the troll gate at its foot (x ≈ 20, the gate part's exit is inside it at 21.5, -4), the
 * slope up to the summit over the hall (x ≈ 48, y ≈ -21), and the east flank: a grassy shoulder with a hollow in it
 * (`REST`, where Peer comes to rest at sunrise) and the long fall to the valley.
 *
 * The finale blows the summit's cap out on the first of the last two chords: from then the surface has a crater
 * (`surface(x, t)`); `skyline(x)` is always the intact mountain.
 */

/** The skyline's corners, world cells: where the mountain's surface is. Between them, a smooth line. */
export const SKYLINE: Pt[] = [
  [-90, 34], [-60, 26], [-38, 14], [-22, 6.5], [-10, 2.2], [0, 0.13], [8, -1.3], [14, -2.5], [19.8, -3.87],
  // The cliff over the gate: the gate is cut into its foot.
  [20.1, -9.5], [26, -12.5], [34, -15.5], [42, -19.5], [48, -21],
  // The east flank: down from the summit to a shoulder with a grassy hollow in it, then down to the valley.
  [52, -20.35], [55.5, -18.9], [58.5, -17.95], [61.5, -18.2], [65, -15.8], [70, -11.2], [82, -2], [96, 9],
  [112, 20], [130, 30], [170, 40],
]

/** The mountain's surface height at world x (smooth between the corners, sharp at the cliff). */
export function skyline(x: number): number {
  const s = SKYLINE
  if (x <= s[0][0]) return s[0][1]
  if (x >= s[s.length - 1][0]) return s[s.length - 1][1]
  let i = 0
  while (i + 1 < s.length && s[i + 1][0] < x) i++
  const [x0, y0] = s[i]
  const [x1, y1] = s[i + 1]
  const u = (x - x0) / (x1 - x0)
  // The cliff (a short, steep step) stays a straight face; elsewhere ease between corners so the line has no kinks.
  if (x1 - x0 < 1) return y0 + (y1 - y0) * u
  const m0 = i > 0 && s[i][0] - s[i - 1][0] >= 1 ? (y1 - s[i - 1][1]) / (x1 - s[i - 1][0]) : (y1 - y0) / (x1 - x0)
  const m1 = i + 2 < s.length && s[i + 2][0] - x1 >= 1 ? (s[i + 2][1] - y0) / (s[i + 2][0] - x0) : (y1 - y0) / (x1 - x0)
  const h = x1 - x0
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * m0 + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * h * m1
}

/** The summit, world cells: the chimney comes out here in the finale. */
export const SUMMIT: Pt = [48, -21]

/** The crater the finale blows in the summit: centred on the chimney (x 47.5), this wide each side, this deep. */
export const CRATER = { x: 47.5, half: 1.55, depth: 1.8 }

/** How much deeper than `skyline` the surface is at x, once the cap is blown out (LAST1): 0 elsewhere and before. */
export function crater(x: number, t: number): number {
  if (t < LAST1) return 0
  const dx = (x - CRATER.x) / CRATER.half
  if (Math.abs(dx) >= 1) return 0
  const u = 1 - dx * dx
  // Broken, not turned: a little unevenness on the crater's walls.
  // Broken, not turned: stepped and uneven, a ledge left on each wall, the rim torn.
  const rough = 1 + 0.12 * Math.sin(dx * 7.3 + 1.1) + 0.07 * Math.sin(dx * 17.9) + 0.05 * Math.sign(Math.sin(dx * 11.7 + 0.4))
  const ledge = 0.22 * Math.exp(-Math.pow((Math.abs(dx) - 0.55) / 0.12, 2))
  return (CRATER.depth * u * Math.sqrt(u) * rough - ledge * u) * smooth(t, LAST1, LAST1 + 0.08)
}

/** The mountain's surface at world x and show time t: the skyline, and the crater after the summit blows. */
export const surface = (x: number, t: number): number => skyline(x) + crater(x, t)

/** The hollow in the east shoulder, world cells: the lowest point of the skyline there, where a ball comes to rest. */
export const REST: Pt = (() => {
  let best = 58.5
  for (let x = 56; x <= 61; x += 0.005) if (skyline(x) > skyline(best)) best = x
  const x = Math.round(best * 1000) / 1000
  return [x, skyline(x) - R]
})()

/**
 * How far the dawn has come at show time `t`: 0 all night; it starts just before Peer bursts out of the summit (so
 * he comes out under the last stars, the east pale) and is full morning as the credits run.
 */
export const dawn = (t: number): number => smooth(t, LAST1 - 3, LAST2 + 14)

/** The morning's high sky: still a deep blue once the sun is up (the zenith stays blue longest). */
const ZENITH = mixHex(SKY.morning, SKY.night, 0.5)

/** The sky's colour at world height y and show time t (for a part that paints sky, e.g. through the gate). */
export function skyAt(y: number, t: number): string {
  const d = dawn(t)
  const u = Math.max(0, Math.min(1, (y + 50) / 70))
  const night = mixHex(SKY.night, SKY.dusk, u * u)
  if (d <= 0) return night
  // Day is laid out for the finale's framing: high sky over the summit, peach low over the far ridges (y ≈ -14).
  // The low sky warms first; the zenith stays blue longest, so the dawn goes through rose and not through grey.
  const v = Math.max(0, Math.min(1, (y + 38) / 24))
  // The morning's own colours by height: a deep blue high up (where the credits are set: the words need a dark
  // ground), the pale blue lower, and the warm band over the far ridges where the sun comes up.
  const w = Math.max(0, Math.min(1, (y + 24) / 8.5))
  const band = w < 0.4 ? mixHex(ZENITH, SKY.morning, smooth(w, 0, 0.4)) : mixHex(SKY.morning, SKY.dawn, Math.pow((w - 0.4) / 0.6, 1.3))
  const day = mixHex(band, mixHex(SKY.morning, SKY.dawn, Math.pow(v, 1.7)), 0.25)
  const here = Math.max(0, Math.min(1, d * (0.75 + 0.9 * v)))
  const between = mixHex(mixHex(SKY.dusk, SKY.dawn, 0.55 * v + 0.15), day, here)
  return mixHex(night, between, Math.min(1, here * 1.6))
}

/** The far valley's parallax: a far thing at (X, Y) is drawn at X + cx·(1 − F), Y + cy·(1 − F) for a camera at (cx, cy). */
const FAR = 0.22
/** The stave church in the east valley, on the far layer (its X there, and the height of the ground it stands on). */
export const CHURCH: Pt = [19.2, 0.35]
/** The sun, on the far layer: it comes up behind the far peaks, a little east of the church. */
const SUN_X = 23.4

/** The far peaks (Rondane), far-layer cells: sharp tops, rounded cols. */
function ridgeA(X: number): number {
  const peak = 1 - Math.abs(Math.sin(X * 0.21 + 0.2))
  const peak2 = 1 - Math.abs(Math.sin(X * 0.47 + 2.1))
  return -0.9 - 1.9 * Math.pow(peak, 1.6) * (0.7 + 0.3 * Math.sin(X * 0.05 + 1)) - 0.45 * Math.pow(peak2, 2) + 0.2 * Math.sin(X * 1.3)
}

/** The valley's near hills, far-layer cells: low and rolling, flat where the church stands. */
function ridgeB(X: number): number {
  const h = 0.55 + 0.55 * Math.sin(X * 0.13 + 2) + 0.28 * Math.sin(X * 0.31 + 1) + 0.08 * Math.sin(X * 1.1)
  const flat = Math.exp(-Math.pow((X - CHURCH[0]) / 1.6, 2))
  return h * (1 - flat) + CHURCH[1] * flat
}

interface MountainState {
  on: true
}

export const mountain = scenery<MountainState>({
  name: 'mountain',
  draw: (p, _s, c) => {
    const { k } = c
    const t = c.t
    const f = frame(p, k)
    const x0 = f.x0 - 1
    const x1 = f.x1 + 1
    const top = f.y0 - 1
    // Only where the skyline is in the frame: inside the mountain there is no sky to draw.
    const step = Math.max(0.25, (x1 - x0) / 160)
    let above = false
    for (let x = x0; x <= x1; x += step) if (surface(x, t) > top) above = true
    if (!above) return
    const d = dawn(t)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const edge = (x: number) => surface(Math.min(x, x1), t)

    ctx.save()
    // The sky: the region above the surface, clipped, so everything on the far layer stays behind the mountain.
    ctx.beginPath()
    ctx.moveTo(x0 * k, top * k)
    for (let x = x0; x <= x1 + step; x += step) ctx.lineTo(x * k, edge(x) * k)
    ctx.lineTo(x1 * k, top * k)
    ctx.closePath()
    ctx.clip()
    let low = -Infinity
    for (let x = x0; x <= x1 + step; x += step * 4) low = Math.max(low, edge(x))
    const bottom = low + 1
    const g = ctx.createLinearGradient(0, top * k, 0, bottom * k)
    for (const u of [0, 0.25, 0.5, 0.75, 1]) g.addColorStop(u, skyAt(top + (bottom - top) * u, t))
    ctx.fillStyle = g
    ctx.fillRect(x0 * k, top * k, (x1 - x0) * k, (bottom - top) * k)

    // Stars: few, small, fading with the dawn. On the farthest layer (they barely move).
    if (d < 0.95) {
      const sf = 0.04
      const ox = f.cx * (1 - sf)
      const oy = f.cy * (1 - sf)
      p.noStroke()
      for (let i = 0; i < 90; i++) {
        const sx = -80 + 240 * hash(i, 1) + ox
        const sy = -70 + 70 * hash(i, 2) + oy
        if (sx < x0 || sx > x1 || sy < top || sy > bottom) continue
        const tw = 0.6 + 0.4 * Math.sin(t * (0.8 + hash(i, 3)) + i)
        // Some go before others as the east pales.
        const a = Math.max(0, 1 - d * (1.2 + 0.8 * hash(i, 6))) * tw * (0.35 + 0.65 * hash(i, 4))
        if (a <= 0.01) continue
        const col = p.color(SKY.star)
        col.setAlpha(255 * a)
        p.fill(col)
        const r = (0.03 + 0.04 * hash(i, 5)) * k * (f.y1 - f.y0 > 20 ? 1.4 : 1)
        p.ellipse(sx * k, sy * k, r, r)
      }
    }

    const ox = f.cx * (1 - FAR)
    const oy = f.cy * (1 - FAR)

    // The sun's light, behind everything on the far layer: a broad warm pool over the east, then the sun itself.
    if (d > 0.02) {
      const sx = SUN_X + ox
      const sy = ridgeA(SUN_X) + oy + 1.1 - 1.9 * smooth(t, LAST2 + 2, LAST2 + 27)
      const glowR = 13
      const gg = ctx.createRadialGradient(sx * k, sy * k, 0, sx * k, sy * k, glowR * k)
      const a = 0.55 * d
      gg.addColorStop(0, `rgba(255,227,166,${a})`)
      gg.addColorStop(0.3, `rgba(242,196,141,${a * 0.45})`)
      gg.addColorStop(1, 'rgba(242,196,141,0)')
      ctx.fillStyle = gg
      ctx.fillRect((sx - glowR) * k, (sy - glowR) * k, 2 * glowR * k, 2 * glowR * k)
      // The disc: big and far, rising out of the far peaks (they are drawn over its lower part).
      const disc = p.color(mixHex(SKY.dawn, SKY.sun, 0.75))
      disc.setAlpha(255 * smooth(d, 0.25, 0.6))
      p.noStroke()
      p.fill(disc)
      p.ellipse(sx * k, sy * k, 1.9 * k, 1.9 * k)
    }

    // The far peaks: dark at night, blue and hazy at dawn.
    const aCol = mixHex(SKY.far, mixHex(SKY.morning, SKY.dusk, 0.35), 0.7 * d)
    p.noStroke()
    p.fill(aCol)
    p.beginShape()
    for (let x = x0 - 2; x <= x1 + 2; x += step) p.vertex(x * k, (ridgeA(x - ox) + oy) * k)
    p.vertex((x1 + 2) * k, bottom * k)
    p.vertex((x0 - 2) * k, bottom * k)
    p.endShape(p.CLOSE)

    // The valley's hills, nearer: at night nearly the rock's own dark; at dawn a blue-green in the shadow.
    const bCol = mixHex(mixHex(SKY.far, STONE.deep, 0.5), mixHex(SKY.grass, SKY.dusk, 0.55), 0.75 * d)
    p.fill(bCol)
    p.beginShape()
    for (let x = x0 - 2; x <= x1 + 2; x += step) p.vertex(x * k, (ridgeB(x - ox) + oy) * k)
    p.vertex((x1 + 2) * k, bottom * k)
    p.vertex((x0 - 2) * k, bottom * k)
    p.endShape(p.CLOSE)

    // Morning mist lying along the valley floor, drifting east.
    if (d > 0.05) {
      const drift = (t - CODA) * 0.06
      for (let i = 0; i < 5; i++) {
        const X = CHURCH[0] - 9 + i * 4.6 + drift + 1.3 * Math.sin(i * 2.1)
        const Y = ridgeB(X) + 0.55 + 0.15 * Math.sin(i * 1.7)
        const mist = p.color(mixHex(SKY.morning, SKY.sun, 0.35))
        mist.setAlpha(255 * 0.2 * d * (0.7 + 0.3 * Math.sin(i * 3.1 + t * 0.1)))
        p.fill(mist)
        p.ellipse((X + ox) * k, (Y + oy) * k, (4.4 + 1.2 * Math.sin(i)) * k, 0.42 * k)
      }
    }

    // The stave church in the east valley, standing on the hills, and its bell, which swings from the coda's first
    // chord (the bells that send the trolls running) and rings on over the credits.
    drawChurch(p, k, CHURCH[0] + ox, CHURCH[1] + oy, t, d)

    ctx.restore()

    // The upper flanks, from the cliff over the gate eastward: a skin of turf over the rock, dark at night, green in
    // the dawn, a few tufts on the shoulder. (The west flank below the cliff is the gate part's.)
    const tx0 = Math.max(x0, 20.2)
    if (tx0 < x1) drawTurf(p, k, tx0, x1, step, t, d)

    // West of the cliff, the skyline's edge: the mountain's rim catches the sky's light (a soft line, not an ink stroke).
    const rx1 = Math.min(x1, 20.2)
    if (rx1 > x0) {
      p.noFill()
      const rim = p.color(mixHex(STONE.mid, SKY.dawn, 0.5 * d))
      rim.setAlpha(120 + 100 * d)
      p.stroke(rim)
      p.strokeWeight(Math.max(1, 0.05 * k))
      p.beginShape()
      for (let x = x0; x <= rx1 + step; x += step) p.vertex(Math.min(x, rx1) * k, skyline(Math.min(x, rx1)) * k)
      p.endShape()
    }
  },
})

/** The turf on the upper flanks, from x0 to x1: a skin of grass over the rock, tufts on it, none in the crater. */
function drawTurf(p: p5, k: number, x0: number, x1: number, step: number, t: number, d: number): void {
  const grass = mixHex(mixHex(SKY.grass, SKY.night, 0.72), SKY.grass, d)
  const earth = mixHex(mixHex(WORKS.wood, STONE.deep, 0.55), mixHex(WORKS.wood, STONE.deep, 0.25), d)
  const thick = 0.17
  p.push()
  p.noStroke()
  // The earth under the grass, then the grass itself, both following the surface; where the crater is, the turf is
  // gone and the broken rock shows.
  for (const [col, depth] of [[earth, thick + 0.16], [grass, thick]] as const) {
    p.fill(col)
    p.beginShape()
    for (let x = x0; x <= x1 + step; x += step / 2) {
      const X = Math.min(x, x1)
      p.vertex(X * k, surface(X, t) * k)
    }
    for (let x = x1; x >= x0 - step; x -= step / 2) {
      const X = Math.max(x, x0)
      const gone = crater(X, t) > 0.02 ? 0 : 1
      const ragged = depth * (0.85 + 0.15 * Math.sin(X * 5.3) * Math.sin(X * 1.7))
      p.vertex(X * k, (surface(X, t) + ragged * gone) * k)
    }
    p.endShape(p.CLOSE)
  }
  // The crater's broken lip: the rock's lit edge where the cap came off.
  if (t >= LAST1 && x0 < CRATER.x + CRATER.half && x1 > CRATER.x - CRATER.half) {
    p.fill(mixHex(STONE.mid, STONE.light, 0.4 + 0.4 * d))
    p.beginShape()
    const a = CRATER.x - CRATER.half
    const b = CRATER.x + CRATER.half
    for (let x = a; x <= b; x += 0.05) p.vertex(x * k, surface(x, t) * k)
    for (let x = b; x >= a; x -= 0.05) p.vertex(x * k, (surface(x, t) + 0.09 + 0.05 * Math.sin(x * 9)) * k)
    p.endShape(p.CLOSE)
  }
  // Tufts: small clumps of blades standing up out of the turf. None in the crater, none in the hollow where he lies.
  const tuft = mixHex(mixHex(SKY.grass, SKY.night, 0.6), mixHex(SKY.grass, SKY.sun, 0.25), d)
  p.fill(tuft)
  const first = Math.ceil(x0 / 0.55)
  for (let i = first; i * 0.55 <= x1; i++) {
    if (hash(i, 7) < 0.45) continue
    const X = i * 0.55 + 0.4 * hash(i, 8)
    if (Math.abs(X - CRATER.x) < 1.8) continue
    if (Math.abs(X - REST[0]) < 0.45) continue
    const y = surface(X, t) + 0.03
    const h = 0.1 + 0.12 * hash(i, 9)
    const sway = 0.03 * Math.sin(t * 0.9 + i)
    for (let b = -1; b <= 1; b++) {
      const bx = X + b * 0.05
      p.triangle((bx - 0.025) * k, y * k, (bx + 0.025) * k, y * k, (bx + b * 0.05 + sway) * k, (y - h * (b === 0 ? 1 : 0.7)) * k)
    }
  }
  p.pop()
}

/**
 * The stave church, far off: a dark tarred silhouette with three stacked roofs, a ridge turret and its spire, the
 * gables' dragon heads; beside it the free-standing bell house, its bell swinging. At night a lit window. (x, y) is
 * the middle of its base, cells.
 */
function drawChurch(p: p5, k: number, x: number, y: number, t: number, d: number): void {
  // A stave church after Borgund: steep dark shingled roofs stacked tight over a low skirt roof, each tier a short
  // wall and a steeper, narrower roof, dragon heads rearing from the upper gables, one tall spire; tarred black, the
  // east slopes catching the dawn. Tall and narrow: never the flared, spreading tiers of a pagoda.
  const s = 1.3
  const u = (v: number) => v * s * k
  p.push()
  p.rectMode(p.CORNER)
  p.translate(x * k, y * k)
  p.noStroke()
  const tar = mixHex(SKY.tar, mixHex(SKY.tar, SKY.far, 0.5), 0.35 * d)
  const lit = mixHex(SKY.tar, SKY.dawn, 0.35 * d)
  const quad = (pts: [number, number][], col: string) => {
    p.fill(col)
    p.beginShape()
    for (const [a, b] of pts) p.vertex(u(a), u(b))
    p.endShape(p.CLOSE)
  }
  // The skirt roof round the foot (the svalgang) on its posts, and the nave's wall over it.
  quad([[-0.44, 0], [0.44, 0], [0.44, -0.05], [-0.44, -0.05]], mixHex(tar, SKY.far, 0.25))
  quad([[-0.52, -0.04], [0.52, -0.04], [0.4, -0.19], [-0.4, -0.19]], tar)
  quad([[0.12, -0.04], [0.52, -0.04], [0.4, -0.19], [0.1, -0.19]], lit)
  // The tiers: a short wall, then a steep roof overhanging it: [wall half-width, wall foot y, eaves half-width,
  // eaves y, ridge half-width, ridge y]. Each narrower and steeper: stepped, a building, not a tree.
  const tiers: [number, number, number, number, number, number][] = [
    [0.3, -0.18, 0.42, -0.31, 0.21, -0.57],
    [0.19, -0.56, 0.29, -0.67, 0.13, -0.88],
    [0.11, -0.87, 0.18, -0.97, 0.07, -1.1],
  ]
  tiers.forEach(([ww, wy, w0, y0, w1, y1], i) => {
    quad([[-ww, wy], [ww, wy], [ww, y0], [-ww, y0]], mixHex(tar, SKY.far, 0.18))
    quad([[-w0, y0], [w0, y0], [w1, y1], [-w1, y1]], tar)
    // The east slope in the dawn light.
    quad([[w0 * 0.3, y0], [w0, y0], [w1, y1], [w1 * 0.3, y1]], lit)
    // Dragon heads: a neck rearing up and out from each end of the two upper ridges, a small jaw at its tip.
    if (i > 0) {
      for (const sd of [-1, 1]) {
        p.fill(tar)
        p.beginShape()
        p.vertex(u(sd * w1 * 0.6), u(y1 + 0.005))
        p.bezierVertex(u(sd * (w1 + 0.06)), u(y1 - 0.02), u(sd * (w1 + 0.1)), u(y1 - 0.07), u(sd * (w1 + 0.17)), u(y1 - 0.17))
        p.vertex(u(sd * (w1 + 0.12)), u(y1 - 0.14))
        p.bezierVertex(u(sd * (w1 + 0.07)), u(y1 - 0.07), u(sd * (w1 + 0.02)), u(y1 - 0.045), u(sd * w1 * 0.5), u(y1 - 0.03))
        p.endShape(p.CLOSE)
      }
    }
  })
  // The spire: a short turret and a tall, needle-steep roof.
  quad([[-0.065, -1.09], [0.065, -1.09], [0.065, -1.2], [-0.065, -1.2]], tar)
  quad([[-0.1, -1.19], [0.1, -1.19], [0, -1.78]], tar)
  quad([[0.025, -1.19], [0.1, -1.19], [0, -1.78]], lit)
  // A lit window at night.
  if (d < 0.8) {
    const win = p.color(LAMP.flame)
    win.setAlpha(210 * (1 - d / 0.8))
    p.fill(win)
    p.rect(u(-0.025), u(-0.14), u(0.05), u(0.08))
  }

  // The bell house: two posts, an open belfry, a pyramid roof; the bell hangs from the beam and swings.
  const bx = 0.95
  p.fill(tar)
  p.quad(u(bx - 0.2), 0, u(bx + 0.2), 0, u(bx + 0.17), u(-0.28), u(bx - 0.17), u(-0.28))
  p.quad(u(bx - 0.17), u(-0.28), u(bx - 0.13), u(-0.28), u(bx - 0.13), u(-0.62), u(bx - 0.17), u(-0.62))
  p.quad(u(bx + 0.13), u(-0.28), u(bx + 0.17), u(-0.28), u(bx + 0.17), u(-0.62), u(bx + 0.13), u(-0.62))
  p.triangle(u(bx - 0.23), u(-0.6), u(bx + 0.23), u(-0.6), u(bx), u(-1.02))
  p.fill(lit)
  p.triangle(u(bx), u(-1.02), u(bx + 0.23), u(-0.6), u(bx + 0.09), u(-0.6))
  // It is rung from the first chord and rings on, a long even swing, slowing only at the very end.
  const ring = t >= CODA ? smooth(t, CODA, CODA + 1.2) * (1 - 0.55 * smooth(t, LAST2 + 20, LAST2 + 29)) : 0
  const a = 0.95 * ring * Math.sin((t - CODA) * ((Math.PI * 2) / 1.7))
  p.push()
  p.translate(u(bx), u(-0.58))
  p.rotate(a)
  p.fill(mixHex(SKY.bell, SKY.sun, 0.35 * d))
  // A bell: shoulder, waist, flared lip; the clapper's tongue just showing below it.
  p.beginShape()
  p.vertex(u(-0.045), u(0.03))
  p.bezierVertex(u(-0.075), u(0.03), u(-0.08), u(0.1), u(-0.085), u(0.15))
  p.bezierVertex(u(-0.09), u(0.19), u(-0.12), u(0.21), u(-0.125), u(0.225))
  p.vertex(u(0.125), u(0.225))
  p.bezierVertex(u(0.12), u(0.21), u(0.09), u(0.19), u(0.085), u(0.15))
  p.bezierVertex(u(0.08), u(0.1), u(0.075), u(0.03), u(0.045), u(0.03))
  p.endShape(p.CLOSE)
  p.fill(tar)
  p.quad(u(-0.012), u(0.2), u(0.012), u(0.2), u(0.01), u(0.26), u(-0.01), u(0.26))
  p.pop()
  p.pop()
}
