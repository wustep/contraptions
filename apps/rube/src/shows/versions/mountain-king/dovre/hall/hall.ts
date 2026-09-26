import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, frame, hash } from '../kit'
import { drawLantern, drawTorch, flame, flicker, glow } from '../lantern'
import { beatAt } from '../music'
import { quake, stalactite } from '../rock'
import { drawTroll, type Pen, type TrollDrawn } from '../troll'
import { GOLD, LAMP, STONE, TROLL, WORKS } from '../worlds'
import {
  CHIMNEY_X, COURT_UP, CRACK, CRACKS, CROWN_LAMP, DAIS, FL, FLOOR_BREAK, GALLERY_Y, HAMMERS, HATCH, LANTERNS, LURCH, OPEN, PILLARS, PILLAR_FALL,
  ROW_Y, SMASH, SNORT_A, SNORT_B, STEPS, TAILS, THRONE, TORCH_A, TORCH_B, ease, ring, type Tail,
} from './hall-clock'
import { COURT, SCEPTRE, courtierAt, kingAt, shout, type KingPose, type Pose } from './hall-court'

/**
 * The Mountain King's hall (the hall builder's), drawn in the court part's frame for any show time: the director's
 * finale imports `drawHall` to see it come down. A great cavern of living rock under the mountain's summit, its
 * floor at y = R: the court in tiers on the west side (benches cut in the rock, a dark gallery above), two pillars
 * of living rock among them and a third east of the throne, the dais and the throne with its carved high-seat posts,
 * the King, and the lights, every one of them lit by the chain as Peer goes by:
 *
 *   - three braziers of banked embers on the front bench, breathing with the sleepers beside them (their only light
 *     at the start); a snort into each flares it;
 *   - two torches on the first pillar (its west and east faces), caught from the first two braziers' sparks;
 *   - a chain of three lanterns on an oiled rope from over the elder's brazier up to the crown-lamp over the throne:
 *     the elder's snort catches the first, and the fire runs along the rope to the crown-lamp, and the King is lit.
 *
 * Then the wake, the chase, the King's sceptre on the dais, the crack, the hatch (the trolls' way down to the mine)
 * opening under Peer. And in the coda: the court freezes at the bells and flees; the pillars crack and fall, one a
 * chord; the throne lurches and topples on two blows; stalactites fall from the vault; the lights go out one a hammer blow. The chimney's
 * column (x 7.5) is kept clear: its floor breaks open at `FLOOR_BREAK` so Peer can come up through it, and the vault
 * over it has always had its smoke hole.
 */

/* ------------------------------------------------------------------ the room */

/** The vault, west to east, over the floor: where the hollow's top is (the smoke hole at the chimney's column aside). */
const VAULT: Pt[] = [
  [-0.4, -2.1], [0.3, -2.6], [0.25, -5.6], [1.1, -8.0], [2.8, -9.5], [5.2, -10.5], [CHIMNEY_X, -10.95], [10.2, -11.2], [13.2, -11.05],
  [16.4, -10.5], [19.7, -9.9], [23.0, -9.0], [26.0, -7.5], [28.4, -5.2], [29.6, -2.7], [29.7, -2.05], [30.6, -1.95],
]

/** The vault's height at x (a smooth line through `VAULT`). */
export function vaultY(x: number): number {
  const v = VAULT
  if (x <= v[0][0]) return v[0][1]
  if (x >= v[v.length - 1][0]) return v[v.length - 1][1]
  let i = 0
  while (i + 1 < v.length && v[i + 1][0] < x) i++
  const [x0, y0] = v[i]
  const [x1, y1] = v[i + 1]
  const u = (x - x0) / (x1 - x0)
  const s = u * u * (3 - 2 * u)
  return y0 + (y1 - y0) * (0.5 * u + 0.5 * s)
}

/** A pillar's half-width at height y (an hourglass of flowstone: wide at the floor, narrow at the waist, spreading into the vault). */
const WAIST = -5.0
function pillarHalf(y: number, top: number): number {
  if (y > WAIST) {
    const u = (y - WAIST) / (FL - WAIST)
    return 0.34 + 0.34 * u * u
  }
  const u = (WAIST - y) / (WAIST - top)
  return 0.34 + 0.62 * u * u * u
}

/* ------------------------------------------------------------------ the lights */

interface Light {
  x: number
  y: number
  /** 0..1: how much it burns. */
  s: number
  /** Reach of its light (cells) and how strongly it lights what it reaches. */
  r: number
  w: number
  col: string
}

/** A lamp catching over a third of a second, from `at`; out over a quarter second after `out`. */
const burning = (t: number, at: number, out = Infinity): number => ease(t, at - 0.05, at + 0.3) * (1 - ease(t, out, out + 0.25))

const BRAZIERS = [
  { x: 3.3, who: 0 },
  { x: 5.3, who: 1 },
  { x: 12.35, who: 3 },
]
const BRAZIER_Y = ROW_Y[0] - 0.62
const TORCH_Y = -3.05
const torchFoot = (side: -1 | 1): Pt => [PILLARS[0] + side * pillarHalf(TORCH_Y, vaultY(PILLARS[0])), TORCH_Y]
const TORCHES = [
  { foot: torchFoot(-1), side: -1 as const, at: TORCH_A, out: HAMMERS[0] },
  { foot: torchFoot(1), side: 1 as const, at: TORCH_B, out: HAMMERS[1] },
]
const TORCH_SIZE = 0.6
const torchFlame = (i: number): Pt => [TORCHES[i].foot[0] + TORCHES[i].side * TORCH_SIZE * 0.5, TORCHES[i].foot[1] - TORCH_SIZE * 0.95]

/**
 * The hammer blows shake the braziers off their ledge: each tips over on its blow and pours its embers onto the floor,
 * where the spilled coals catch and burn up in a spreading fire. As the lamps go out one a blow, these take over, so
 * the hall comes down brighter blow by blow, lit from below by its own fires. They burn down after the last chords.
 */
const SPILLS = [
  { b: 0, at: HAMMERS[1], dir: 1 },
  { b: 2, at: HAMMERS[3], dir: -1 },
  { b: 1, at: HAMMERS[5], dir: 1 },
]
/** A brazier's tip (radians, the way it falls) at t. */
function tipOf(b: number, t: number): number {
  const sp = SPILLS.find((q) => q.b === b)
  if (!sp || t < sp.at) return 0
  const u = Math.min(1, (t - sp.at) / 0.22)
  const settle = 1.25 + 0.08 * Math.exp(-(t - sp.at - 0.22) / 0.2) * Math.cos((t - sp.at - 0.22) * 18) * (u >= 1 ? 1 : 0)
  return sp.dir * (u < 1 ? 1.25 * u * u : settle)
}
/** How big a spilled fire is (0..1): it catches on the blow, spreads, burns high, and dies down long after. */
function spillFire(sp: (typeof SPILLS)[number], t: number): number {
  if (t < sp.at + 0.08) return 0
  const a = t - sp.at - 0.08
  return Math.min(1, a / 0.35) * (1 - 0.85 * ease(t, 150, 158))
}
/** Where a spill's fire lies on the floor: its middle and half-width. */
function spillAt(sp: (typeof SPILLS)[number], t: number): { x: number; half: number } {
  const bx = BRAZIERS[sp.b].x
  const spread = 1 - Math.exp(-Math.max(0, t - sp.at - 0.1) / 0.3)
  return { x: bx + sp.dir * (0.55 + 0.6 * spread), half: 0.3 + 1.0 * spread }
}
/** The spilled fires on the floor: embers, and flames of uneven heights along them. */
function drawSpills(p: p5, c: Pen, t: number): void {
  const k = c.k
  for (const [i, sp] of SPILLS.entries()) {
    const f = spillFire(sp, t)
    if (f <= 0.01) continue
    const { x, half } = spillAt(sp, t)
    p.noStroke()
    p.fill(alpha(p, mixHex(WORKS.rust, LAMP.flame, 0.35), 0.9 * f))
    p.beginShape()
    p.vertex((x - half) * k, (FL + 0.01) * k)
    for (let j = 0; j <= 6; j++) {
      const u = j / 6
      p.vertex((x - half + 2 * half * u) * k, (FL - 0.05 - 0.05 * Math.sin(u * Math.PI) * (0.6 + 0.4 * hash(i, j, 41))) * k)
    }
    p.vertex((x + half) * k, (FL + 0.01) * k)
    p.endShape(p.CLOSE)
    const n = 7
    for (let j = 0; j < n; j++) {
      const u = (j + 0.5) / n
      const h = (0.45 + 0.6 * hash(i, j, 43)) * f * (0.6 + 0.4 * Math.sin(u * Math.PI))
      flame(p, c, x - half + 2 * half * u, FL - 0.04, h, t, i * 7 + j, Math.min(1, f * 1.3))
    }
  }
}

/** The oiled rope: from the first lantern's hook, over the elder's brazier, up to the crown-lamp's hook over the throne. */
const ROPE0: Pt = [BRAZIERS[2].x, -2.3]
const CROWN: Pt = [THRONE.x, -6.05]
const ROPE1: Pt = [THRONE.x, -6.95]
const SAG = 1.0
/** Where the crown-lamp's shackle is (its three chains' meeting point): on the hook until the first blow, then with the lamp. */
function shackleAt(t: number): Pt {
  if (t < LAMP_SNAP) return ROPE1
  const cr = crownAt(t)
  const [ax, ay] = shackleOff(cr.down)
  return [cr.x + ax * Math.cos(cr.tilt) - ay * Math.sin(cr.tilt), cr.y + ax * Math.sin(cr.tilt) + ay * Math.cos(cr.tilt)]
}
/** The shackle from the ring's middle: over it on its chains, slumping onto it once the lamp is down. */
const shackleOff = (down: number): Pt =>
  down < 0 ? [0, ROPE1[1] - CROWN[1]] : [0.18 * (1 - Math.exp(-down / 0.08)), -(0.14 + (CROWN[1] - ROPE1[1] - 0.14) * Math.exp(-down / 0.06))]
/**
 * The oiled rope at t: from the post to the hook. On the first blow the hook's chain tears out of the vault and the
 * lamp, the hook and the chain come down together, so the rope's east end is dragged down with them onto the dais
 * and it hangs from the post to the fallen lamp, slacker.
 */
const ropeAt = (t: number) => {
  const e = t < LAMP_SNAP ? ROPE1 : shackleAt(t)
  const f = t < LAMP_SNAP ? 0 : Math.min(1, (t - LAMP_SNAP) / (LAMP_LANDS - LAMP_SNAP))
  const sag = SAG * (1 - 0.55 * f)
  return (u: number): Pt => [ROPE0[0] + (e[0] - ROPE0[0]) * u, ROPE0[1] + (e[1] - ROPE0[1]) * u + sag * 4 * u * (1 - u)]
}
const LANTERN_U = [0, 0.36, 0.7]
/** How far along the rope the fire has run (0 at the first lantern, 1 at the crown-lamp). */
function burnt(t: number): number {
  const ts = [LANTERNS[0] + 0.3, LANTERNS[1], LANTERNS[2], CROWN_LAMP]
  const us = [0, LANTERN_U[1], LANTERN_U[2], 1]
  if (t <= ts[0]) return 0
  for (let i = 1; i < ts.length; i++) if (t <= ts[i]) return us[i - 1] + ((us[i] - us[i - 1]) * (t - ts[i - 1])) / (ts[i] - ts[i - 1])
  return 1
}

