import type p5 from 'p5'
import { R, type Pt, type Seg } from '../../../../../parts'
import { box, carried, frame, glow, hash, knock, part, rgba, ring, route, smooth, type Companion, type PartShot, type Way } from '../kit'
import { hop } from '../physics'
import { CLUB_MAT, GLOBE_INK, GLOBE_MAT } from '../worlds'
import { keyed } from './shadow'

/**
 * The globe (196 → 214.877, `GLOBE`): to Paris.
 *
 * An old globe on a brass stand in the dark, lit by a lamp. A toy biplane
 * rides on a brass arm hung from the globe's north pole, and the two of them
 * sit in its two cockpits, him behind her. Its engine catches (197.451) and
 * the arm swings it east while the globe turns under it the other way: the
 * coast of California falls behind, the lights of Denver (198.856) and of New
 * York (201.038) come on as it passes over them, the Atlantic goes by, and it
 * comes to rest over Paris (204.719), where a brass pin stands out of the
 * globe: the pin trips the arm's clip, and the plane is free.
 *
 * It lifts off the arm and glides out beyond the globe, and Paris is there in
 * the dark: its streetlamps come on (205.578), then the tower's lights
 * (206.216), then the windows (208.271), and the tower shimmers. The plane
 * comes down onto the street (209.920), drops its tail (210.524), rolls, and
 * stops at a red door (211.940). She hops out (213.229), he hops out
 * (213.705), the door opens (214.065) and she goes in; he follows, and the
 * camera goes in at the door as the cover goes red.
 *
 * Globe space: the globe's centre is the origin, the street (the floor its
 * stand stands on, and Paris's) is y = STREET. The part's frame is globe space
 * moved by OFF, so that his seat in the plane when the part begins is
 * (-0.5, 0).
 *
 * The door is the Paris club's red (`CLUB_MAT.red`): the one colour here that
 * is not the globe's, because it is the club's door.
 */

const TAU = Math.PI * 2
const DEG = Math.PI / 180
const BG = GLOBE_INK.bg
const M = GLOBE_MAT

/* ------------------------------------------------------------------ the clock (show seconds, each on a measured onset) */

const BEGIN = 196
/** The engine catches; the arm begins to swing. */
const CATCH = 197.451
/** The lights of Denver, of New York, as it passes over them; the rest over Paris, where the pin trips the clip. */
const DENVER = 198.856
const NEW_YORK = 201.038
const OVER_PARIS = 204.719
/** Paris: its streetlamps, the tower's lights, its windows (two groups). */
const LAMPS = 205.578
const TOWER = 206.216
const WINDOWS = [208.271, 209.444]
/** Wheels down, the tail down, and the stop at the door. */
const TOUCH = 209.92
const TAIL = 210.524
const STOP = 211.94
/** Out: her, him. The door opens. */
const OUT_MIA = 213.229
const OUT_SEB = 213.705
const DOOR_OPEN = 214.065
const END = 214.877
/** Mia: ours from under the cover to under the red one. */
const MIA_FROM = 196.15
const MIA_TO = 214.86

export const GLOBE_HITS = [CATCH, DENVER, NEW_YORK, OVER_PARIS, LAMPS, TOWER, ...WINDOWS, TOUCH, TAIL, STOP, OUT_MIA, OUT_SEB, DOOR_OPEN]

/* ------------------------------------------------------------------ the globe */

const RG = 2.6
/** The axis leans right, as a desk globe's does. */
const TILT = 0.36
/** How far above the surface the arm carries the plane, and where the brass ring stands off it. */
const HOVER = 0.34
const RING = RG + 0.15
/** The street: the floor the stand's foot and Paris stand on. */
const STREET = 4.35

type V3 = [number, number, number]

/** A point at latitude `lat`, `rel` east of the meridian facing us, radius `r` (x right, y up, z toward us). */
const surf = (lat: number, rel: number, r: number): V3 => [r * Math.cos(lat) * Math.sin(rel), r * Math.sin(lat), r * Math.cos(lat) * Math.cos(rel)]
/** Tilted and put on the screen (y down); z is still toward us. */
const proj = ([x, y, z]: V3): V3 => [x * Math.cos(TILT) + y * Math.sin(TILT), -(-x * Math.sin(TILT) + y * Math.cos(TILT)), z]