/**
 * The crown-lamp comes down on the collapse: the first hammer blow snaps it off its hook, it falls clear of the
 * toppling throne and lands on the dais on the third blow (with the throne and a slab of the vault), rocks flat and
 * burns on there, low, until the last blow puts every light out. Nothing is left hanging over the throne but the
 * hook's iron chain, which holds the oiled rope.
 */
/** How the hung lamps swing (rad): a slow drift, and the mountain's shakes. */
function swayAt(t: number): number {
  const [qx, qy] = quake(t)
  return 0.02 * Math.sin(t * 1.3) + 6 * (qx + 0.5 * qy)
}
const LAMP_SNAP = HAMMERS[0]
const LAMP_LANDS = HAMMERS[2]
const LAMP_REST = DAIS.top - 0.14
function crownAt(t: number): { x: number; y: number; tilt: number; down: number } {
  const [x, y0] = CROWN
  if (t < LAMP_SNAP) return { x, y: y0, tilt: 0, down: -1 }
  if (t < LAMP_LANDS) {
    // It leaves the hook as it was swinging (turned about the hook), and tips further as it falls.
    const a = swayAt(LAMP_SNAP) * 0.6
    const hang = CROWN[1] - ROPE1[1]
    const [sx, sy] = [ROPE1[0] - hang * Math.sin(a), ROPE1[1] + hang * Math.cos(a)]
    const u = (t - LAMP_SNAP) / (LAMP_LANDS - LAMP_SNAP)
    return { x: sx + (x + 0.12 - sx) * u * u, y: sy + (LAMP_REST - sy) * u * u, tilt: a + (0.22 - a) * u * u, down: -1 }
  }
  // It lands on its east edge with a clang, slaps flat and rocks a little, long and damped.
  const s = t - LAMP_LANDS
  const tilt = 0.22 * Math.exp(-s / 0.05) * Math.cos(s * 30) * (s < 0.1 ? 1 : 0) + 0.06 * Math.exp(-s / 0.4) * Math.sin((2 * Math.PI * s) / 0.36)
  const hop = s < 0.16 ? 0.06 * Math.sin((Math.PI * s) / 0.16) : 0
  return { x: x + 0.12, y: LAMP_REST - hop, tilt, down: s }
}

/** A brazier's embers: how hot, breathing with the sleeper beside it (brighter on the out-breath). */
function heatOf(t: number, who: number): number {
  const breathOut = 0.5 + 0.5 * Math.cos(Math.PI * beatAt(t) + COURT[who].seed * 1.7)
  return (0.55 + 0.25 * breathOut) * (1 - ease(t, HAMMERS[5], 147.3))
}

function lightsAt(t: number, poses: Pose[]): Light[] {
  const out: Light[] = []
  // The tunnels' lantern light spilling in at the west door, once they are lit (the tunnels part lights them).
  const spill = ease(t, 36, 39.5) * (1 - ease(t, HAMMERS[5], HAMMERS[5] + 0.6))
  if (spill > 0) out.push({ x: 0.1, y: -1.1, s: 0.55 * spill, r: 3.2, w: 0.5, col: LAMP.glow })
  const flare = 1 + 0.35 * shout(t)
  for (const b of BRAZIERS) {
    const f = poses[b.who].puff
    out.push({ x: b.x, y: BRAZIER_Y - 0.1, s: Math.min(1, 0.5 * heatOf(t, b.who) + f), r: 2.1 + 2.4 * f, w: 0.75, col: mixHex(WORKS.rust, LAMP.glow, 0.35 + 0.5 * f) })
  }
  for (const sp of SPILLS) {
    const f = spillFire(sp, t)
    if (f > 0) {
      const { x } = spillAt(sp, t)
      out.push({ x, y: FL - 0.5, s: Math.min(1, f * (0.85 + 0.15 * flicker(t, sp.b + 20))), r: 6.2, w: 0.95, col: mixHex(LAMP.glow, LAMP.flame, 0.4) })
    }
  }
  TORCHES.forEach((tc, i) => {
    const s = burning(t, tc.at, tc.out)
    if (s > 0) {
      const [x, y] = torchFlame(i)
      out.push({ x, y, s: s * flicker(t, i + 3) * flare, r: 6.4, w: 0.95, col: LAMP.glow })
    }
  })
  LANTERNS.forEach((at, i) => {
    const s = burning(t, at + (i === 0 ? 0.12 : 0), HAMMERS[2 + i])
    if (s > 0) {
      const [x, y] = ropeAt(t)(LANTERN_U[i])
      out.push({ x, y: y + 0.7, s: s * flicker(t, i + 7) * flare, r: 4.4, w: 0.8, col: LAMP.glow })
    }
  })
  const cs = burning(t, CROWN_LAMP, HAMMERS[5])
  if (cs > 0) {
    // Once it is down on the dais it lights the hall from low, and less far.
    const cr = crownAt(t)
    const low = cr.down >= 0 ? 1 : 0
    out.push({ x: cr.x, y: cr.y + 0.4 - 0.5 * low, s: cs * flicker(t, 11) * flare * (1 - 0.3 * low), r: 8.6 - 2.4 * low, w: 1.0, col: LAMP.glow })
  }
  return out
}

/** How lit a point of the hall is, 0 (the dark) to 1, by the lights burning. */
function litAt(lights: Light[], x: number, y: number): number {
  let v = 0.03
  for (const l of lights) {
    const d = Math.hypot(x - l.x, y - l.y)
    if (d < l.r) v += l.s * l.w * Math.pow(1 - d / l.r, 1.2)
  }
  return Math.max(0, Math.min(1, v))
}

/* ------------------------------------------------------------------ small drawings */

const ctxOf = (p: p5) => p.drawingContext as CanvasRenderingContext2D

/** The pen for something in the dark: its ink sinks toward the rock with the light, so an unlit sleeper is a shape, not a drawing. */
const dim = (c: Pen, lit: number): Pen => ({ ...c, ink: mixHex(c.bg, c.ink, 0.22 + 0.78 * Math.max(0, Math.min(1, lit))) })

/** A shape through points (cells), closed, filled. */
function poly(p: p5, k: number, pts: Pt[], curve = false): void {
  p.beginShape()
  if (curve) {
    p.curveVertex(pts[0][0] * k, pts[0][1] * k)
    for (const [x, y] of pts) p.curveVertex(x * k, y * k)
    p.curveVertex(pts[pts.length - 1][0] * k, pts[pts.length - 1][1] * k)
  } else for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** The hollow of the hall: the back wall, a step lighter than the rock; the smoke hole going up over the chimney's column. */
function drawRoom(p: p5, c: Pen, lit: number): void {
  const k = c.k
  // From the west wall's inner face: the doorway west of it, and the tunnel beyond, are the tunnels part's to draw.
  const pts: Pt[] = [[0.3, FL + 0.02], [0.3, -2.6]]
  for (const [x, y] of VAULT) {
    if (x <= 0.3) continue
    if (x === CHIMNEY_X) {
      pts.push([x - 0.95, vaultY(x - 0.95)], [x - 0.55, -12.4], [x + 0.55, -12.4], [x + 0.95, vaultY(x + 0.95)])
      continue
    }
    pts.push([x, y])
  }
  pts.push([30.6, FL + 0.02])
  p.noStroke()
  p.fill(mixHex(mixHex(STONE.deep, STONE.dark, 0.5), STONE.dark, lit))
  poly(p, k, pts)
}

/**
 * The court's benches: ledges of the living rock stepping up from the floor to the dark gallery, each a little
 * shorter than the one under it as the vault closes over them, with an uneven lip and a ragged end stepping down
 * into the approach. No boards, no back panel: the riser under each lip is the rock's own dark face.
 */
const LEDGES = [
  { x0: 0.3, x1: 12.9 },
  { x0: 0.3, x1: 12.35 },
  { x0: 0.3, x1: 11.75 },
  { x0: 0.3, x1: 11.1 },
]
function drawTerraces(p: p5, c: Pen, lit: (x: number, y: number) => number): void {
  const k = c.k
  const seats = [ROW_Y[0], ROW_Y[1], ROW_Y[2], GALLERY_Y]
  p.noStroke()
  for (let r = 3; r >= 0; r--) {
    const top = seats[r]
    const bottom = r === 0 ? FL : seats[r - 1]
    const { x0, x1 } = LEDGES[r]
    const h = bottom - top
    // The lip: the seat's edge, uneven, a knot every half cell or so.
    const n = Math.round((x1 - x0) * 2.2)
    const lip: Pt[] = []
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n
      lip.push([x, top + (i === 0 ? 0 : 0.07 * (hash(r, i, 71) - 0.5) + 0.03 * Math.sin(x * 1.7 + r * 2))])
    }
    // Its end: broken back and down in two or three steps, never a straight cut.
    const end: Pt[] = [
      [x1 + 0.1 + 0.08 * hash(r, 72), top + 0.12 * h],
      [x1 - 0.05 + 0.1 * hash(r, 73), top + 0.4 * h],
      [x1 + 0.2 + 0.12 * hash(r, 74), top + 0.62 * h],
      [x1 + 0.32 + 0.1 * hash(r, 75), bottom + 0.02],
    ]
    const l = 0.3 * lit(6, (top + bottom) / 2)
    // The rock face under the lip, dark, taking a little of the light.
    p.fill(mixHex(mixHex(STONE.deep, STONE.dark, 0.5), STONE.mid, 0.04 + 0.45 * l))
    poly(p, k, [...lip, ...end, [x0, bottom + 0.02]])
    // The lip's worn edge, catching the light, following it (a band, not a board).
    const lipLit = lit(x1 - 3, top)
    p.fill(mixHex(STONE.dark, STONE.light, 0.12 + 0.55 * Math.min(1, lipLit)))
    const band = 0.07
    poly(p, k, [...lip, ...[...lip].reverse().map(([x, y], j): Pt => [x, y + band * (0.7 + 0.6 * hash(r, j, 76))])])
  }
  // The court's ways out at the west end of each bench: low dark archways into the trolls' warren (clear of the
  // west door's pier).
  p.fill(mixHex(STONE.deep, TROLL.shade, 0.35))
  for (const y of [ROW_Y[1], ROW_Y[2], GALLERY_Y]) {
    const h = 1.15
    const [a, b] = [0.86, 1.56]
    p.beginShape()
    p.vertex(a * k, y * k)
    p.vertex(a * k, (y - h * 0.7) * k)
    p.bezierVertex(a * k, (y - h) * k, b * k, (y - h) * k, b * k, (y - h * 0.7) * k)
    p.vertex(b * k, y * k)
    p.endShape(p.CLOSE)
  }
}

/**
 * The hall's west door: a round-topped doorway hewn through a pier of the living rock between the tunnel's end and
 * the hall, about 1.7 cells high, its jambs ragged, the rock whole over it. The tunnel's lit end is framed by stone,
 * and its light falls off through the passage into the hall. The pier is the rock itself (the paper), so it is seen
 * by its lit edges: the west face and the arch's soffit in the tunnel's light, the east face in the hall's.
 */