/** The land, as [lon, lat] outlines: rough, the way an old globe's engraver had it. */
const LAND: [number, number][][] = [
  // North America.
  [[-166, 62], [-162, 70], [-140, 70], [-125, 70], [-110, 73], [-95, 72], [-82, 69], [-76, 63], [-65, 60], [-60, 55], [-56, 50], [-66, 45], [-70, 42], [-74, 40.5], [-76, 35], [-81, 31], [-80, 25.5], [-82, 28], [-85, 30], [-90, 29], [-97, 27], [-97, 22], [-92, 18.5], [-87, 21.5], [-88, 16], [-83.5, 14.5], [-83, 10], [-78, 8.5], [-80, 7.5], [-85.5, 10], [-92, 14.5], [-100, 17], [-105.5, 20.5], [-109.5, 23], [-112, 29], [-114.5, 31.5], [-117, 32.5], [-120.5, 34.5], [-122.5, 37.8], [-124, 42], [-124.5, 48], [-128, 51], [-133, 56], [-140, 60], [-150, 61], [-155, 58], [-164, 55]],
  // Greenland.
  [[-73, 78], [-60, 82], [-40, 83], [-20, 81], [-18, 76], [-22, 70], [-32, 68], [-42, 60], [-50, 62], [-53, 68], [-58, 75]],
  // South America.
  [[-78, 8.5], [-72, 12], [-62, 11], [-52, 5], [-50, 0], [-44, -2.5], [-35, -6], [-37, -12], [-40, -20], [-48, -26], [-53, -34], [-58, -38], [-65, -42], [-66, -48], [-69, -52], [-72, -54], [-75, -48], [-73.5, -38], [-71.5, -30], [-70.5, -18], [-76, -14], [-81, -6], [-80, 0], [-77.5, 4]],
  // Eurasia, cut at 100° E (never seen from here).
  [[-9, 43], [-9, 37], [-6, 36], [-1, 37], [3, 42], [7, 43.5], [9, 44.2], [12, 42], [15.5, 38], [16, 40.5], [18.5, 40.2], [15.5, 42.5], [13.5, 45.5], [19, 42], [22, 37], [24, 38], [26, 40.5], [29, 41], [36, 36], [35, 33], [34, 31], [35, 28], [39, 21], [43, 13], [45, 13], [52, 16], [56, 18], [59, 22], [56, 26], [51, 24], [48, 30], [51, 28], [56, 27], [58, 25], [62, 25], [67, 24], [70, 21], [73, 17], [77, 8], [80, 13], [80, 16], [88, 22], [92, 21], [98, 16], [100, 13], [100, 78], [80, 73], [70, 73], [60, 70], [50, 68], [40, 66], [33, 70], [28, 71], [20, 70], [15, 68], [12, 65], [8, 63], [5, 61], [6, 58], [10, 59], [12, 56], [14, 55.5], [18, 59], [22, 65.5], [25, 65.5], [28, 62], [30, 60], [24, 57.5], [21, 55.5], [14, 54], [10, 54.5], [9, 57], [8, 55], [8, 53.5], [5, 53], [3, 51], [1.5, 50.8], [-1.5, 49.5], [-4.5, 48.5], [-1.5, 46.5], [-1.5, 44]],
  // Great Britain, Ireland, Iceland.
  [[-5.7, 50], [-3, 50.5], [1.4, 51.2], [1.7, 52.8], [0, 53.5], [-1.5, 55], [-2, 57.7], [-3.5, 58.6], [-5, 58.6], [-6, 56.5], [-5, 55], [-3, 54.5], [-4.5, 53.5], [-4.5, 52], [-5.2, 51.7], [-3, 51.4]],
  [[-10, 51.6], [-6, 52], [-6, 54], [-7.5, 55.3], [-10, 54], [-10, 52.5]],
  [[-24, 65.5], [-22, 66.4], [-16, 66.5], [-13.5, 65], [-18, 63.4], [-22, 63.8]],
  // Africa, Madagascar.
  [[-17, 21], [-17, 15], [-15, 11], [-13, 8], [-8, 4.5], [-2, 5], [5, 6], [9, 4], [9.5, 1], [12, -5], [13, -12], [12, -17], [15, -27], [18, -33], [20, -35], [26, -34], [31, -29], [33, -26], [35, -24], [35, -18], [40, -15], [40, -10], [39, -5], [42, 0], [48, 5], [51, 11], [44, 11], [43, 12], [39, 16], [35, 23], [33, 28], [32, 31], [29, 31], [25, 32], [20, 31], [15, 32], [11, 34], [10, 37], [3, 37], [-2, 35], [-6, 36], [-10, 31], [-13, 27]],
  [[44, -25], [47, -25], [50, -15], [49, -12], [44, -17]],
]
/** Seas cut back out of the land. */
const SEAS: [number, number][][] = [
  // Hudson Bay.
  [[-95, 60], [-93, 57], [-85, 55], [-80, 52], [-78, 58], [-80, 62], [-88, 64], [-94, 62]],
  // The Black Sea.
  [[28, 41.5], [28, 44], [30, 46], [33, 46], [35, 45], [38, 47], [41, 42], [36, 41.5], [32, 41]],
]
/** The cities whose lights come on, and the plane's way: lon, lat. */
const LA: [number, number] = [-118.2, 34.05]
const CITIES: { at: [number, number]; on: number }[] = [
  { at: LA, on: -Infinity },
  { at: [-104.99, 39.74], on: DENVER },
  { at: [-74.0, 40.71], on: NEW_YORK },
  { at: [2.35, 48.86], on: OVER_PARIS },
]
const PARIS_LL = CITIES[3].at

/**
 * The journey: how far along it is (0 at Los Angeles, 1 at Paris), gathering way from rest when the engine catches,
 * over Denver and New York on their onsets, and coming to rest over Paris.
 */
const journey = keyed([
  [BEGIN, 0, 0],
  [CATCH, 0, 0],
  [DENVER, (DENVER_J()), 0],
  [NEW_YORK, NY_J(), 0],
  [OVER_PARIS, 1, 0],
])
function DENVER_J(): number {
  return (-104.99 - LA[0]) / (PARIS_LL[0] - LA[0])
}
function NY_J(): number {
  return (-74.0 - LA[0]) / (PARIS_LL[0] - LA[0])
}
/** The plane's latitude along the way (by how far along it is). */
const latOf = keyed([
  [0, 34.05, 0],
  [DENVER_J(), 38.6, 0],
  [NY_J(), 40.8, 0],
  [1, 48.86, 0],
])
/** The arm swings from 40° west of the meridian facing us to 32° east of it; the globe turns the rest of the way under it. */
const ARM0 = -40 * DEG
const ARM1 = 32 * DEG
const SPIN0 = LA[0] * DEG - ARM0
const SPIN1 = PARIS_LL[0] * DEG - ARM1
const armAt = (j: number) => ARM0 + (ARM1 - ARM0) * j
const spinAt = (j: number) => SPIN0 + (SPIN1 - SPIN0) * j

/** Where the plane is on the arm at journey `j`, and which way it heads, in globe space; `fs` is how foreshortened it is. */
function onArm(j: number): { x: number; y: number; th: number; fs: number } {
  const at = (u: number): V3 => proj(surf(latOf(u)[0] * DEG, armAt(u), RG + HOVER))
  const [x, y] = at(j)
  // It heads east along its parallel.
  const e = 0.01
  const lat = latOf(j)[0] * DEG
  const A = surf(lat, armAt(j) - e, RG + HOVER)
  const B = surf(lat, armAt(j) + e, RG + HOVER)
  const a = proj(A)
  const b = proj(B)
  const d3 = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]) || 1
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const th = Math.atan2(dy, dx)
  // The arm holds it by its belly.
  return { x: x + Math.sin(th) * BELLY, y: y - Math.cos(th) * BELLY, th, fs: Math.max(0.55, Math.hypot(dx, dy) / d3) }
}

/* ------------------------------------------------------------------ the plane */

/** The plane, in its own frame: u forward, v up, from a point on the fuselage's line between the cockpits. */
const BELLY = 0.14
const COCKPIT_REAR: Pt = [-0.3, 0.13]
const COCKPIT_FRONT: Pt = [0.06, 0.13]
const WHEEL: Pt = [0.22, -0.37]
const WHEEL_R = 0.1
const SKID: Pt = [-0.74, -0.3]
/** Tail down on its skid: nose up by this much. */
const PARKED = Math.atan2(SKID[1] - (WHEEL[1] - WHEEL_R), WHEEL[0] - SKID[0])