const DOOR_W = -0.05
const DOOR_E = 0.76
const DOOR_TOP = FL - 1.7
const DOOR_SPRING = FL - 1.3
/** The arch's soffit, west to east: a hewn round head from the west jamb over to the east, a little uneven. */
const SOFFIT: Pt[] = (() => {
  const out: Pt[] = []
  const mid = (DOOR_W + DOOR_E) / 2
  const half = (DOOR_E - DOOR_W) / 2 - 0.06
  for (let j = 0; j <= 12; j++) {
    const a = Math.PI * (1 - j / 12)
    const rough = j === 0 || j === 12 ? 0 : 0.022 * (hash(j, 81) - 0.5)
    out.push([mid + half * Math.cos(a) + rough, DOOR_SPRING - (DOOR_SPRING - DOOR_TOP) * Math.sin(a) + rough])
  }
  return out
})()
/** The pier's west face (the tunnel's end), top to the jamb's foot, and its east face (the hall's wall), jamb up. */
const PIER_WEST: Pt[] = [[DOOR_W - 0.02, -3.45], [DOOR_W + 0.03, -2.8], [DOOR_W - 0.04, -2.5], [DOOR_W + 0.02, -2.05], [DOOR_W - 0.03, -1.62], [DOOR_W + 0.01, DOOR_SPRING - 0.1], [DOOR_W - 0.02, DOOR_SPRING + 0.1], [DOOR_W + 0.05, DOOR_SPRING + 0.16]]
const PIER_EAST: Pt[] = [[DOOR_E - 0.05, DOOR_SPRING + 0.14], [DOOR_E + 0.02, DOOR_SPRING + 0.09], [DOOR_E - 0.01, DOOR_SPRING - 0.12], [DOOR_E + 0.05, -1.95], [DOOR_E - 0.01, -2.45], [DOOR_E + 0.04, -3.0], [DOOR_E - 0.02, -3.6], [DOOR_E - 0.08, -4.25], [DOOR_E - 0.14, -4.8]]

/**
 * A rectangle (cells) filled with `col` fading in from alpha 0 at x0 to 1 at x1, eased (a smooth ramp, no bands).
 * A raw canvas gradient inside save/restore, so p5's own fill is untouched.
 */
function fadeIn(p: p5, k: number, x0: number, x1: number, y0: number, y1: number, col: string): void {
  const ctx = ctxOf(p)
  const cc = p.color(col)
  const rgb = `${p.red(cc)},${p.green(cc)},${p.blue(cc)}`
  ctx.save()
  const g = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  for (let j = 0; j <= 8; j++) {
    const u = j / 8
    g.addColorStop(u, `rgba(${rgb},${(u * u * (3 - 2 * u)).toFixed(4)})`)
  }
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.restore()
}

function drawDoorway(p: p5, c: Pen, t: number, lit: (x: number, y: number) => number, passage: string): void {
  const k = c.k
  // The tunnel's lamps light its end (the tunnels part lights them as the flame chases him down to the door).
  const L = ease(t, 36, 39.5) * (1 - ease(t, HAMMERS[5], HAMMERS[5] + 0.6))
  p.noStroke()
  // The passage under the arch: the tunnel's light falling off into the dark of the hall's first ledge.
  const x1 = 0.34
  const [py0, py1] = [DOOR_TOP - 0.02, FL + 0.02]
  fadeIn(p, k, DOOR_W, x1, py0, py1, passage)
  p.fill(passage)
  p.rect(x1 * k, py0 * k, (DOOR_E + 0.06 - x1) * k, (py1 - py0) * k)
  // The pier, the rock itself, the doorway cut out of its foot.
  p.fill(STONE.deep)
  poly(p, k, [...PIER_WEST, ...SOFFIT, ...PIER_EAST, [DOOR_W + 0.2, -4.8]])
  // The arch's hewn reveal, lit from the tunnel: deepest at the west jamb where the lamps reach it, thinning to
  // nothing past the crown, in the tunnel's own warm stone (a face in the light, not an outline). The pier's west
  // face needs no edge: the rock against the lit tunnel is edge enough.
  if (L > 0.02) {
    p.fill(mixHex(STONE.deep, mixHex(STONE.mid, LAMP.glow, 0.4), 0.25 + 0.55 * L))
    const lower: Pt[] = SOFFIT.slice(0, 9)
    const upper = lower.map(([x, y], j): Pt => {
      const w = 0.12 * Math.pow(1 - j / 8, 1.3)
      return [x + w * 0.45, y - w]
    })
    poly(p, k, [[DOOR_W + 0.05, DOOR_SPRING + 0.16], ...lower, ...upper.reverse(), [DOOR_W + 0.15, DOOR_SPRING + 0.08]])
  }
  // The east face, in the hall's own light once it has one: a dim worn edge.
  const le = 0.5 * lit(DOOR_E + 0.5, -1.4)
  if (le > 0.08) {
    const pts = PIER_EAST.slice(0, -2)
    p.fill(mixHex(STONE.deep, STONE.mid, Math.min(1, le)))
    poly(p, k, [...pts, ...[...pts].reverse().map(([x, y], j): Pt => [x - 0.05 * (0.7 + 0.6 * hash(j, 83)), y])])
  }
}

/**
 * The hall's cover, before he reaches its door: from the doorway east the hall is solid rock to look at (the
 * opening's wide sees the whole mountain). It opens from the door outward, a soft edge moving east from 39.3 as
 * the tunnels' light spills in and the hall's embers are seen, the edge softening as it goes.
 */
const OPENS = 39.3
function coverAt(t: number): { x: number; f: number } {
  const u = Math.max(0, Math.min(1, (t - OPENS) / 1.1))
  const f = 0.5 + 3.0 * u
  return { x: DOOR_E - 0.35 + f + 8 * u * u + 26 * u ** 4, f }
}
function drawCover(p: p5, c: Pen, t: number): void {
  const { x, f } = coverAt(t)
  const x0 = x - f
  const END = 30.9
  if (x0 >= END + 0.5) return
  const k = c.k
  const [Y0, Y1] = [-12.7, 1.5]
  p.noStroke()
  fadeIn(p, k, x0, x, Y0, Y1, STONE.deep)
  if (x < END) {
    p.fill(STONE.deep)
    p.rect(x * k, Y0 * k, (END - x) * k, (Y1 - Y0) * k)
  }
  // And the hatch's shaft under the floor, as the edge passes over it.
  const mid = (HATCH.x0 + HATCH.x1) / 2
  const h = Math.max(0, Math.min(1, (mid - x0) / f))
  if (h > 0.002) {
    p.fill(alpha(p, STONE.deep, h))
    p.rect((HATCH.x0 - 0.6) * k, 1.4 * k, (HATCH.x1 - HATCH.x0 + 1.2) * k, 7.8 * k)
  }
}

/** A pillar of living rock (index i), whole, cracked at its waist, or broken: its stump, and its fallen top. */
function drawPillar(p: p5, c: Pen, i: number, t: number, lights: Light[]): void {
  const k = c.k
  const x = PILLARS[i]
  const top = vaultY(x) - 0.4
  const lit = litAt(lights, x, -3)
  const body = mixHex(mixHex(STONE.deep, STONE.dark, 0.75), STONE.mid, 0.3 * lit)
  const crackAt = CRACKS[i]
  const fallAt = PILLAR_FALL[i]
  const dir = i === 0 ? -1 : 1
  // The shape, from the floor to the vault (or a stretch of it).
  const outline = (y0: number, y1: number, n = 14): Pt[] => {
    const l: Pt[] = []
    const r: Pt[] = []
    for (let j = 0; j <= n; j++) {
      const y = y0 + ((y1 - y0) * j) / n
      const h = pillarHalf(y, top) * (1 + 0.05 * Math.sin(y * 2.3 + i))
      l.push([x - h, y])
      r.push([x + h, y])
    }
    return [...l, ...r.reverse()]
  }
  const drop = 0.7
  const fall0 = fallAt - drop
  p.noStroke()
  p.fill(body)
  if (t < fall0) {
    // Once cracked, the column's top has slipped a little on its break.
    const slip = t >= crackAt ? dir * 0.07 * ease(t, crackAt, crackAt + 0.1) + dir * 0.02 * ring(t - crackAt, 0.3, 20) : 0
    if (slip !== 0) {
      poly(p, k, outline(FL, WAIST + 0.02, 10))
      p.push()
      p.translate(slip * k, 0)
      poly(p, k, outline(WAIST + 0.02, top, 10))
      p.pop()
    } else poly(p, k, outline(FL, top))
    // Each flank catches the light on its side: a rim of lit stone down the column.
    for (const s of [-1, 1]) {
      const l = litAt(lights, x + s * 0.8, -2.2)
      if (l < 0.08) continue
      const rim: Pt[] = []
      const inner: Pt[] = []
      for (let j = 0; j <= 16; j++) {
        const y = FL + ((top + 0.6 - FL) * j) / 16
        const h = pillarHalf(y, top) * (1 + 0.05 * Math.sin(y * 2.3 + i))
        rim.push([x + s * h, y])
        inner.push([x + s * (h - 0.09 - 0.05 * l), y])
      }
      p.fill(mixHex(STONE.dark, STONE.light, Math.min(1, 0.85 * l)))
      poly(p, k, [...rim, ...inner.reverse()])
    }
  } else {
    // The stump, its top broken.
    poly(p, k, [...outline(FL, WAIST + 0.35, 8).slice(0, 9), [x + 0.1, WAIST + 0.15], ...outline(FL, WAIST + 0.35, 8).slice(9)])
    // The top: falls, turning away from the chimney's column, and lies where it lands.
    const u = Math.min(1, (t - fall0) / drop)
    const land = Math.max(0, t - fallAt)
    const g = u * u
    // The first leans its broken top against the west wall; the others lie along the floor.
    const lean = i === 0 ? 0.72 : 1.25
    const slide = i === 0 ? 0.9 : 1.6
    const angle = dir * (0.1 * g + lean * g * g) + (land > 0 ? dir * 0.05 * ring(land, 0.25, 16) : 0)
    const baseY = WAIST - 0.2 + (FL - 0.55 - (WAIST - 0.2)) * g
    p.push()
    p.translate((x + dir * slide * g) * k, baseY * k)
    p.rotate(angle)
    p.translate(-x * k, -(WAIST - 0.2) * k)
    poly(p, k, outline(WAIST - 0.2, top + 0.25, 10))
    p.pop()
    // The scar in the vault where it broke away, and the stones that come down after it (never over the chimney).
    p.fill(mixHex(STONE.deep, STONE.dark, 0.6))
    poly(p, k, [[x - 0.8, top + 0.45], [x - 0.3, top + 0.9], [x + 0.35, top + 0.8], [x + 0.85, top + 0.4]])
    for (let j = 0; j < 5; j++) {
      const sx = x + dir * 0.4 + (hash(j, i + 60) - 0.5) * 1.8
      if (Math.abs(sx - CHIMNEY_X) < 1.1) continue
      const lag = 0.08 + 0.12 * j
      const s = t - fall0 - lag
      if (s < 0) continue
      const sy0 = top + 0.7
      const land = FL - 0.15
      const T = Math.sqrt((2 * (land - sy0)) / 30)
      const r = 0.16 + 0.12 * hash(j, i + 70)
      const sy = s < T ? sy0 + 0.5 * 30 * s * s : land
      const spin = s < T ? s * (3 + 4 * hash(j, i)) : T * (3 + 4 * hash(j, i))
      p.fill(mixHex(STONE.mid, STONE.light, 0.3 * litAt(lights, sx, sy)))
      p.push()
      p.translate(sx * k, sy * k)
      p.rotate(spin)
      poly(p, k, [[-r, 0], [-r * 0.5, -r * 0.8], [r * 0.4, -r * 0.9], [r, -r * 0.1], [r * 0.6, r * 0.7], [-r * 0.6, r * 0.6]])
      p.pop()
    }
  }
  // The crack across its waist: a jagged dark line on the chord, widening.
  if (t >= crackAt && t < fall0 + 0.05) {
    const w = ease(t, crackAt, crackAt + 0.12)
    const hw = pillarHalf(WAIST, top)
    p.stroke(mixHex(STONE.deep, TROLL.shade, 0.3))
    p.strokeWeight(Math.max(1.5, (0.07 + 0.05 * ease(t, crackAt + 0.4, fall0)) * k))
    p.noFill()
    p.beginShape()
    for (let j = 0; j <= 6; j++) p.vertex((x - hw - 0.05 + (2 * hw + 0.1) * (j / 6) * w) * k, (WAIST + 0.1 * Math.sin(j * 2.1 + i) + 0.06 * (j % 2)) * k)
    p.endShape()
    // Grit spilling from the break.
    p.noStroke()
    for (let j = 0; j < 6; j++) {
      const s = t - crackAt - 0.05 * j
      if (s < 0 || s > 0.8) continue
      const gx = x + (hash(j, i + 40) - 0.5) * hw * 1.6 + (hash(j, i) - 0.5) * 0.3 * s
      p.fill(alpha(p, STONE.light, 0.8 * (1 - s / 0.8)))
      p.rect(gx * k, (WAIST + 0.5 * 14 * s * s) * k, 0.05 * k, 0.05 * k)
    }
  }
}