interface Pose {
  x: number
  y: number
  th: number
  fs: number
}
const toWorld = (s: Pose, [u, v]: Pt): Pt => [s.x + Math.cos(s.th) * u * s.fs + Math.sin(s.th) * v, s.y + Math.sin(s.th) * u * s.fs - Math.cos(s.th) * v]

/** Where the plane stands with its wheel on the street at `xc`, nosed up by `up`. */
function onGround(xc: number, up: number): Pose {
  const th = -up
  const wb: Pt = [WHEEL[0], WHEEL[1] - WHEEL_R]
  const x = xc - (Math.cos(th) * wb[0] + Math.sin(th) * wb[1])
  const y = STREET - (Math.sin(th) * wb[0] - Math.cos(th) * wb[1])
  return { x, y, th, fs: 1 }
}

/** The glide: off the arm, out and down past the city's roofs to the street. Two cubic pieces, speed carried through. */
const TD_X = 13.35
const STOP_X = 15.55
const ROLL_V = (2 * (STOP_X - TD_X)) / (STOP - TOUCH)
/** Halfway down it passes in front of the tower. */
const MID_T = 207.3
const MID: Pt = [7.35, 0.5]
const MID_V: Pt = [2.3, 1.3]
function hermite(p0: Pt, v0: Pt, p1: Pt, v1: Pt, T: number, s: number): { p: Pt; v: Pt } {
  const u = Math.max(0, Math.min(1, s / T))
  const u2 = u * u
  const u3 = u2 * u
  const h00 = 2 * u3 - 3 * u2 + 1
  const h10 = u3 - 2 * u2 + u
  const h01 = -2 * u3 + 3 * u2
  const h11 = u3 - u2
  const d00 = (6 * u2 - 6 * u) / T
  const d10 = 3 * u2 - 4 * u + 1
  const d01 = (-6 * u2 + 6 * u) / T
  const d11 = 3 * u2 - 2 * u
  return {
    p: [h00 * p0[0] + h10 * T * v0[0] + h01 * p1[0] + h11 * T * v1[0], h00 * p0[1] + h10 * T * v0[1] + h01 * p1[1] + h11 * T * v1[1]],
    v: [d00 * p0[0] + d10 * v0[0] + d01 * p1[0] + d11 * v1[0], d00 * p0[1] + d10 * v0[1] + d01 * p1[1] + d11 * v1[1]],
  }
}

const RELEASE = onArm(1)
const LANDING = onGround(TD_X, 0)

/** The plane's pose at show time `t`. */
function planeAt(t: number): Pose {
  if (t <= OVER_PARIS) return onArm(journey(t)[0])
  if (t < TOUCH) {
    const first = t < MID_T
    const { p, v } = first
      ? hermite([RELEASE.x, RELEASE.y], [0.7, -0.05], MID, MID_V, MID_T - OVER_PARIS, t - OVER_PARIS)
      : hermite(MID, MID_V, [LANDING.x, LANDING.y], [ROLL_V, 0.35], TOUCH - MID_T, t - MID_T)
    // It noses round from the arm's heading to its flight's, and flares level for the street.
    const flying = Math.atan2(v[1], v[0])
    const th = RELEASE.th + (flying - RELEASE.th) * smooth(t, OVER_PARIS, OVER_PARIS + 0.9)
    const flare = smooth(t, TOUCH - 0.9, TOUCH)
    return { x: p[0], y: p[1], th: th * (1 - flare), fs: RELEASE.fs + (1 - RELEASE.fs) * smooth(t, OVER_PARIS, OVER_PARIS + 1.2) }
  }
  // On the street: rolling out to the stop; a small bounce off the wheels; the tail down on its onset; the brakes.
  const s = Math.min(t, STOP) - TOUCH
  const xc = TD_X + ROLL_V * s - (ROLL_V * s * s) / (2 * (STOP - TOUCH))
  const tail = t < TAIL ? PARKED * Math.pow(smooth(t, TOUCH + 0.12, TAIL), 1.6) : PARKED - 0.05 * ring(t - TAIL, 2.2, 0.18)
  const brake = t > STOP ? 0.07 * Math.exp(-(t - STOP) / 0.25) * Math.sin(Math.min(Math.PI, ((t - STOP) / 0.3) * Math.PI)) : 0
  const pose = onGround(xc, tail - brake)
  const bob = t < TOUCH + 0.3 ? 0.035 * Math.sin((Math.PI * (t - TOUCH)) / 0.3) : 0
  return { ...pose, y: pose.y - bob }
}
/** Mia in the front seat, with a little life of her own: she sits up to look when Paris lights up. */
function miaSeat(t: number): Pt {
  const up = 0.05 * (smooth(t, TOWER - 0.3, TOWER + 0.4) - smooth(t, WINDOWS[0] + 0.3, WINDOWS[0] + 1.3))
  const lean = -0.03 * smooth(t, OVER_PARIS - 0.4, OVER_PARIS + 0.2) * (1 - smooth(t, LAMPS, LAMPS + 0.8))
  return toWorld(planeAt(t), [COCKPIT_FRONT[0] + lean, COCKPIT_FRONT[1] + up])
}
const sebSeat = (t: number): Pt => toWorld(planeAt(t), COCKPIT_REAR)

/* ------------------------------------------------------------------ Paris */

const DOOR_X = 16.75
const DOOR_W = 0.5
const DOOR_H = 0.84
const ON_STREET = STREET - R
/** Where each of them comes down off the plane, and the door's threshold. */
const MIA_DOWN: Pt = [STOP_X + 0.72, ON_STREET]
const SEB_DOWN: Pt = [STOP_X + 0.6, ON_STREET]
const THRESHOLD: Pt = [DOOR_X, ON_STREET]

interface House {
  x0: number
  x1: number
  top: number
  roof: number
  windows: { x: number; y: number; on: number }[]
  chimneys: number[]
  door?: boolean
}
const TOWER_X = 7.7
const TOWER_H = 6.6
const LAMPS_X = [5.3, 9.9, 12.6, 14.6, 18.3, 20.6]

function buildCity(): House[] {
  const houses: House[] = []
  let x = 4.1
  let i = 0
  while (x < 23) {
    const w = 1.3 + hash(i, 3) * 0.8
    const h = 1.8 + hash(i, 4) * 1.05
    const door = x < DOOR_X && x + w > DOOR_X
    const cols = Math.max(2, Math.floor((w - 0.25) / 0.36))
    const floors = Math.floor((h - 0.5) / 0.44)
    const windows: House['windows'] = []
    for (let r = 0; r < floors; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + 0.2 + ((c + 0.5) * (w - 0.4)) / cols
        const wy = STREET - 0.55 - r * 0.44
        if (door && Math.abs(wx - DOOR_X) < 0.35 && r === 0) continue
        const pick = hash(i * 13 + c, r, 7)
        windows.push({ x: wx, y: wy, on: pick < 0.52 ? WINDOWS[0] : pick < 0.8 ? WINDOWS[1] : Infinity })
      }
    }
    const chimneys = [x + w * (0.2 + 0.2 * hash(i, 5)), x + w * (0.65 + 0.2 * hash(i, 6))]
    houses.push({ x0: x, x1: x + w, top: STREET - h, roof: 0.42 + hash(i, 8) * 0.15, windows, chimneys, door })
    x += w + 0.02
    i++
  }
  return houses
}

/** The tower's lights, precomputed: points along its edges and its platforms, each with its own shimmer. */
function towerHalf(v: number): number {
  // Half its width at height v (0 at its foot, 1 at its top): the curve of the legs.
  return 1.25 * Math.pow(1 - v, 2.1) + 0.035
}
function buildTower(): { x: number; y: number; ph: number }[] {
  const out: { x: number; y: number; ph: number }[] = []
  let n = 0
  for (let i = 0; i <= 44; i++) {
    const v = 0.26 + (i / 44) * 0.72
    for (const side of [-1, 1]) out.push({ x: TOWER_X + side * towerHalf(v), y: STREET - v * TOWER_H, ph: hash(n++, 11) })
  }
  for (const v of [0.3, 0.52]) {
    const w = towerHalf(v)
    for (let i = 1; i < 8; i++) out.push({ x: TOWER_X - w + (2 * w * i) / 8, y: STREET - v * TOWER_H, ph: hash(n++, 11) })
  }
  return out
}

/* ------------------------------------------------------------------ drawing */

/** The globe itself, turned to `spin`, with its pin and its city lights. */
function drawGlobe(p: p5, k: number, t: number, spin: number): void {
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const place = (lon: number, lat: number, r = RG): V3 => proj(surf(lat * DEG, lon * DEG - spin, r))
  const onDisc = ([x, y, z]: V3): Pt => {
    if (z >= 0) return [x, y]
    const L = Math.hypot(x, y) || 1
    return [(x / L) * RG, (y / L) * RG]
  }
  // The sea.
  p.noStroke()
  p.fill(M.sea)
  p.circle(0, 0, X(2 * RG))
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, RG * k, 0, TAU)
  ctx.clip()
  // Its lines: a meridian every 30°, and the parallels.
  p.noFill()
  p.stroke(rgba(M.parchment, 0.3))
  p.strokeWeight(Math.max(1, 0.018 * k))
  const line = (pts: V3[]) => {
    let open = false
    for (const q of pts) {
      if (q[2] < 0) {
        if (open) p.endShape()
        open = false
        continue
      }
      if (!open) p.beginShape()
      open = true
      p.vertex(X(q[0]), X(q[1]))
    }
    if (open) p.endShape()
  }
  for (let m = 0; m < 12; m++) {
    const pts: V3[] = []
    for (let a = -80; a <= 80; a += 5) pts.push(place(m * 30, a))
    line(pts)
  }
  for (const lat of [-60, -30, 0, 30, 60]) {
    const pts: V3[] = []
    for (let lon = -180; lon <= 180; lon += 6) pts.push(place(lon, lat))
    if (lat === 0) p.stroke(rgba(M.parchment, 0.45))
    line(pts)
    if (lat === 0) p.stroke(rgba(M.parchment, 0.3))
  }
  // The land, engraved.
  const shape = (poly: [number, number][], fill: string, edge: string | null) => {
    const q = poly.map(([lon, lat]) => place(lon, lat))
    if (q.every((v) => v[2] < 0)) return
    if (edge) {
      p.stroke(edge)
      p.strokeWeight(Math.max(1, 0.02 * k))
    } else p.noStroke()
    p.fill(fill)
    p.beginShape()
    for (const v of q) {
      const [x, y] = onDisc(v)
      p.vertex(X(x), X(y))
    }
    p.endShape(p.CLOSE)
  }
  for (const poly of LAND) shape(poly, M.parchment, M.land)
  for (const poly of SEAS) shape(poly, M.sea, M.land)
  // The cities: a pinpoint each once it is lit, and a short flare as it lights.
  for (const c of CITIES) {
    const q = place(c.at[0], c.at[1])
    if (q[2] < 0.3 || t < c.on) continue
    const age = t - c.on
    const a = 0.85 * smooth(q[2], 0.3, 1)
    p.noStroke()
    p.fill(rgba(M.city, a))
    p.circle(X(q[0]), X(q[1]), X(0.07))
    const f = knock(age, 0.3)
    if (f > 0.02) {
      p.stroke(rgba(M.city, a * f))
      p.strokeWeight(Math.max(1, 0.025 * k))
      const L = 0.1 + 0.32 * f
      p.line(X(q[0] - L), X(q[1]), X(q[0] + L), X(q[1]))
      p.line(X(q[0]), X(q[1] - L), X(q[0]), X(q[1] + L))
    }
  }
  // The lamp's light on it, from high on the left; the far side in shadow.
  const g = ctx.createRadialGradient(-0.95 * k, -1.15 * k, 0, -0.5 * k, -0.6 * k, 3.4 * k)
  g.addColorStop(0, rgba(M.parchment, 0.22))
  g.addColorStop(0.35, rgba(M.parchment, 0))
  g.addColorStop(0.75, rgba(BG, 0.3))
  g.addColorStop(1, rgba(BG, 0.78))
  ctx.fillStyle = g
  ctx.fillRect(-RG * k, -RG * k, 2 * RG * k, 2 * RG * k)
  ctx.restore()
  // The pin standing out of Paris.
  const base = place(PARIS_LL[0], PARIS_LL[1])
  const tip = place(PARIS_LL[0], PARIS_LL[1], RG + HOVER - 0.06)
  if (base[2] > 0) {
    p.stroke(BG)
    p.strokeWeight(Math.max(1, 0.06 * k))
    p.line(X(base[0]), X(base[1]), X(tip[0]), X(tip[1]))
    p.stroke(M.brass)
    p.strokeWeight(Math.max(1, 0.035 * k))
    p.line(X(base[0]), X(base[1]), X(tip[0]), X(tip[1]))
    p.stroke(BG)
    p.strokeWeight(Math.max(1, 0.02 * k))
    p.fill(M.brass)
    p.circle(X(tip[0]), X(tip[1]), X(0.13))
  }
  p.noFill()
  p.stroke(rgba(BG, 0.9))
  p.strokeWeight(Math.max(1, 0.03 * k))
  p.circle(0, 0, X(2 * RG))
}