/** Iron in the hall at a light level: near-black in the dark, a worn steel grey where the light reaches it. */
const ironAt = (lit: number): string => mixHex(mixHex(WORKS.iron, STONE.dark, 0.3), WORKS.steel, 0.6 * Math.max(0, Math.min(1, lit)))
/** Iron's own edge: darker than the iron, never a cream line. */
const IRON_EDGE = mixHex(WORKS.iron, STONE.deep, 0.55)

/** A bar of iron from a to b, `w` cells thick (a filled quad, so it keeps its weight at any zoom). */
function bar(p: p5, k: number, a: Pt, b: Pt, w: number): void {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const nx = (-(b[1] - a[1]) / L) * (w / 2)
  const ny = ((b[0] - a[0]) / L) * (w / 2)
  poly(p, k, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]])
}

/**
 * A brazier on the bench: an iron fire-bowl on three splayed legs (the back one between the two in front), each on
 * a small turned-out foot; a deep bowl with a rolled rim, banked embers heaped in it, the flare. All of it iron, edged
 * darker than itself: in the dark it is a black shape against the ledge, and the light turns it steel.
 */
function drawBrazier(p: p5, c: Pen, x: number, t: number, heat: number, flare: number, lit: number): void {
  const k = c.k
  const y0 = ROW_Y[0]
  const yb = BRAZIER_Y
  const top = yb - 0.17
  const belly = top + 0.31
  const hot = Math.max(0, Math.min(1, 0.25 + 0.5 * heat + flare))
  const iron = ironAt(lit)
  p.stroke(IRON_EDGE)
  p.strokeWeight(Math.max(0.75, c.weight * 0.6))
  // The back leg, a shade darker, its foot a little higher (it stands further back on the ledge).
  p.fill(mixHex(iron, STONE.deep, 0.35))
  bar(p, k, [x + 0.02, belly - 0.05], [x + 0.07, y0 - 0.035], 0.05)
  // The two front legs, splayed out from under the bowl.
  p.fill(iron)
  for (const s of [-1, 1]) bar(p, k, [x + s * 0.14, belly - 0.08], [x + s * 0.29, y0 - 0.02], 0.06)
  // Their feet: small flat pads turned outward.
  p.fill(mixHex(iron, STONE.deep, 0.15))
  for (const s of [-1, 1]) poly(p, k, [[x + s * 0.25, y0], [x + s * 0.26, y0 - 0.045], [x + s * 0.34, y0 - 0.035], [x + s * 0.36, y0]])
  // The bowl: deep and round-bottomed, the embers' glow warming its upper side.
  p.fill(mixHex(iron, WORKS.rust, 0.12 * hot))
  poly(p, k, [
    [x - 0.3, top], [x + 0.3, top], [x + 0.29, top + 0.09], [x + 0.24, top + 0.2], [x + 0.12, belly - 0.01], [x - 0.12, belly - 0.01],
    [x - 0.24, top + 0.2], [x - 0.29, top + 0.09],
  ], true)
  // The embers heaped in it: a dark mound, cracked with red that glows with the breath, amber in the flare.
  p.noStroke()
  p.fill(mixHex(TROLL.shade, WORKS.rust, 0.2 + 0.3 * hot))
  poly(p, k, [[x - 0.26, top + 0.02], [x - 0.2, top - 0.05], [x - 0.08, top - 0.08], [x + 0.03, top - 0.1], [x + 0.14, top - 0.07], [x + 0.22, top - 0.04], [x + 0.26, top + 0.02]], true)
  p.fill(mixHex(WORKS.rust, LAMP.core, Math.max(0, hot - 0.45) * 0.9))
  poly(p, k, [[x - 0.17, top + 0.01], [x - 0.11, top - 0.035], [x - 0.02, top - 0.05], [x + 0.06, top - 0.065], [x + 0.13, top - 0.035], [x + 0.17, top + 0.01]], true)
  // The rim: a rolled lip a little wider than the bowl, over the embers' foot, catching their glow from above.
  p.stroke(IRON_EDGE)
  p.strokeWeight(Math.max(0.75, c.weight * 0.6))
  p.fill(mixHex(mixHex(iron, WORKS.steel, 0.25), WORKS.rust, 0.25 * hot))
  poly(p, k, [[x - 0.34, top - 0.005], [x + 0.34, top - 0.005], [x + 0.32, top + 0.045], [x - 0.32, top + 0.045]])
  if (flare > 0.02) for (let j = 0; j < 3; j++) flame(p, c, x - 0.14 + 0.14 * j, yb - 0.17, (0.2 + 0.75 * flare) * (0.75 + 0.35 * hash(j, 13)), t, j * 3 + x, Math.min(1, flare * 1.6))
}