/** The ring, the axis's pins, and the stand down to the street. Behind the globe (the ring) and under it. */
function drawStand(p: p5, k: number): void {
  const X = (v: number) => v * k
  const ink = BG
  // The meridian ring, round the globe in the plane of the axis.
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(Math.max(1, 0.16 * k))
  p.circle(0, 0, X(2 * RING))
  p.stroke(M.brass)
  p.strokeWeight(Math.max(1, 0.1 * k))
  p.circle(0, 0, X(2 * RING))
  // The stand: a neck from the ring's foot, a turned stem, three legs.
  const top = RING + 0.05
  p.stroke(ink)
  p.strokeWeight(Math.max(1, 0.025 * k))
  p.fill(M.brass)
  p.beginShape()
  p.vertex(X(-0.12), X(top))
  p.vertex(X(0.12), X(top))
  p.bezierVertex(X(0.1), X(top + 0.25), X(0.32), X(top + 0.45), X(0.26), X(top + 0.7))
  p.bezierVertex(X(0.2), X(top + 0.85), X(0.08), X(top + 0.85), X(0.09), X(STREET - 0.55))
  p.vertex(X(-0.09), X(STREET - 0.55))
  p.bezierVertex(X(-0.08), X(top + 0.85), X(-0.2), X(top + 0.85), X(-0.26), X(top + 0.7))
  p.bezierVertex(X(-0.32), X(top + 0.45), X(-0.1), X(top + 0.25), X(-0.12), X(top))
  p.endShape(p.CLOSE)
  p.ellipse(0, X(STREET - 0.55), X(0.36), X(0.14))
  for (const side of [-1, 1]) {
    p.beginShape()
    p.vertex(X(side * 0.1), X(STREET - 0.6))
    p.bezierVertex(X(side * 0.5), X(STREET - 0.55), X(side * 0.85), X(STREET - 0.35), X(side * 1.05), X(STREET - 0.02))
    p.vertex(X(side * 0.92), X(STREET))
    p.bezierVertex(X(side * 0.75), X(STREET - 0.3), X(side * 0.45), X(STREET - 0.45), X(side * 0.08), X(STREET - 0.48))
    p.endShape(p.CLOSE)
  }
  p.rect(0, X(STREET - 0.24), X(0.12), X(0.48), X(0.04))
}

/** The pins at the axis's ends, the hub the arm hangs from, and the arm to the plane (or, freed, sprung up). */
function drawArm(p: p5, k: number, t: number): void {
  const X = (v: number) => v * k
  const j = journey(Math.min(t, OVER_PARIS))[0]
  const a = armAt(j)
  const lat = latOf(j)[0] + (t > OVER_PARIS ? 7 * (1 - Math.exp(-(t - OVER_PARIS) / 0.12) * Math.cos(2 * Math.PI * 1.6 * (t - OVER_PARIS))) : 0)
  const pts: V3[] = []
  for (let i = 0; i <= 18; i++) pts.push(proj(surf((90 - (i / 18) * (90 - lat)) * DEG, a, RG + HOVER)))
  const hub = proj([0, RG + HOVER + 0.06, 0])
  const south = proj([0, -RING, 0])
  p.noStroke()
  p.fill(M.brass)
  p.circle(X(south[0]), X(south[1]), X(0.14))
  p.noFill()
  p.stroke(BG)
  p.strokeWeight(Math.max(1, 0.075 * k))
  p.beginShape()
  p.vertex(X(hub[0]), X(hub[1]))
  for (const q of pts) p.vertex(X(q[0]), X(q[1]))
  p.endShape()
  p.stroke(M.brass)
  p.strokeWeight(Math.max(1, 0.045 * k))
  p.beginShape()
  p.vertex(X(hub[0]), X(hub[1]))
  for (const q of pts) p.vertex(X(q[0]), X(q[1]))
  p.endShape()
  // The clip at its end: two jaws, which spring open when the pin trips them.
  const end = pts[pts.length - 1]
  const prev = pts[pts.length - 2]
  const dir = Math.atan2(end[1] - prev[1], end[0] - prev[0])
  const open = 0.35 + 0.55 * smooth(t, OVER_PARIS, OVER_PARIS + 0.07)
  p.strokeWeight(Math.max(1, 0.035 * k))
  for (const s of [-1, 1]) p.line(X(end[0]), X(end[1]), X(end[0] + 0.12 * Math.cos(dir + s * open)), X(end[1] + 0.12 * Math.sin(dir + s * open)))
  // The hub: a brass cap on the pole.
  p.stroke(BG)
  p.strokeWeight(Math.max(1, 0.025 * k))
  p.fill(M.brass)
  p.circle(X(hub[0]), X(hub[1]), X(0.24))
  p.circle(X(hub[0]), X(hub[1]), X(0.1))
}

/** The prop's turn: still until the engine catches, then up to speed; it runs down after the stop. */
function propAngle(t: number): number {
  if (t < CATCH) return 0.4
  const s = t - CATCH
  const upTo = Math.min(s, 0.6)
  let a = 0.4 + 60 * (upTo * upTo) / 1.2 + (s > 0.6 ? 60 * (Math.min(t, STOP) - CATCH - 0.6) : 0)
  if (t > STOP) {
    const d = t - STOP
    a += 60 * 0.9 * (1 - Math.exp(-d / 0.9))
  }
  return a
}
const propSpeed = (t: number): number => (t < CATCH ? 0 : t < STOP ? Math.min(1, (t - CATCH) / 0.6) : Math.exp(-(t - STOP) / 0.9))

/** The plane, behind the two of them: tail, wings, struts, wheels, prop. */
function drawPlaneBack(p: p5, k: number, s: Pose, t: number): void {
  const X = (v: number) => v * k
  p.push()
  p.translate(X(s.x), X(s.y))
  p.rotate(s.th)
  p.scale(s.fs, 1)
  const W = (u: number, v: number): [number, number] => [X(u), X(-v)]
  p.stroke(BG)
  p.strokeWeight(Math.max(1, 0.028 * k))
  // Tail: the fin and the tailplane.
  p.fill(M.wing)
  p.beginShape()
  p.vertex(...W(-0.6, 0.06))
  p.bezierVertex(...W(-0.66, 0.2), ...W(-0.7, 0.36), ...W(-0.78, 0.37))
  p.bezierVertex(...W(-0.85, 0.37), ...W(-0.86, 0.26), ...W(-0.84, 0.04))
  p.endShape(p.CLOSE)
  p.rect(...W(-0.68, 0.02), X(0.34), X(0.05), X(0.025))
  // The skid.
  p.line(...W(-0.68, 0.0), ...W(SKID[0], SKID[1]))
  // Undercarriage: two struts down to the wheel.
  p.stroke(M.brass)
  p.strokeWeight(Math.max(1, 0.03 * k))
  p.line(...W(0.08, -0.08), ...W(WHEEL[0], WHEEL[1]))
  p.line(...W(0.38, -0.08), ...W(WHEEL[0], WHEEL[1]))
  p.stroke(BG)
  p.strokeWeight(Math.max(1, 0.028 * k))
  p.fill(BG)
  p.circle(...W(WHEEL[0], WHEEL[1]), X(2 * WHEEL_R))
  p.fill(M.brass)
  p.circle(...W(WHEEL[0], WHEEL[1]), X(0.07))
  // The lower wing, the struts, the upper wing.
  p.fill(M.wing)
  p.rect(...W(0.33, -0.12), X(0.5), X(0.06), X(0.03))
  p.stroke(M.brass)
  p.strokeWeight(Math.max(1, 0.025 * k))
  p.line(...W(0.16, -0.1), ...W(0.2, 0.44))
  p.line(...W(0.5, -0.1), ...W(0.54, 0.44))
  p.line(...W(0.24, 0.08), ...W(0.3, 0.44))
  p.stroke(BG)
  p.strokeWeight(Math.max(1, 0.028 * k))
  p.fill(M.wing)
  p.rect(...W(0.36, 0.47), X(0.52), X(0.065), X(0.03))
  // The prop: a blade seen edge-on while it is still, a pale disc once it spins.
  const sp = propSpeed(t)
  const ang = propAngle(t)
  const hub = W(0.68, -0.01)
  p.noStroke()
  if (sp > 0.05) {
    p.fill(rgba(M.parchment, 0.22 * sp))
    p.ellipse(hub[0], hub[1], X(0.07), X(0.6))
  }
  p.stroke(rgba(M.land, 1 - 0.8 * sp))
  p.strokeWeight(Math.max(1, 0.045 * k))
  const L = 0.29 * Math.cos(ang)
  p.line(hub[0], hub[1] - X(L), hub[0], hub[1] + X(L))
  p.pop()
}

/** The fuselage, in front of them: they sit down in it. */
function drawPlaneFront(p: p5, k: number, s: Pose): void {
  const X = (v: number) => v * k
  p.push()
  p.translate(X(s.x), X(s.y))
  p.rotate(s.th)
  p.scale(s.fs, 1)
  const W = (u: number, v: number): [number, number] => [X(u), X(-v)]
  p.stroke(BG)
  p.strokeWeight(Math.max(1, 0.028 * k))
  p.fill(M.wing)
  p.beginShape()
  p.vertex(...W(-0.82, 0.05))
  p.bezierVertex(...W(-0.5, 0.08), ...W(-0.2, 0.1), ...W(0.1, 0.1))
  p.vertex(...W(0.5, 0.1))
  p.bezierVertex(...W(0.6, 0.1), ...W(0.64, 0.02), ...W(0.64, -0.01))
  p.bezierVertex(...W(0.64, -0.06), ...W(0.6, -0.13), ...W(0.5, -0.13))
  p.bezierVertex(...W(0.1, -0.13), ...W(-0.4, -0.06), ...W(-0.82, 0.0))
  p.endShape(p.CLOSE)
  // A brass stripe along it, the cowling's ring, the spinner.
  p.noStroke()
  p.fill(M.brass)
  p.beginShape()
  p.vertex(...W(-0.8, 0.02))
  p.bezierVertex(...W(-0.4, 0.0), ...W(0.0, -0.02), ...W(0.46, -0.02))
  p.vertex(...W(0.46, -0.06))
  p.bezierVertex(...W(0.0, -0.06), ...W(-0.4, -0.03), ...W(-0.8, 0.0))
  p.endShape(p.CLOSE)
  p.stroke(BG)
  p.strokeWeight(Math.max(1, 0.022 * k))
  p.line(...W(0.47, 0.1), ...W(0.47, -0.13))
  p.fill(M.brass)
  p.ellipse(...W(0.68, -0.01), X(0.09), X(0.13))
  // The cockpits' rims.
  p.noFill()
  p.strokeWeight(Math.max(1, 0.03 * k))
  for (const c of [COCKPIT_REAR, COCKPIT_FRONT]) p.line(...W(c[0] - 0.15, 0.1), ...W(c[0] + 0.15, 0.1))
  p.pop()
}