/** Catmull-Rom through points: a smooth line, `n` samples a span. */
function smoothLine(pts: Pt[], n: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < n; j++) {
      const u = j / n
      const u2 = u * u
      const u3 = u2 * u
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

/**
 * A sleeper's tail: out from under it, over the bench's edge, down its face and along the floor (his stepping stone),
 * a dark tuft at its end. It flicks (the far half lifts and curls, and settles), and is drawn in as its troll gets up.
 */
function drawTail(p: p5, c: Pen, tail: Tail, flick: number, lit: number, hide: string, gone: number): void {
  if (gone >= 1) return
  const k = c.k
  const dir = Math.sign(tail.tuft - tail.hang) || 1
  const [rx, ry] = tail.root
  const yf = FL - 0.075
  // Drawn in: the floor part shortens back toward the bench and the whole lifts off the floor.
  const reach = (tail.tuft - tail.hang) * (1 - gone)
  const lift = 0.5 * gone
  const ctrl: Pt[] = [
    [rx, ry],
    [tail.hang - dir * 0.06, ROW_Y[0] + 0.02],
    [tail.hang + dir * 0.04, (ROW_Y[0] + yf) / 2 - lift * 0.5],
    [tail.hang + dir * 0.16, yf - lift],
    [tail.hang + reach * 0.55, yf - 0.02 - lift],
    [tail.hang + reach, yf - 0.05 - lift],
  ]
  const pts = smoothLine(ctrl, 6)
  // The flick: the floor half lifts and curls up, and settles.
  const pivot = pts.length - 10
  if (flick > 0) {
    const [ox, oy] = pts[pivot]
    for (let j = pivot + 1; j < pts.length; j++) {
      const w = Math.pow((j - pivot) / (pts.length - 1 - pivot), 1.4)
      const ang = -dir * 1.3 * flick * w
      const dx = pts[j][0] - ox
      const dy = pts[j][1] - oy
      pts[j] = [ox + dx * Math.cos(ang) - dy * Math.sin(ang), oy + dx * Math.sin(ang) + dy * Math.cos(ang)]
    }
  }
  // The tail's edge is the troll's own (troll.ts): the hide's shadow, never the page's cream.
  const inkC = mixHex(c.bg, mixHex(TROLL.shade, hide, 0.3), 0.35 + 0.65 * lit)
  const hideC = mixHex(c.bg, hide, 0.3 + 0.7 * lit)
  const n = pts.length - 1
  p.noFill()
  for (const [col, wide, extra] of [[inkC, 0.15, c.weight * 1.2], [hideC, 0.15, 0]] as const) {
    p.stroke(col)
    for (let j = 0; j < n; j++) {
      p.strokeWeight(Math.max(1, wide * (1 - 0.5 * (j / n)) * k + extra))
      p.line(pts[j][0] * k, pts[j][1] * k, pts[j + 1][0] * k, pts[j + 1][1] * k)
    }
  }
  // The tuft, pointing on along the tail.
  const [tx, ty] = pts[n]
  const [bx, by] = pts[n - 2]
  const a = Math.atan2(ty - by, tx - bx)
  p.push()
  p.translate(tx * k, ty * k)
  p.rotate(a + Math.PI / 2)
  p.stroke(inkC)
  p.strokeWeight(c.weight * 0.8)
  p.fill(mixHex(c.bg, TROLL.old, 0.4 + 0.6 * lit))
  p.beginShape()
  p.vertex(0, 0.03 * k)
  p.bezierVertex(-0.11 * k, -0.01 * k, -0.06 * k, -0.2 * k, 0, -0.25 * k)
  p.bezierVertex(0.06 * k, -0.2 * k, 0.11 * k, -0.01 * k, 0, 0.03 * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/** The chain of lanterns on its oiled rope, and the crown-lamp over the throne. */
function drawLamps(p: p5, c: Pen, t: number, lit: number, sway: number): void {
  const k = c.k
  const b = burnt(t)
  const rope = ropeAt(t)
  const iron = ironAt(lit)
  // The rope's west end is tied to an iron post standing on the end of the court's first ledge (no chain from the
  // vault: a full-height line through every wide shot of the hall); the crown-lamp's hook hangs from the vault on a
  // real iron chain, a finger thick, its links showing.
  drawHookChain(p, k, t, lit)
  const post: Pt = [ROPE0[0] - 0.12, ROW_Y[1]]
  p.stroke(IRON_EDGE)
  p.strokeWeight(c.weight * 0.8)
  p.fill(mixHex(iron, STONE.deep, 0.3))
  p.beginShape()
  p.vertex((post[0] - 0.05) * k, post[1] * k)
  p.vertex((post[0] - 0.035) * k, (ROPE0[1] - 0.18) * k)
  p.vertex((ROPE0[0] + 0.04) * k, (ROPE0[1] - 0.2) * k)
  p.vertex((ROPE0[0] + 0.04) * k, (ROPE0[1] - 0.13) * k)
  p.vertex((post[0] + 0.035) * k, (ROPE0[1] - 0.11) * k)
  p.vertex((post[0] + 0.05) * k, post[1] * k)
  p.endShape(p.CLOSE)
  // The rope: a real rope, a finger thick, charred behind the fire, rope-coloured ahead of it, the fire itself
  // running along it.
  const n = 30
  p.noFill()
  for (const pass of [0, 1]) {
    p.strokeWeight(Math.max(1.5, c.weight * (pass === 0 ? 2.3 : 1.3)))
    for (let j = 0; j < n; j++) {
      const u0 = j / n
      const u1 = (j + 1) / n
      const [x0, y0] = rope(u0)
      const [x1, y1] = rope(u1)
      const charred = u1 <= b
      const col = charred ? mixHex(TROLL.shade, WORKS.rust, 0.18 + 0.12 * hash(j, 91)) : mixHex(c.bg, WORKS.rope, 0.35 + 0.6 * lit)
      p.stroke(pass === 0 ? mixHex(col, STONE.deep, 0.55) : col)
      p.line(x0 * k, y0 * k, x1 * k, y1 * k)
    }
  }
  if (b > 0 && b < 1) {
    const [fx, fy] = rope(b)
    flame(p, c, fx, fy + 0.03, 0.26, t, 4, 1)
  }
  // The three lanterns.
  LANTERNS.forEach((at, i) => {
    const [x, y] = rope(LANTERN_U[i])
    const l = burning(t, at + (i === 0 ? 0.12 : 0), HAMMERS[2 + i])
    drawLantern(p, dim(c, Math.max(l, lit)), x, y, { lit: l, t, seed: i + 7, size: 0.4, hang: 0.28, swing: sway * (1 + 0.3 * i) })
  })
  // The crown-lamp: an iron ring on three chains from its hook, its five flames catching one after another around
  // it. On the first hammer blow the hook's shackle snaps and it falls (`crownAt`).
  const cl = burning(t, CROWN_LAMP, HAMMERS[5])
  const cr = crownAt(t)
  const cx = cr.x
  const cy = cr.y
  p.push()
  if (cr.down < 0 && t < LAMP_SNAP) {
    p.translate(ROPE1[0] * k, ROPE1[1] * k)
    p.rotate(sway * 0.6)
    p.translate(-ROPE1[0] * k, -ROPE1[1] * k)
  } else {
    p.translate(cx * k, cy * k)
    p.rotate(cr.tilt)
    p.translate(-cx * k, -cy * k)
  }
  // Its three chains meet in a shackle over it; once it is down they slump onto the ring.
  const off = shackleOff(cr.down)
  const apex: Pt = [cx + off[0], cy + off[1]]
  for (const s of [-1, 0, 1]) drawChain(p, k, [cx + s * 0.85, cy], apex, lit, 0.032)
  p.stroke(IRON_EDGE)
  p.strokeWeight(Math.max(0.75, c.weight * 0.8))
  p.fill(ironAt(0.5 * lit))
  p.ellipse(cx * k, cy * k, 1.9 * k, 0.26 * k)
  p.noStroke()
  p.fill(mixHex(STONE.deep, STONE.dark, 0.5))
  p.ellipse(cx * k, (cy - 0.02) * k, 1.55 * k, 0.12 * k)
  // Knocked flat on the dais, its flames duck and come back low.
  const knock = cr.down < 0 ? 1 : 0.35 + 0.4 * ease(cr.down, 0.05, 0.6)
  for (let j = 0; j < 5; j++) {
    const fx = cx - 0.76 + 0.38 * j
    const fy = cy - 0.08
    const lj = ease(t, CROWN_LAMP - 0.05 + 0.06 * j, CROWN_LAMP + 0.2 + 0.06 * j) * (1 - ease(t, HAMMERS[5], HAMMERS[5] + 0.25))
    p.stroke(IRON_EDGE)
    p.strokeWeight(Math.max(0.75, c.weight * 0.6))
    p.fill(ironAt(0.5 * lit))
    p.rect((fx - 0.07) * k, (fy - 0.04) * k, 0.14 * k, 0.08 * k)
    if (lj > 0) flame(p, c, fx, fy - 0.04, (0.26 * cl + 0.06) * knock, t, j + 20, lj)
  }
  p.pop()
  // Its landing throws chips off the dais.
  if (cr.down >= 0 && cr.down < 0.6) {
    const s = cr.down
    p.noStroke()
    for (let j = 0; j < 9; j++) {
      const side = j % 2 ? 1 : -1
      const px = cx + side * (0.5 + 0.5 * hash(j, 57)) + side * (1.2 + 1.4 * hash(j, 58)) * s
      const py = DAIS.top - (1.6 + 1.4 * hash(j, 59)) * s + 0.5 * 14 * s * s
      if (py > DAIS.top + 0.02) continue
      p.fill(alpha(p, mixHex(STONE.mid, STONE.light, 0.4), 1 - s / 0.6))
      const r = 0.04 + 0.04 * hash(j, 60)
      poly(p, k, [[px - r, py], [px, py - r * 0.8], [px + r, py + r * 0.2], [px + r * 0.1, py + r]])
    }
  }
}

/**
 * The hook's chain from the vault: an iron chain a finger thick. On the first blow it tears out of the vault and comes
 * down with the lamp, whole; once the lamp is down on the dais it drops the last of its length onto it in a heap.
 */
const HOOK_CHAIN = ROPE1[1] - vaultY(ROPE1[0]) - 0.05
function drawHookChain(p: p5, k: number, t: number, lit: number): void {
  const w = 0.07
  if (t < LAMP_SNAP) {
    drawChain(p, k, [ROPE1[0], ROPE1[1] - HOOK_CHAIN], ROPE1, lit, w)
    return
  }
  const h = shackleAt(t)
  const cr = crownAt(t)
  if (cr.down < 0) {
    drawChain(p, k, [h[0], h[1] - HOOK_CHAIN], h, lit, w)
    return
  }
  // Down: the chain still standing over the shackle falls onto it, and lies along the dais beside the ring.
  const s = cr.down
  const v = (LAMP_REST - CROWN[1]) * 2 / (LAMP_LANDS - LAMP_SNAP)
  const standing = Math.max(0, HOOK_CHAIN - v * s - 15 * s * s)
  if (standing > 0.01) drawChain(p, k, [h[0], h[1] - standing], h, lit, w)
  const lying = Math.min(1, (HOOK_CHAIN - standing) / HOOK_CHAIN)
  if (lying > 0.02) drawChain(p, k, [cr.x + 0.95, DAIS.top - 0.04], [cr.x + 0.95 + 0.9 * lying, DAIS.top - 0.035], lit, w)
}

/**
 * An iron chain from a to b, `w` cells thick: a dark core with its links along it, face-on and edge-on in turn, so it
 * reads as iron links (not a line) close up and as a solid dark cord in a wide.
 */
function drawChain(p: p5, k: number, a: Pt, b: Pt, lit: number, w = 0.05): void {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (L < 0.01) return
  const ux = (b[0] - a[0]) / L
  const uy = (b[1] - a[1]) / L
  const ang = Math.atan2(uy, ux)
  p.noStroke()
  // In a wide the links are a pixel or two: drawn, they would read as a dotted line. There it is a solid dark cord,
  // iron in the light only a little.
  if (w * k < 4.5) {
    p.fill(mixHex(IRON_EDGE, WORKS.steel, 0.25 * Math.max(0, Math.min(1, lit))))
    bar(p, k, a, b, Math.max(w, 1.6 / k))
    return
  }
  p.fill(IRON_EDGE)
  bar(p, k, a, b, w * 0.55)
  const link = w * 2.3
  const n = Math.max(1, Math.round(L / link))
  const face = ironAt(lit)
  for (let i = 0; i < n; i++) {
    const m = (i + 0.5) / n
    const x = a[0] + (b[0] - a[0]) * m
    const y = a[1] + (b[1] - a[1]) * m
    p.push()
    p.translate(x * k, y * k)
    p.rotate(ang)
    if (i % 2 === 0) {
      // Face-on: an oval ring.
      p.fill(face)
      p.ellipse(0, 0, (L / n) * 1.15 * k, w * k)
      p.fill(IRON_EDGE)
      p.ellipse(0, 0, (L / n) * 0.55 * k, w * 0.35 * k)
    } else {
      // Edge-on: a flat bar.
      p.fill(mixHex(face, IRON_EDGE, 0.35))
      p.rect(-(L / n) * 0.55 * k, -w * 0.22 * k, (L / n) * 1.1 * k, w * 0.44 * k)
    }
    p.pop()
  }
}

/** The dais: two broad steps of dressed stone. */
function drawDais(p: p5, c: Pen, lit: number): void {
  const k = c.k
  const { x0, x1, step, top, inset } = DAIS
  p.noStroke()
  p.fill(mixHex(STONE.dark, STONE.mid, 0.35 + 0.65 * lit))
  p.rect(x0 * k, step * k, (x1 - x0) * k, (FL - step) * k)
  p.fill(mixHex(STONE.dark, STONE.mid, 0.45 + 0.55 * lit))
  p.rect((x0 + inset) * k, top * k, (x1 - x0 - 2 * inset) * k, (step - top) * k)
  p.fill(mixHex(STONE.mid, STONE.light, lit))
  p.rect(x0 * k, step * k, (x1 - x0) * k, Math.max(1, 0.05 * k))
  p.rect((x0 + inset) * k, top * k, (x1 - x0 - 2 * inset) * k, Math.max(1, 0.05 * k))
}

/** A tapering horn along a smooth centre line: wide at its root, a point at its tip. */
function horn(p: p5, k: number, line: Pt[], root: number): void {
  const pts = smoothLine(line, 6)
  const n = pts.length - 1
  const l: Pt[] = []
  const r: Pt[] = []
  for (let j = 0; j <= n; j++) {
    const [x0, y0] = pts[Math.max(0, j - 1)]
    const [x1, y1] = pts[Math.min(n, j + 1)]
    const L = Math.hypot(x1 - x0, y1 - y0) || 1
    const w = (root / 2) * Math.pow(1 - j / n, 0.8)
    l.push([pts[j][0] - ((y1 - y0) / L) * w, pts[j][1] + ((x1 - x0) / L) * w])
    r.push([pts[j][0] + ((y1 - y0) / L) * w, pts[j][1] - ((x1 - x0) / L) * w])
  }
  poly(p, k, [...l, ...r.reverse()])
}

/** How far the throne leans east (rad) about its dais corner: two blows to bring it down, and a long rock on its tusks. */
const LYING = 1.35
const THRONE_LEAN = 0.3
const THRONE_LANDS = HAMMERS[2]
function throneTilt(t: number): number {
  const [h0, h1] = HAMMERS
  if (t < h0) return 0
  if (t < h1) {
    // The first blow lurches it east on its corner; it rocks half way back and hangs there, off balance.
    const s = t - h0
    const up = 0.08
    if (s < up) return THRONE_LEAN * (1 - (1 - s / up) ** 2)
    return THRONE_LEAN - 0.5 * THRONE_LEAN * ease(s, up, h1 - h0)
  }
  const hang = 0.5 * THRONE_LEAN
  if (t < THRONE_LANDS) {
    // The second knocks it over: a shove, then gravity takes it, faster the further it goes.
    const u = (t - h1) / (THRONE_LANDS - h1)
    return hang + (LYING - hang) * (0.3 * u + 0.7 * u * u)
  }
  // It lands on its tusks and rocks on their curve, slow and damped: lifting first, a period of 0.65 s, still by ~1.2 s.
  const s = t - THRONE_LANDS
  return LYING - 0.08 * Math.exp(-s / 0.4) * Math.sin((2 * Math.PI * s) / 0.65)
}

/**
 * The throne: a seat hewn from the mountain, its back crested with three peaks (the Dovre's), gold on their tips, and
 * two great tusks rising behind it. The first hammer blow lurches it, the second topples it east (landing on the
 * third), and it rocks to rest. Its edge and tusks are kept in the rock's and the hide's range: it frames the King,
 * it does not out-shine him.
 */
function drawThrone(p: p5, c: Pen, t: number, lit: number): void {
  const k = c.k
  const { x, seat, w } = THRONE
  // The trolls' own edge (troll.ts): a shadow darker than the bone and the rock it edges, no cream in it (the tusks
  // outlined in cream read as two pale hoops).
  const inkC = mixHex(c.bg, mixHex(TROLL.shade, STONE.dark, 0.3), 0.35 + 0.65 * lit)
  const pivot: Pt = [x + w / 2 + 0.1, DAIS.top]
  p.push()
  p.translate(pivot[0] * k, pivot[1] * k)
  p.rotate(throneTilt(t))
  p.translate(-pivot[0] * k, -pivot[1] * k)
  p.stroke(inkC)
  p.strokeWeight(c.weight)
  // The tusks, behind: out and up from the dais, curling in at their points; old bone, dulled toward the rock.
  p.fill(mixHex(c.bg, TROLL.bone, 0.12 + 0.25 * lit))
  for (const s of [-1, 1]) {
    horn(p, k, [[x + s * 1.05, DAIS.top], [x + s * 1.75, -2.2], [x + s * 2.2, -3.9], [x + s * 2.05, -5.0], [x + s * 1.7, -5.45]], 0.42)
  }
  // The back: a slab of the mountain, crested with three rounded peaks.
  p.fill(mixHex(STONE.dark, STONE.mid, 0.35 + 0.65 * lit))
  const back: Pt[] = [
    [x - w / 2 - 0.05, DAIS.top], [x - w / 2 + 0.02, -3.6], [x - 0.78, -4.45], [x - 0.42, -4.12], [x, -5.05], [x + 0.42, -4.12], [x + 0.78, -4.45],
    [x + w / 2 - 0.02, -3.6], [x + w / 2 + 0.05, DAIS.top],
  ]
  poly(p, k, back, true)
  // Gold on the peaks' tips, and nowhere else.
  p.fill(mixHex(c.bg, GOLD, 0.35 + 0.65 * lit))
  for (const [px, py, r] of [[x - 0.78, -4.45, 0.13], [x, -5.05, 0.16], [x + 0.78, -4.45, 0.13]] as const) {
    poly(p, k, [[px - r, py + r * 0.9], [px - r * 0.55, py + 0.02], [px, py - r * 0.35], [px + r * 0.55, py + 0.02], [px + r, py + r * 0.9], [px, py + r * 0.55]])
  }
  // The seat and its arms.
  p.fill(mixHex(STONE.dark, STONE.mid, 0.5 + 0.5 * lit))
  p.rect((x - w / 2 + 0.12) * k, seat * k, (w - 0.24) * k, (DAIS.top - seat) * k)
  for (const s of [-1, 1]) {
    const ax = x + s * (w / 2 - 0.1)
    poly(p, k, [[ax - 0.2, DAIS.top], [ax - 0.2, -1.62], [ax - 0.1, -1.75], [ax + 0.1, -1.75], [ax + 0.2, -1.62], [ax + 0.2, DAIS.top]], false)
  }
  p.pop()
}

/** The King: the biggest troll, his crown, his sceptre. `pose` from `kingAt` (hall-court.ts). Exported for the finale. */
export function drawKing(p: p5, c: Pen, pose: KingPose, lit: number): TrollDrawn {
  const k = c.k
  const ctx = ctxOf(p)
  const a0 = ctx.globalAlpha
  if (pose.alpha < 1) ctx.globalAlpha = a0 * Math.max(0, pose.alpha)
  const drawn = drawTroll(p, dim(c, lit), pose.x, pose.y, { ...pose.look, lit })
  const hand = drawn.hands[1]
  // The sceptre, gripped low in his right fist: an iron staff with a gold head of flanges (never a ball).
  const ang = pose.sceptre
  const L = SCEPTRE.len
  const [hx, hy] = hand?.at ?? [pose.x + 0.8, pose.y - 1]
  const bx = hx - Math.cos(ang) * L * SCEPTRE.grip
  const by = hy - Math.sin(ang) * L * SCEPTRE.grip
  const tx = hx + Math.cos(ang) * L * (1 - SCEPTRE.grip)
  const ty = hy + Math.sin(ang) * L * (1 - SCEPTRE.grip)
  // The staff, the head and the crown edged in shadow like the King himself (a cream casing made the sceptre a white
  // stick and the crown a drawing of one).
  const inkC = mixHex(c.bg, TROLL.shade, 0.35 + 0.65 * lit)
  p.stroke(inkC)
  p.strokeWeight(Math.max(1, 0.11 * k + c.weight))
  p.line(bx * k, by * k, tx * k, ty * k)
  p.stroke(mixHex(c.bg, WORKS.steel, 0.3 + 0.7 * lit))
  p.strokeWeight(Math.max(1, 0.11 * k - c.weight * 0.5))
  p.line(bx * k, by * k, tx * k, ty * k)
  const gold = mixHex(c.bg, GOLD, 0.3 + 0.7 * lit)
  p.push()
  p.translate(tx * k, ty * k)
  p.rotate(ang + Math.PI / 2)
  p.stroke(inkC)
  p.strokeWeight(c.weight)
  p.fill(gold)
  // The head: flanges round a short spike.
  const hs = 0.2
  poly(p, k, [
    [0, 0.05], [-hs, -0.02], [-hs * 0.55, -0.12], [-hs * 0.95, -0.24], [-hs * 0.3, -0.3], [0, -0.46], [hs * 0.3, -0.3], [hs * 0.95, -0.24],
    [hs * 0.55, -0.12], [hs, -0.02],
  ])
  p.pop()
  // The crown: a gold band on his skull with five points, slid askew while he dozed.
  const hw = drawn.headW
  const [cx] = drawn.head
  const face = pose.look.face ?? 0
  p.push()
  p.translate((cx + face * hw * 0.06) * k, (drawn.crown + 0.1) * k)
  p.rotate(pose.crownTilt)
  p.stroke(inkC)
  p.strokeWeight(c.weight)
  p.fill(gold)
  const bw = hw * 0.62
  const bh = 0.2
  const crown: Pt[] = [[-bw * 0.5, 0], [-bw * 0.56, -bh]]
  for (let j = 0; j < 5; j++) {
    const px = -bw * 0.56 + bw * 1.12 * (j / 4)
    const tall = j === 2 ? 0.34 : j % 2 ? 0.2 : 0.28
    if (j > 0) crown.push([px - bw * 0.13, -bh])
    crown.push([px, -(bh + tall)])
    if (j < 4) crown.push([px + bw * 0.13, -bh])
  }
  crown.push([bw * 0.56, -bh], [bw * 0.5, 0])
  poly(p, k, crown)
  p.noStroke()
  p.fill(mixHex(gold, TROLL.shade, 0.35))
  p.rect(-bw * 0.5 * k, -0.07 * k, bw * k, 0.05 * k)
  p.pop()
  ctx.globalAlpha = a0
  return drawn
}

/**
 * When the hatch is there to see: the floor is whole over it until the crack's last jump reaches it (`CRACK[1]`), and
 * the fissure cuts the lid out of the slab and runs down round the shaft under it.
 */
const HATCH_CUT = CRACK[1] - 0.05
const hatchCut = (t: number): number => ease(t, HATCH_CUT, CRACK[1] + 0.1)
const FLOOR_DEPTH = 1.45
/** The slab's ragged underside at x: set by x alone, so a piece's outline never changes when a hole opens beside it. */
const FLOOR_STEP = 0.7
const floorUnder = (x: number): number => {
  const j = Math.round(x / FLOOR_STEP)
  const r = 0.5 + 0.5 * Math.sin(j * 2.3) * Math.sin(j * 1.7 + 1)
  return FL + FLOOR_DEPTH * (0.85 + 0.15 * r)
}
const floorFill = (l: number): string => mixHex(mixHex(STONE.deep, STONE.dark, 0.7), STONE.mid, 0.6 * l)

/** The floor of the hall: the slab, cut (once the crack reaches it) by the hatch's shaft and (from the collapse) the chimney's hole. */
function drawFloor(p: p5, c: Pen, t: number, lit: (x: number) => number): void {
  const k = c.k
  const pieces: [number, number][] = []
  const broke = t >= FLOOR_BREAK
  const cut = t >= HATCH_CUT
  const holes: [number, number][] = []
  if (broke) holes.push([CHIMNEY_X - 0.55, CHIMNEY_X + 0.55])
  if (cut) holes.push([HATCH.x0, HATCH.x1])
  let from = -0.6
  for (const [a, b] of holes) {
    pieces.push([from, a])
    from = b
  }
  pieces.push([from, 30.6])
  const depth = FLOOR_DEPTH
  // The slab is shaded by the light along it (not one flat shade a piece), so it has no seams, and a hole opening in
  // it changes nothing but the hole.
  const ctx = ctxOf(p)
  const slab = (a: number, b: number): void => {
    p.fill(floorFill(lit((a + b) / 2)))
    const g = ctx.createLinearGradient(a * k, 0, b * k, 0)
    const n = Math.max(1, Math.ceil(b - a))
    for (let j = 0; j <= n; j++) g.addColorStop(j / n, floorFill(lit(a + ((b - a) * j) / n)))
    ctx.fillStyle = g
  }
  p.noStroke()
  for (const [a, b] of pieces) {
    slab(a, b)
    p.beginShape()
    p.vertex(a * k, FL * k)
    p.vertex(b * k, FL * k)
    p.vertex(b * k, floorUnder(b) * k)
    for (let j = Math.floor(b / FLOOR_STEP); j * FLOOR_STEP > a; j--) {
      const x = j * FLOOR_STEP
      if (x < b) p.vertex(x * k, floorUnder(x) * k)
    }
    p.vertex(a * k, floorUnder(a) * k)
    p.endShape(p.CLOSE)
    // Its lit lip, in stretches of a fixed grid, each as lit as the light over it.
    for (let j = Math.floor(a / 1.5); j * 1.5 < b; j++) {
      const x0 = Math.max(a, j * 1.5)
      const x1 = Math.min(b, (j + 1) * 1.5)
      if (x1 <= x0) continue
      p.fill(mixHex(STONE.dark, STONE.light, 0.15 + 0.8 * lit(j * 1.5 + 0.75)))
      p.rect(x0 * k, FL * k, (x1 - x0) * k + (x1 < b ? 1 : 0), Math.max(1, 0.055 * k))
    }
  }
  if (cut) {
    // The hatch's shaft, the trolls' way down to the mine: the fissure runs down round it through the slab, the stone
    // under the lid showing its dark from the top down.
    const u = hatchCut(t)
    const x0 = HATCH.x0
    const w = HATCH.x1 - HATCH.x0
    slab(x0, HATCH.x1)
    p.beginShape()
    p.vertex(x0 * k, FL * k)
    p.vertex(HATCH.x1 * k, FL * k)
    p.vertex(HATCH.x1 * k, floorUnder(HATCH.x1) * k)
    p.vertex(x0 * k, floorUnder(x0) * k)
    p.endShape(p.CLOSE)
    const shaftTop = FL + 0.18
    p.fill(mixHex(STONE.deep, TROLL.shade, 0.25))
    p.rect(x0 * k, shaftTop * k, w * k, (depth + 0.5) * u * k)
    // The fissure's two walls, down each side ahead of the dark.
    const crackC = mixHex(STONE.deep, TROLL.shade, 0.15)
    p.fill(crackC)
    const down = Math.min(depth + 0.5, (depth + 0.5) * Math.min(1, u * 1.4))
    p.rect((x0 - 0.03) * k, FL * k, 0.06 * k, down * k)
    p.rect((HATCH.x1 - 0.03) * k, FL * k, 0.06 * k, down * k)
  }
  if (broke) {
    // The chimney's column: the floor burst open, ragged teeth at its edges.
    p.fill(mixHex(STONE.deep, TROLL.shade, 0.25))
    p.rect((CHIMNEY_X - 0.55) * k, FL * k, 1.1 * k, (depth + 0.5) * k)
    p.fill(mixHex(STONE.dark, STONE.mid, 0.4))
    for (const s of [-1, 1]) {
      const ex = CHIMNEY_X + s * 0.55
      poly(p, k, [[ex, FL], [ex - s * 0.18, FL + 0.25], [ex, FL + 0.5], [ex - s * 0.12, FL + 0.9], [ex, FL + 1.3]])
    }
  }
}

/**
 * The hatch: a flagstone hinged at its east edge. Until the crack reaches it, it is the floor; the fissure outlines it
 * (its edge, its strap and hinge come up out of the slab's own stone), it lurches, then swings down.
 */
function drawHatch(p: p5, c: Pen, t: number, lit: number, floorC: string): void {
  if (t < HATCH_CUT) return
  const k = c.k
  const u = hatchCut(t)
  const lurch = 0.083 * ease(t, LURCH - 0.06, LURCH)
  let ang = lurch
  if (t >= OPEN) {
    const s = t - OPEN
    const v = Math.min(1, s / 0.32)
    ang = lurch + (Math.PI / 2 - lurch) * v * v - (s > 0.32 ? 0.2 * Math.exp(-(s - 0.32) / 0.6) * Math.sin((s - 0.32) * 9) : 0)
  }
  const len = HATCH.x1 - HATCH.x0
  const jolt = t >= CRACK[1] ? 0.02 * ring(t - CRACK[1], 0.12, 40) : 0
  p.push()
  p.translate(HATCH.hinge * k, (FL + jolt) * k)
  p.rotate(-ang)
  // Its edge is the fissure's dark, not a pale line.
  p.stroke(mixHex(floorC, mixHex(STONE.deep, TROLL.shade, 0.15), u))
  p.strokeWeight(c.weight)
  p.fill(mixHex(floorC, mixHex(STONE.dark, STONE.mid, 0.4 + 0.6 * lit), u))
  p.rect(-len * k, 0, len * k, 0.18 * k)
  p.noStroke()
  // The floor's worn lip along its top, as on the slab it was cut from.
  p.fill(mixHex(STONE.dark, STONE.light, 0.15 + 0.8 * lit))
  p.rect(-len * k, 0, len * k, Math.max(1, 0.055 * k))
  p.fill(mixHex(floorC, mixHex(WORKS.iron, WORKS.steel, 0.4 * lit), u))
  p.rect(-len * k, 0.07 * k, len * 0.85 * k, 0.045 * k)
  p.pop()
  p.noStroke()
  p.fill(mixHex(floorC, WORKS.iron, u))
  p.rect((HATCH.hinge - 0.05) * k, (FL - 0.02) * k, 0.12 * k, 0.1 * k)
}

/** The crack from where the sceptre fell, along the dais, down its steps and across the floor to the hatch. */
function drawCrack(p: p5, c: Pen, t: number, from: Pt): void {
  if (t < SMASH) return
  const k = c.k
  const edge = DAIS.x1 + 0.25
  const run = t < CRACK[0] - 0.04
    ? from[0] + (edge - from[0]) * ease(t, SMASH, SMASH + 0.16)
    : t < CRACK[1] - 0.04
      ? edge + (25.3 - edge) * ease(t, CRACK[0] - 0.04, CRACK[0] + 0.06)
      : 25.3 + (HATCH.x0 - 25.3) * ease(t, CRACK[1] - 0.04, CRACK[1] + 0.06)
  const surf = (x: number): number => (x < DAIS.x1 - DAIS.inset ? DAIS.top : x < DAIS.x1 ? DAIS.step : FL)
  // A fissure, not a line: a dark wedge down into the floor from its surface, widest where the head came down and at
  // each jump, tapering to the running tip, and opening wider as it settles.
  const open = 0.55 + 0.45 * ease(t, SMASH, SMASH + 1.2)
  const top: Pt[] = []
  const bot: Pt[] = []
  const jumps = [from[0], DAIS.x1, 25.3]
  for (let x = from[0]; x < run; x += 0.1) {
    const y = surf(x) + 0.015
    const toTip = Math.min(1, (run - x) / 1.2)
    const near = Math.max(...jumps.map((j) => Math.exp(-Math.abs(x - j) / 0.6)))
    const d = (0.07 + 0.12 * near) * open * toTip * (0.75 + 0.5 * hash(Math.round(x * 10), 88))
    top.push([x, y])
    bot.push([x + 0.03 * Math.sin(x * 17), y + d])
  }
  top.push([run, surf(run) + 0.015])
  p.noStroke()
  p.fill(mixHex(STONE.deep, TROLL.shade, 0.15))
  poly(p, k, [...top, ...bot.reverse()])
  // The notch where the head came down.
  p.noStroke()
  p.fill(mixHex(STONE.deep, TROLL.shade, 0.3))
  poly(p, k, [[from[0] - 0.28, DAIS.top], [from[0] - 0.1, DAIS.top + 0.13], [from[0] + 0.12, DAIS.top + 0.1], [from[0] + 0.28, DAIS.top]])
  // Chips thrown up by the blow and at each jump of the crack.
  for (const [at, x0, y0] of [[SMASH, from[0], DAIS.top], [CRACK[0], 25.3, FL], [CRACK[1], HATCH.x0, FL]] as const) {
    const s = t - at
    if (s < 0 || s > 0.6) continue
    for (let j = 0; j < 8; j++) {
      const px = x0 + (hash(j, at * 10) - 0.5) * 2.6 * s
      const py = y0 - (1.9 + 1.6 * hash(j, 3)) * s + 0.5 * 14 * s * s
      if (py > y0 + 0.02) continue
      p.fill(alpha(p, mixHex(STONE.mid, STONE.light, 0.5), 1 - s / 0.6))
      const r = 0.045 + 0.045 * hash(j, 7)
      poly(p, k, [[px - r, py], [px, py - r * 0.8], [px + r, py + r * 0.2], [px + r * 0.1, py + r]])
    }
  }
}

/** Sparks from a brazier's flare up to the torch they catch. */
function drawSparks(p: p5, c: Pen, t: number, from: Pt, to: Pt, at: number, catchAt: number): void {
  const s = t - at
  const span = catchAt - at
  if (s < 0 || s > span + 0.3) return
  const k = c.k
  p.noStroke()
  for (let j = 0; j < 15; j++) {
    const lead = j === 0 ? 1 : 0.55 + 0.4 * hash(j, 17)
    const u = Math.min(1.2, (s / span) * lead * (1 + 0.1 * hash(j, 3)))
    if (u <= 0) continue
    const fade = j === 0 ? (s <= span ? 1 : 1 - (s - span) / 0.3) : Math.max(0, 1 - u / (0.75 + 0.3 * hash(j, 5)))
    if (fade <= 0) continue
    const e = 1 - (1 - Math.min(1, u)) * (1 - Math.min(1, u))
    const wob = (1 - e) * 0.25 * Math.sin(u * 9 + j * 2.1) * (j === 0 ? 0.3 : 1)
    const x = from[0] + (to[0] - from[0]) * e + wob + (j === 0 ? 0 : (hash(j, 11) - 0.5) * 0.5 * e)
    const y = from[1] + (to[1] - from[1]) * Math.min(1, u) * (j === 0 ? 1 : 0.8 + 0.3 * hash(j, 23))
    p.fill(alpha(p, j % 2 === 0 ? LAMP.core : LAMP.flame, fade))
    const r = j === 0 ? 0.085 : 0.05 + 0.035 * hash(j, 29)
    p.ellipse(x * k, y * k, r * k, r * k)
  }
}

/* ------------------------------------------------------------------ what falls */

function drawRubble(p: p5, c: Pen, t: number): void {
  const k = c.k
  // Where each pillar's top landed.
  const heaps = [
    { at: PILLAR_FALL[0], x: PILLARS[0] - 2.4, w: 2.4, seed: 1 },
    { at: PILLAR_FALL[1], x: PILLARS[1] + 2.7, w: 2.6, seed: 2 },
    { at: PILLAR_FALL[2], x: PILLARS[2] + 2.4, w: 2.0, seed: 3 },
  ]
  p.noStroke()
  for (const h of heaps) {
    if (t < h.at + 0.05) continue
    const u = ease(t, h.at + 0.05, h.at + 0.4)
    for (let j = 0; j < 7; j++) {
      const x = h.x - h.w / 2 + (h.w * (j + 0.5)) / 7 + (hash(j, h.seed) - 0.5) * 0.3
      const r = (0.2 + 0.2 * hash(j, h.seed + 5)) * u
      p.fill(mixHex(STONE.dark, STONE.mid, 0.3 + 0.3 * hash(j, h.seed + 9)))
      poly(p, k, [[x - r, FL], [x - r * 0.7, FL - r * 0.9], [x + r * 0.2, FL - r * 1.2], [x + r, FL - r * 0.5], [x + r * 0.9, FL]])
    }
  }
}

/** Stalactites hanging from the vault; four of them fall on the last blows (never over the chimney's column). */
const DRIPSTONES: { x: number; len: number; w: number; falls?: number }[] = [
  { x: 1.9, len: 0.9, w: 0.34, falls: HAMMERS[2] },
  { x: 3.3, len: 0.6, w: 0.26 },
  { x: 5.9, len: 1.1, w: 0.38 },
  { x: 11.6, len: 0.8, w: 0.3 },
  { x: 14.4, len: 1.3, w: 0.4, falls: HAMMERS[3] },
  { x: 15.9, len: 0.7, w: 0.28 },
  { x: 17.2, len: 1.0, w: 0.34, falls: HAMMERS[4] },
  { x: 22.3, len: 1.2, w: 0.38, falls: HAMMERS[5] },
  { x: 24.0, len: 0.6, w: 0.26 },
  { x: 26.6, len: 0.9, w: 0.3 },
]

function drawDripstones(p: p5, c: Pen, t: number, lights: Light[]): void {
  const k = c.k
  DRIPSTONES.forEach((d, i) => {
    const top = vaultY(d.x) - 0.1
    const lit = litAt(lights, d.x, top + 1) * 0.8
    if (d.falls === undefined || t < d.falls - 0.9) {
      stalactite(p, c, d.x, top, d.len, d.w, lit, i)
      return
    }
    // It lets go and falls, landing on its blow, and breaks.
    const floor = d.x > DAIS.x0 && d.x < DAIS.x1 ? DAIS.top : FL
    const drop = floor - (top + d.len)
    const T = Math.sqrt((2 * drop) / 30)
    const s = t - (d.falls - T)
    if (t < d.falls) {
      stalactite(p, c, d.x, top + Math.max(0, 0.5 * 30 * s * Math.abs(s) * (s > 0 ? 1 : 0)), d.len, d.w, lit, i)
    } else {
      p.noStroke()
      p.fill(mixHex(STONE.dark, STONE.mid, 0.35))
      for (let j = 0; j < 3; j++) {
        const x = d.x - 0.25 + 0.25 * j
        const r = 0.12 + 0.06 * hash(j, i)
        poly(p, k, [[x - r, floor], [x - r * 0.5, floor - r], [x + r * 0.6, floor - r * 0.8], [x + r, floor]])
      }
    }
  })
}

/* ------------------------------------------------------------------ the whole hall */

let crackFrom: Pt | null = null

/** Where the King's right hand is for a pose (his troll's arm), measured with the canvas's paint turned off. */
function kingHand(p: p5, c: Pen, pose: KingPose): Pt | undefined {
  const ctx = ctxOf(p)
  const a0 = ctx.globalAlpha
  ctx.globalAlpha = 0
  const drawn = drawTroll(p, c, pose.x, pose.y, pose.look)
  ctx.globalAlpha = a0
  return drawn.hands[1]?.at
}

/** One of the court: its troll, and in the dark gallery the glint of its eyes. */
function drawCourtier(p: p5, c: Pen, pose: Pose, lit: number, gallery: boolean): void {
  const ctx = ctxOf(p)
  const a0 = ctx.globalAlpha
  if (pose.alpha < 1) ctx.globalAlpha = a0 * pose.alpha
  const drawn = drawTroll(p, dim(c, lit), pose.x, pose.y, { ...pose.look, lit, dark: gallery ? mixHex(STONE.deep, STONE.dark, 0.6) : undefined })
  // Eyes open in the dark catch the light: the gallery's are all that is seen of them; the others' shine where it is dim.
  const shine = gallery ? pose.glint : pose.glint * (1 - Math.min(1, lit * 1.4))
  if (shine > 0.05) {
    const k = c.k
    const size = pose.look.size
    const face = pose.look.face ?? 0
    const hw = drawn.headW
    const [hx, hy] = drawn.head
    p.noStroke()
    for (const s of [-1, 1]) {
      if (s !== Math.sign(face || 1) && Math.abs(face) > 0.8) continue
      const ex = hx + face * hw * 0.28 + s * hw * 0.17 * (1 - 0.4 * Math.abs(face))
      p.fill(alpha(p, TROLL.bone, Math.min(1, shine) * 0.9))
      p.ellipse(ex * k, (hy - 0.024 * size) * k, 0.06 * size * k, 0.032 * size * Math.min(1.4, pose.glint) * k)
    }
  }
  ctx.globalAlpha = a0
}

/**
 * The whole hall at show time `t`, in the court part's frame (floor at y = R, the west door at x ≈ 0, the throne
 * at x ≈ 19.7, the hatch at 27.5). Everything shakes with `quake(t)`.
 */
export function drawHall(p: p5, c: Pen, t: number): void {
  const k = c.k
  const f = frame(p, k)
  const seen = (x0: number, x1: number): boolean => x1 > f.x0 - 0.5 && x0 < f.x1 + 0.5
  const [qx, qy] = quake(t)
  // The sceptre's blow and the crack's jumps shake the hall itself.
  const jolt = 0.05 * ring(t - SMASH, 0.22, 34) + 0.02 * ring(t - CRACK[0], 0.15, 34) + 0.02 * ring(t - CRACK[1], 0.15, 34)
  p.push()
  p.translate(qx * k, (qy + jolt) * k)
  p.rectMode(p.CORNER)
  p.strokeJoin(p.ROUND)

  const poses = COURT.map((cr) => courtierAt(cr, t))
  const lights = lightsAt(t, poses)
  const lit = (x: number, y: number) => litAt(lights, x, y)
  const hallLit = Math.min(1, lights.reduce((s, l) => s + (l.w > 0.6 ? l.s * 0.2 : 0), 0))

  drawRoom(p, c, 0.1 + 0.5 * hallLit)
  drawDripstones(p, c, t, lights)
  if (seen(0, 13)) drawTerraces(p, c, lit)
  if (seen(-0.5, 1.5)) drawDoorway(p, c, t, lit, mixHex(mixHex(STONE.deep, STONE.dark, 0.5), STONE.mid, 0.04 + 0.45 * 0.3 * lit(6, (ROW_Y[0] + FL) / 2)))
  // The pools of light on the rock, before anything they light; the pillars stand dark against them, lit at the rim.
  for (const l of lights) glow(p, c, l.x, l.y, l.r * 0.95, Math.min(0.45, 0.3 * l.s), l.col)
  for (let i = 0; i < PILLARS.length; i++) if (seen(PILLARS[i] - 3.5, PILLARS[i] + 3.5)) drawPillar(p, c, i, t, lights)

  // The gallery and the tiers, back to front, and the court on them.
  for (const row of [3, 2, 1] as const) {
    COURT.forEach((cr, i) => {
      if (cr.row !== row) return
      const pose = poses[i]
      if (pose.alpha <= 0 || !seen(pose.x - 1.2, pose.x + 1.2)) return
      drawCourtier(p, c, pose, row === 3 ? 0.25 * lit(pose.x, pose.y - 0.8) : lit(pose.x, pose.y - 0.7), row === 3)
    })
  }

  // The torches on the first pillar.
  TORCHES.forEach((tc, i) => {
    if (!seen(tc.foot[0] - 1, tc.foot[0] + 1)) return
    const l = burning(t, tc.at, tc.out)
    // The sconce edged in iron (its bracket and cup), not the canonical torch's cream ink: unlit it is a dark
    // bracket on the pillar, lit it goes steel.
    const around = Math.max(l, lit(tc.foot[0], tc.foot[1]))
    drawTorch(p, { ...c, ink: mixHex(IRON_EDGE, WORKS.steel, 0.45 * around), weight: c.weight * 1.25 }, tc.foot[0], tc.foot[1], { lit: l * (1 + 0.3 * shout(t)), t, seed: i + 3, side: tc.side, size: TORCH_SIZE })
  })

  // The dais, the throne, the King.
  if (seen(DAIS.x0 - 3, DAIS.x1 + 3)) {
    drawDais(p, c, lit(19.7, -1))
    drawThrone(p, c, t, lit(19.7, -3))
    // His hand, for the blow's angle, is where his troll's arm is drawn.
    const pose0 = kingAt(t)
    const pose = t >= SMASH - 0.13 && t < SMASH + 2.7 ? kingAt(t, kingHand(p, c, pose0)) : pose0
    if (pose.alpha > 0) drawKing(p, c, pose, Math.max(0.1, lit(pose.x, pose.y - 2)))
  }

  // The lamps over the approach and the throne, swinging with the mountain.
  const sway = swayAt(t)
  if (seen(ROPE0[0] - 1, ROPE1[0] + 1.5)) drawLamps(p, c, t, lit(16, -4), sway)

  // The front row's braziers, the tails down over the bench, the front row.
  BRAZIERS.forEach((b, i) => {
    if (!seen(b.x - 1.5, b.x + 1.5)) return
    const tip = tipOf(i, t)
    p.push()
    if (tip) {
      // Knocked over by a hammer blow: it topples off its foot, its embers poured out (the spilled fire).
      const pivot: Pt = [b.x + Math.sign(tip) * 0.32, ROW_Y[0]]
      p.translate(pivot[0] * c.k, pivot[1] * c.k)
      p.rotate(tip)
      p.translate(-pivot[0] * c.k, -pivot[1] * c.k)
    }
    drawBrazier(p, c, b.x, t, tip ? 0 : heatOf(t, b.who), tip ? 0 : poses[b.who].puff, lit(b.x, BRAZIER_Y))
    p.pop()
  })
  drawSpills(p, c, t)
  ;(['A', 'B', 'C'] as const).forEach((id, i) => {
    const who = [0, 1, 3][i]
    const gone = ease(t, COURT_UP - 0.45, STEPS[0])
    if (gone < 1 && seen(TAILS[id].tuft - 1.5, TAILS[id].tuft + 1.5)) drawTail(p, c, TAILS[id], poses[who].flick, lit(TAILS[id].land, 0), COURT[who].hide ?? TROLL.hide, gone)
  })
  COURT.forEach((cr, i) => {
    if (cr.row !== 0) return
    const pose = poses[i]
    if (pose.alpha > 0 && seen(pose.x - 1.2, pose.x + 1.2)) drawCourtier(p, c, pose, lit(pose.x, pose.y - 0.7), false)
  })

  // The sparks from the first two braziers up to the torches they light.
  drawSparks(p, c, t, [BRAZIERS[0].x, BRAZIER_Y - 0.15], torchFlame(0), SNORT_A + 0.04, TORCH_A)
  drawSparks(p, c, t, [BRAZIERS[1].x, BRAZIER_Y - 0.15], torchFlame(1), SNORT_B + 0.04, TORCH_B)

  // The floor, the hatch, the crack.
  drawFloor(p, c, t, (x) => lit(x, 0))
  if (seen(HATCH.x0 - 1, HATCH.x1 + 1)) drawHatch(p, c, t, lit(27.5, 0), floorFill(lit((HATCH.x0 + HATCH.x1) / 2, 0)))
  if (t >= SMASH) {
    if (!crackFrom) {
      const hand = kingHand(p, c, kingAt(SMASH)) ?? [20.8, -2]
      const a = kingAt(SMASH, hand).sceptre
      const reach = SCEPTRE.len * (1 - SCEPTRE.grip)
      crackFrom = [hand[0] + Math.cos(a) * reach, hand[1] + Math.sin(a) * reach]
    }
    drawCrack(p, c, t, crackFrom)
  }
  drawRubble(p, c, t)
  // Dark before the chain reaches it: until he is at its west door the hall is solid rock to look at, and it opens
  // from the door outward as he comes down to it.
  drawCover(p, c, t)
  // The opening wide (44 cells, the whole mountain) also sees the floor's west end, the doorway and the cover's soft
  // edge: rock too, until the camera is down at the pig. Not longer: from there it is the tunnels' approach to the door.
  const sill = 1 - ease(t, 7.4, 8.2)
  if (sill > 0.002) {
    p.noStroke()
    p.fill(alpha(p, STONE.deep, sill))
    p.rect(-2.2 * k, -12.7 * k, (2.2 + coverAt(t).x) * k, 14.2 * k)
  }
  p.pop()
}