/** Paris: the sky over it, the tower beyond the roofs, the houses, the street and its lamps, the red door. */
function drawParis(p: p5, k: number, t: number, s: GlobeState, f: { x0: number; x1: number; y0: number; y1: number }): void {
  const X = (v: number) => v * k
  const lit = smooth(t, LAMPS - 0.3, WINDOWS[0] + 0.6)
  // The sky over the city: the room's dark becomes a night with the city's glow low in it.
  if (lit > 0) {
    glow(p, k, 11.5, STREET - 1.2, 8.5, M.night, lit, 1.25, 0.62)
    glow(p, k, 11, STREET - 0.8, 7, M.city, 0.13 * lit, 1.3, 0.45)
  }
  // The tower, beyond the roofs.
  const tOn = smooth(t, TOWER - 0.05, TOWER + 0.1)
  const tower = (inset: number) => {
    p.beginShape()
    for (let i = 0; i <= 24; i++) {
      const v = i / 24
      p.vertex(X(TOWER_X - towerHalf(v) + inset), X(STREET - v * TOWER_H))
    }
    for (let i = 24; i >= 0; i--) {
      const v = i / 24
      p.vertex(X(TOWER_X + towerHalf(v) - inset), X(STREET - v * TOWER_H))
    }
    p.endShape(p.CLOSE)
  }
  p.noStroke()
  p.fill(M.night)
  tower(0)
  // Its lattice: a few crossings a stage, and the platforms.
  p.stroke(rgba(M.brass, 0.25 + 0.5 * tOn))
  p.strokeWeight(Math.max(1, 0.02 * k))
  const stages = [0.3, 0.52, 0.82, 0.97]
  let v0 = 0.12
  for (const v1 of stages) {
    const n = 3
    for (let i = 0; i < n; i++) {
      const a = v0 + ((v1 - v0) * i) / n
      const b = v0 + ((v1 - v0) * (i + 1)) / n
      p.line(X(TOWER_X - towerHalf(a)), X(STREET - a * TOWER_H), X(TOWER_X + towerHalf(b)), X(STREET - b * TOWER_H))
      p.line(X(TOWER_X + towerHalf(a)), X(STREET - a * TOWER_H), X(TOWER_X - towerHalf(b)), X(STREET - b * TOWER_H))
    }
    v0 = v1
  }
  p.stroke(rgba(M.brass, 0.4 + 0.5 * tOn))
  p.strokeWeight(Math.max(1, 0.04 * k))
  for (const v of [0.3, 0.52]) {
    const w = towerHalf(v) + 0.08
    p.line(X(TOWER_X - w), X(STREET - v * TOWER_H), X(TOWER_X + w), X(STREET - v * TOWER_H))
  }
  p.noFill()
  p.stroke(rgba(M.brass, 0.3 + 0.6 * tOn))
  p.strokeWeight(Math.max(1, 0.025 * k))
  tower(0)
  // Its lights: on with the tower, then shimmering.
  if (tOn > 0) {
    glow(p, k, TOWER_X, STREET - 0.55 * TOWER_H, 2.4, M.city, 0.14 * tOn, 0.55, 1.4)
    const sh = smooth(t, TOWER + 0.9, TOWER + 2)
    p.noStroke()
    for (const q of s.tower) {
      const tw = 0.5 + 0.5 * Math.sin(t * (9 + 5 * q.ph) + q.ph * TAU)
      const a = tOn * (0.75 - sh * 0.55 + sh * 0.6 * tw * tw)
      p.fill(rgba(M.city, a))
      p.circle(X(q.x), X(q.y), X(0.045 + sh * 0.03 * tw))
    }
    const beacon = TOWER_X
    glow(p, k, beacon, STREET - TOWER_H - 0.05, 0.3, M.city, 0.6 * tOn, 1, 1)
  }
  // The houses: mansard roofs of zinc, chimneys, windows.
  for (const h of s.houses) {
    if (h.x1 < f.x0 - 1 || h.x0 > f.x1 + 1) continue
    p.stroke(BG)
    p.strokeWeight(Math.max(1, 0.025 * k))
    p.fill(M.night)
    p.rect(X((h.x0 + h.x1) / 2), X((h.top + STREET) / 2), X(h.x1 - h.x0), X(STREET - h.top))
    // The roof, a steep zinc slope with dormers, and its chimneys.
    p.fill(rgba(M.sea, 0.35))
    p.quad(X(h.x0 - 0.04), X(h.top), X(h.x1 + 0.04), X(h.top), X(h.x1 - 0.18), X(h.top - h.roof), X(h.x0 + 0.18), X(h.top - h.roof))
    p.fill(M.night)
    for (const c of h.chimneys) p.rect(X(c), X(h.top - h.roof - 0.08), X(0.1), X(0.22))
    // A cornice line.
    p.stroke(rgba(M.parchment, 0.18))
    p.line(X(h.x0), X(h.top + 0.06), X(h.x1), X(h.top + 0.06))
    p.noStroke()
    for (const w of h.windows) {
      const on = smooth(t, w.on - 0.05, w.on + 0.12)
      p.fill(BG)
      p.rect(X(w.x), X(w.y), X(0.15), X(0.25))
      if (on > 0) {
        p.fill(rgba(M.city, 0.85 * on))
        p.rect(X(w.x), X(w.y), X(0.15), X(0.25))
      }
    }
  }
  // The street: a pavement, and the lamps along it.
  p.noStroke()
  p.fill(BG)
  p.rect(X(10), X(STREET + 0.5), X(40), X(1))
  p.stroke(rgba(M.parchment, 0.2))
  p.strokeWeight(Math.max(1, 0.02 * k))
  p.line(X(-4), X(STREET), X(24), X(STREET))
  const lampOn = smooth(t, LAMPS - 0.04, LAMPS + 0.08)
  for (const x of LAMPS_X) {
    if (x < f.x0 - 2 || x > f.x1 + 2) continue
    p.stroke(BG)
    p.strokeWeight(Math.max(1, 0.05 * k))
    p.line(X(x), X(STREET), X(x), X(STREET - 1.25))
    p.strokeWeight(Math.max(1, 0.03 * k))
    p.line(X(x), X(STREET - 1.2), X(x + 0.14), X(STREET - 1.3))
    p.noStroke()
    p.fill(lampOn > 0 ? rgba(M.city, 0.3 + 0.7 * lampOn) : BG)
    p.quad(X(x + 0.06), X(STREET - 1.28), X(x + 0.22), X(STREET - 1.28), X(x + 0.19), X(STREET - 1.44), X(x + 0.09), X(STREET - 1.44))
    if (lampOn > 0) {
      glow(p, k, x + 0.14, STREET - 1.33, 0.9, M.city, 0.22 * lampOn)
      glow(p, k, x + 0.14, STREET, 1.1, M.city, 0.16 * lampOn, 1, 0.25)
    }
  }
  // The red door, its lamp, and, once it is open, the light inside.
  const open = smooth(t, DOOR_OPEN - 0.12, DOOR_OPEN + 0.25)
  const dx0 = DOOR_X - DOOR_W / 2
  p.stroke(BG)
  p.strokeWeight(Math.max(1, 0.03 * k))
  p.fill(M.brass)
  p.rect(X(DOOR_X), X(STREET - DOOR_H / 2 - 0.03), X(DOOR_W + 0.12), X(DOOR_H + 0.06), X(0.02))
  p.fill(BG)
  p.rect(X(DOOR_X), X(STREET - DOOR_H / 2), X(DOOR_W), X(DOOR_H))
  if (open > 0) {
    p.noStroke()
    p.fill(rgba(M.city, 0.75 * open))
    p.rect(X(DOOR_X), X(STREET - DOOR_H / 2), X(DOOR_W), X(DOOR_H))
    glow(p, k, DOOR_X, STREET, 1.2, M.city, 0.35 * open, 1, 0.3)
  }
  // The leaf swings in on its left hinge: narrower as it goes.
  const lw = DOOR_W * (1 - 0.82 * open)
  p.stroke(BG)
  p.fill(CLUB_MAT.red)
  p.rect(X(dx0 + lw / 2), X(STREET - DOOR_H / 2), X(lw), X(DOOR_H))
  p.noFill()
  p.stroke(rgba(BG, 0.55))
  p.rect(X(dx0 + lw / 2), X(STREET - DOOR_H * 0.72), X(lw * 0.62), X(DOOR_H * 0.3))
  p.rect(X(dx0 + lw / 2), X(STREET - DOOR_H * 0.28), X(lw * 0.62), X(DOOR_H * 0.3))
  p.noStroke()
  p.fill(M.brass)
  p.circle(X(dx0 + lw * 0.85), X(STREET - DOOR_H * 0.48), X(0.05))
  // The lamp over it.
  p.fill(lampOn > 0 ? rgba(M.city, 0.4 + 0.6 * lampOn) : BG)
  p.circle(X(DOOR_X), X(STREET - DOOR_H - 0.16), X(0.12))
  if (lampOn > 0) glow(p, k, DOOR_X, STREET - DOOR_H - 0.16, 0.7, M.city, 0.3 * lampOn)
}

/* ------------------------------------------------------------------ the part */

interface GlobeState {
  houses: House[]
  tower: { x: number; y: number; ph: number }[]
}

/** The part's frame is globe space moved so that his seat, when the part begins, is (-0.5, 0). */
const SEAT0 = sebSeat(BEGIN)
const OFF: Pt = [-0.5 - SEAT0[0], -SEAT0[1]]
const fr = ([x, y]: Pt): Pt => [x + OFF[0], y + OFF[1]]

export const globe = part<GlobeState>(
  {
    name: 'globe',
    draw(p, s, c) {
      const k = c.k
      const t = c.t + BEGIN
      const X = (v: number) => v * k
      p.translate(X(OFF[0]), X(OFF[1]))
      const f0 = frame(p, k)
      // The lamp the globe stands in.
      glow(p, k, -0.9, -0.4, 6.2, M.city, 0.13, 1, 1.1)
      drawParis(p, k, t, s, f0)
      drawStand(p, k)
      const j = journey(Math.min(t, OVER_PARIS))[0]
      drawGlobe(p, k, t, spinAt(j))
      drawArm(p, k, t)
      drawPlaneBack(p, k, planeAt(t), t)
    },
    over(p, s, c) {
      const k = c.k
      const t = c.t + BEGIN
      p.translate(k * OFF[0], k * OFF[1])
      drawPlaneFront(p, k, planeAt(t))
      void s
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    // In the rear seat from the start, carried by the plane until he hops out.
    const up = OUT_SEB - 0.42
    const segs: Seg[] = carried((u) => fr(sebSeat(u + slot.begin)), 0, at(up), Math.ceil((up - slot.begin) * 30))
    const from: Way = { at: at(up), p: fr(sebSeat(up)) }
    segs.push(
      ...route([
        from,
        hop(from, fr(SEB_DOWN), at(OUT_SEB)),
        { at: at(END - 0.5), p: fr([THRESHOLD[0] - 0.42, ON_STREET]), ease: 'out' },
        { at: at(END), p: fr([THRESHOLD[0] - 0.1, ON_STREET]), ease: 'inout' },
      ]),
    )
    const houses = buildCity()
    // Mia: in the front seat; out over the nose; to the door, and in.
    const miaUp = OUT_MIA - 0.45
    const miaOut = (t: number): Pt => {
      if (t <= miaUp) return miaSeat(t)
      if (t <= OUT_MIA) {
        const a = miaSeat(miaUp)
        const u = (t - miaUp) / (OUT_MIA - miaUp)
        const T = OUT_MIA - miaUp
        const lift = (16 * T * T) / 8
        return [a[0] + (MIA_DOWN[0] - a[0]) * u, a[1] + (MIA_DOWN[1] - a[1]) * u - lift * 4 * u * (1 - u)]
      }
      // To the door; when it opens, in and away into the light.
      const u = smooth(t, OUT_MIA + 0.12, DOOR_OPEN)
      const x = MIA_DOWN[0] + (THRESHOLD[0] - 0.05 - MIA_DOWN[0]) * u
      const deep = smooth(t, DOOR_OPEN, MIA_TO)
      return [x + 0.17 * deep, ON_STREET - 0.1 * deep]
    }
    const mia = (t: number): Companion => {
      const [x, y] = fr(miaOut(t))
      // Going in: smaller as she goes deeper into the doorway.
      const deep = smooth(t, DOOR_OPEN, MIA_TO)
      return { x, y, scale: 1 - 0.5 * deep }
    }
    return {
      cells: box(-4 + OFF[0], -4 + OFF[1], 19 + OFF[0], STREET + 2 + OFF[1], 1),
      exit: [fr(THRESHOLD)[0] - 0.1 + 0.5, fr(THRESHOLD)[1]],
      lane: { segs, fire: at(CATCH) },
      state: { houses, tower: buildTower() },
      company: [{ from: MIA_FROM, to: MIA_TO, who: 'mia', at: mia }],
    }
  },
  (): PartShot[] => {
    const key = (t: number, cells: number, hold: Pt, w = 1): PartShot => ({ t, cells, hold: fr(hold), w })
    const seat = (t: number) => sebSeat(t)
    return [
      // Close on the plane over California, in the dark; the lights come up on it.
      key(196.05, 3.0, seat(196)),
      key(197.4, 3.2, seat(197.4)),
      // Out to the whole globe as it turns.
      key(200.4, 7.4, [0.2, -0.3]),
      key(202.7, 7.0, [0.5, -0.8]),
      // In on Paris on the globe: the pin, the clip.
      key(204.5, 3.6, [RELEASE.x + 0.1, RELEASE.y + 0.3]),
      key(205.2, 3.8, [RELEASE.x + 0.5, RELEASE.y + 0.3]),
      // Out with the plane, and Paris beyond the globe; past the tower.
      key(207.4, 9.2, [5.8, 0.9]),
      key(209.9, 5.8, [TD_X + 0.4, 2.5]),
      key(211.9, 4.2, [STOP_X + 0.4, 3.2]),
      key(213.7, 3.1, [DOOR_X - 0.6, 3.7]),
      key(214.3, 2.7, [DOOR_X - 0.1, 3.75]),
      key(214.86, 1.1, [DOOR_X, STREET - DOOR_H / 2]),
    ]
  },
)
