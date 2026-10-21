import type { Shot } from '../camera'
import { CREW, LETO, PAUL } from '../cast'
import { drawThopter, drawThopterOver, seat } from '../craft/thopter'
import { circle, drift, fill, hash, rgba, smooth, standing, type Paint, type Pt } from '../paint'
import { DREAM_SHOT } from '../plan'
import { R } from '../../../../../parts'
import { Run, Walk } from '../path'
import type { Scene } from '../scene'
import type { Actor } from '../show'
import { softBox } from './erg/soft'
import { FROM, HARVESTER, LANDED, T, TO } from './erg/geo'
import { at, look, pose } from './erg/flight'
import { DOOR, RAMP_FOOT, drawHarvester, drawPlume } from './erg/harvester'
import { SHADOW, airAt, drawBackdrop, drawGround, drawThopterShadow, ground, inShadow } from './erg/land'
import { drawErgWorm, drawSheets, swallowed } from './erg/worm'

/**
 * The erg (130.664 → 198.252): the ornithopter off the palace roof and out over the dunes, the open erg, the harvester
 * and its plume, worm sign, the carryall that never comes, the crew got off, Paul in the spice and what he sees there,
 * the worm, Leto coming back for him, the worm coming down on the harvester, and the flight home toward a lower sun.
 *
 * The roof the ornithopter lifts off is the arrival's palace (its pad at `PAD`); everything east of the city is drawn
 * here. The worm's shadow falls over everything when it stands: the sand darkens as it comes up, and the shadow's edge
 * runs west over Paul and Leto and the ornithopter.
 */

const seatOf = (t: number, i: 0 | 1): Pt => seat(pose(t), i)
const ON_SAND_PAUL = -R * PAUL.size
const ON_SAND_LETO = -R * LETO.size

/* ------------------------------------------------------------------ Paul and Leto */

// Paul rides beside his father to the harvester; he climbs out once the crew are aboard, rolls out into the spice and
// stops there; Leto's knock brings him round, and he rolls back and in.
/** Where Paul stops in the spice, between the ornithopter and the harvester's ramp. */
const STOP = 405.0
const paul = new Walk(seatOf(FROM, 1), FROM)
  .ride((t) => seatOf(t, 1), T.paulOut)
  .hop([401.0, ON_SAND_PAUL], 164.85)
  .roll([[STOP, ON_SAND_PAUL]], T.stop, 'out')
  .wait(T.bump)
  .roll([[STOP + 0.36, ON_SAND_PAUL]], 173.3, 'out')
  .roll([[400.6, ON_SAND_PAUL]], 175.0, 'inout')
  .hop(seatOf(T.aboard, 1), T.aboard)
  .ride((t) => seatOf(t, 1), TO)

// Leto flies, waits, looks up for the carryall, comes out for his son, knocks him out of it, and takes them away.
const LETO_TOUCH = STOP - R * (PAUL.size + LETO.size)
const leto = new Walk(seatOf(FROM, 0), FROM)
  .ride((t) => seatOf(t, 0), T.letoOut)
  .hop([401.6, ON_SAND_LETO], T.letoDown)
  .roll([[LETO_TOUCH, ON_SAND_LETO]], T.bump, 'in')
  .roll([[401.8, ON_SAND_LETO]], 174.25, 'inout')
  .hop(seatOf(174.75, 0), 174.75)
  .ride((t) => seatOf(t, 0), TO)

const paulRun = new Run(paul.segs, 'paul (erg)')
const letoRun = new Run(leto.segs, 'leto (erg)')

/* ------------------------------------------------------------------ the crew */

/** The ornithopter's side hatch, behind the cockpit, where the crew go in. */
const HATCH: Pt = [LANDED.x - 0.32, LANDED.y - 0.02]
const ON_SAND_CREW = -R * CREW.size

const crew: Actor[] = T.crew.map((e, i) => {
  const r = R * CREW.size
  const sill: Pt = [DOOR[0] + 0.2, DOOR[1] - r]
  // Down the ramp, its foot a little off the hull's end; out across the flat to under the ornithopter's hatch.
  const foot: Pt = [RAMP_FOOT[0] + 0.05, ON_SAND_CREW]
  const under: Pt = [HATCH[0] + 0.85, ON_SAND_CREW]
  const w = new Walk(sill, e)
    .roll([[DOOR[0] - 0.25, DOOR[1] - r]], e + 0.25, 'in')
    .roll([foot], e + 0.8, 'none')
    .roll([under], e + 2.8, 'out')
    .hop([HATCH[0], HATCH[1]], e + 3.15)
    .wait(e + 3.4)
  const gone = e + 3.4
  return {
    id: CREW.id + i,
    color: CREW.color,
    rim: CREW.rim,
    size: CREW.size,
    run: new Run(w.segs, `crew ${i}`),
    // Out of the dark of the door, and into the dark of the hatch.
    fade: (t: number) => smooth(t, e, e + 0.3) * (1 - smooth(t, gone - 0.28, gone)),
    turn: hash(i, 3) * Math.PI * 2,
  }
})

/* ------------------------------------------------------------------ the camera */

// A tracking shot follows the ornithopter on its own side of a cut: its smoothing never looks across one.
const onRoof = (t: number): Pt => at(Math.min(t, T.out - 0.011))
const thopter = (t: number): Pt => at(Math.max(t, T.out))
const shots: Shot[] = [
  // The roof: the ornithopter on its pad, lifting off on the drums' great blow.
  { t: FROM, cells: 5.2, on: onRoof, off: [0.4, 0.4], cut: true },
  { t: 132.2, cells: 5.8, on: onRoof, off: [0.6, 0.5] },
  { t: T.out - 0.002, cells: 6.2, on: onRoof, off: [0.8, 0.5] },
  // Out over the open sand, close, the dunes going by under it; low over one crest; up again.
  { t: T.out, cells: 7.4, on: thopter, off: [1.1, 1.2], cut: true },
  { t: 135.5, cells: 7.0, on: thopter, off: [1.0, 1.1] },
  { t: T.skim, cells: 6.6, on: thopter, off: [0.9, 0.7] },
  { t: T.open - 0.002, cells: 7.4, on: thopter, off: [1.4, 1.0] },
  // The open erg: the ornithopter a speck going across it, its shadow under it.
  { t: T.open, cells: 74, at: [318, -30], cut: true },
  { t: T.ahead - 0.002, cells: 68, at: [330, -27] },
  // The harvester and its plume, huge against the ornithopter coming in from the west.
  { t: T.ahead, cells: 40, at: [418, -17], cut: true },
  { t: T.sign - 0.002, cells: 38, at: [416, -16] },
  // Worm sign: the harvester's front at the frame's west edge, the empty sky over it where the carryall should be, and
  // the swell running in under the sand from the east.
  { t: T.sign, cells: 46, at: [470, -12], cut: true },
  { t: T.look - 0.002, cells: 44, at: [467, -11.5] },
  // In the cockpit: father and son look up for the carryall that does not come.
  { t: T.look, cells: 3.6, at: [LANDED.x + 0.9, -0.95], cut: true },
  { t: T.crew[0] - 0.002, cells: 3.4, at: [LANDED.x + 0.9, -1.0] },
  // The crew come off down the ramp, and the camera goes with the line of them across to the ornithopter's hatch; Paul
  // gets out, and it goes with him into the spice.
  { t: T.crew[0], cells: 5.6, at: [411.6, -2.1], cut: true },
  { t: 159.6, cells: 5.8, at: [408.0, -1.7] },
  { t: 161.8, cells: 5.9, at: [404.4, -1.5] },
  { t: 163.6, cells: 6.0, at: [401.3, -1.45] },
  { t: 165.4, cells: 6.2, at: [402.6, -1.5] },
  { t: T.stop, cells: 6.4, at: [404.0, -1.5] },
  { t: T.rise - 0.002, cells: 6.2, at: [403.9, -1.5] },
  // The worm: very wide, the tower of it far over the harvester, the two of them and the ornithopter specks under it.
  { t: T.rise, cells: 88, at: [440, -40], cut: true },
  { t: T.bump - 0.002, cells: 86, at: [440, -39] },
  // In its shadow: Leto knocks him out of it; back to the ornithopter and in.
  { t: T.bump, cells: 7.0, at: [402.4, -1.9], cut: true },
  { t: T.aboard, cells: 7.2, at: [400.6, -1.9] },
  { t: T.up - 0.002, cells: 7.4, at: [400.0, -2.1] },
  // Up, in the worm's shadow, the worm standing far over them with its maw open.
  { t: T.up, cells: 82, at: [446, -37], cut: true },
  { t: T.arch - 0.002, cells: 80, at: [445, -36] },
  // The arch: wider still, the worm bending over and coming down on the harvester mouth first.
  { t: T.arch, cells: 98, at: [446, -45], cut: true },
  { t: T.down, cells: 88, at: [440, -40] },
  { t: T.swallow, cells: 72, at: [432, -32] },
  { t: T.above - 0.002, cells: 72, at: [431, -32] },
  // From high over it: the dust going down, the ornithopter rising out of it and turning for home.
  { t: T.above, cells: 100, at: [418, -46], cut: true },
  { t: 192.6, cells: 94, at: [410, -43] },
  // And in on it going home: the ornithopter small against the low sun in the west.
  { t: 195.4, cells: 46, on: thopter, off: [0.3 * 46 * (16 / 9), 0.12 * 46] },
  { t: TO, cells: 34, on: thopter, off: [0.3 * 34 * (16 / 9), 0.12 * 34] },
]

/* ------------------------------------------------------------------ the vision */

/** In the spice he stops, and sees her: the Fremen's dream shot, through an opening that grows out of him. */
const dream = {
  from: T.stop,
  to: 170.5,
  at: DREAM_SHOT.from,
  rate: 0.5,
  a: (t: number) => 0.92 * smooth(t, T.stop, T.stop + 0.8) * (1 - smooth(t, 169.6, 170.5)),
  iris: (t: number) => {
    const [x, y] = paulRun.where(t)
    const open = smooth(t, T.stop, T.stop + 1.1) * (1 - 0.35 * smooth(t, 169.4, 170.5))
    return { x, y: y - 0.75, r: 0.2 + 1.0 * open, soft: 0.55 }
  },
}

/* ------------------------------------------------------------------ the drawings */

const BOX = { x0: 170, y0: -220, x1: 700, y1: 60 }
const live = (t: number) => t >= FROM && t < TO

/** The sky, the far sand, the near sand, the harvester and its plume. */
const land = standing('erg-land', BOX, (g) => {
  if (!live(g.t)) return
  const t = g.t
  const air = airAt(t)
  drawBackdrop(g, air)
  drawPlume(g, t)
  drawGround(g, t, air)
  if (t < T.up + 4) drawThopterShadow(g, t, at(t), 1.7)
  drawHarvester(g, t, swallowed(t), inShadow(t, HARVESTER.x))
})

/** The ornithopter, from the roof to the end: its body and far wings under the riders, its glass and near wings over. */
const craft = standing(
  'erg-thopter',
  null,
  (g) => {
    if (!live(g.t)) return
    const p = pose(g.t)
    drawThopter(g, p, look(g.t, inShadow(g.t, p.x)))
    // The side hatch behind the cockpit, open while the crew come aboard.
    const open = smooth(g.t, 156.8, 157.3) * (1 - smooth(g.t, 166.0, 166.6))
    if (open > 0.002) {
      g.ctx.beginPath()
      g.ctx.ellipse(HATCH[0], HATCH[1], 0.22 * open, 0.17, 0, 0, Math.PI * 2)
      fill(g.ctx, rgba('#14110F', 0.95))
    }
  },
  (g) => {
    if (!live(g.t)) return
    const p = pose(g.t)
    drawThopterOver(g, p, look(g.t, inShadow(g.t, p.x)))
  },
)

/** Over everything: the worm's shadow on Paul and Leto, the worm, the sand it throws, the dust, the spice. */
const over = standing('erg-over', BOX, null, (g) => {
  if (!live(g.t)) return
  const t = g.t
  const air = airAt(t)
  shadeBalls(g, t)
  drawErgWorm(g, t, air.sand, air.shade)
  drawSheets(g, t, air.sand)
  drawDust(g, t, air.sand)
  drawSpice(g, t)
})

/** The worm's shadow on the two of them: a dark disc over each ball as far as it stands in the shadow. */
function shadeBalls(g: Paint, t: number): void {
  for (const [run, size] of [[paulRun, PAUL.size], [letoRun, LETO.size]] as [Run, number][]) {
    if (!run.covers(t)) continue
    const [x, y] = run.where(t)
    const k = inShadow(t, x)
    if (k <= 0.002 || y < -1.5) continue
    circle(g.ctx, x, y, R * size * 1.06)
    fill(g.ctx, rgba(SHADOW, 0.32 * k))
  }
}

/** Dust the ornithopter raises from the flat as it comes down and as it goes, and the worm's going: low and flat. */
function drawDust(g: Paint, t: number, sand: string): void {
  const puffs: [number, number, number, number][] = [
    [T.touch - 0.6, 3.4, LANDED.x, 1],
    [T.up - 0.2, 3.6, LANDED.x, 1],
    [T.swallow - 0.4, 7.0, HARVESTER.x, 3.4],
  ]
  for (const [at0, life, x, big] of puffs) {
    const s = t - at0
    if (s <= 0 || s > life) continue
    const a = 0.3 * smooth(s, 0, 0.5) * (1 - smooth(s, life * 0.35, life))
    // Three flat layers, each wider and fainter, so it has no edge: dust along the ground, not a cloud over it.
    for (const k of [1, 1.6, 2.3]) {
      const rx = (2.6 + 3.2 * smooth(s, 0, life)) * big * k
      const ry = (0.32 + 0.55 * smooth(s, 0, life)) * big * (0.6 + 0.4 * k)
      g.ctx.beginPath()
      g.ctx.ellipse(x, ground(x, t) - ry * 0.35, rx, ry, 0, Math.PI, Math.PI * 2)
      fill(g.ctx, rgba(sand, a / k))
    }
  }
}

/** The spice in the air round Paul: a low rust haze over the flat, and a few motes going slowly up through it. */
const SPICE = '#B5662F'
function drawSpice(g: Paint, t: number): void {
  const a = smooth(t, 163.6, 165.6) * (1 - smooth(t, T.up, 178.4))
  if (a <= 0.003) return
  const ctx = g.ctx
  softBox(ctx, SPICE, 0.18 * a, { x0: 394, y0: -3.2, x1: 414, y1: 0.4 }, 6, 6, [[0, 0], [0.55, 1], [0.85, 0.8], [1, 0]])
  for (let i = 0; i < 9; i++) {
    const x = 399.5 + hash(i, 11) * 10 + 0.5 * drift(t * 0.25 + i, 31)
    const y = -0.2 - ((hash(i, 12) * 2.6 + (t - 163.6) * 0.16) % 2.8)
    const r = 0.045 + 0.02 * hash(i, 13)
    const fade = Math.min(1, (y + 2.8) / 0.6, -y / 0.4)
    circle(ctx, x, y, r)
    fill(ctx, rgba(SPICE, 0.5 * a * Math.max(0, fade)))
  }
}

/* ------------------------------------------------------------------ the scene */

export const erg: Scene = {
  key: 'erg',
  from: FROM,
  to: TO,
  moves: { paul: paul.segs, leto: leto.segs },
  looks: {
    // Down at the sand going by under them; up for the carryall; Paul up at the worm over him.
    paul: [[T.dip + 0.3, T.climb, 1.05], [T.look + 0.25, T.crew[0], -1.25], [T.rise + 0.2, T.bump, -1.15]],
    leto: [[T.look + 0.1, T.crew[0], -1.35], [T.rise + 0.4, T.bump - 0.4, -1.0]],
  },
  actors: crew,
  shots,
  dreams: [dream],
  pieces: [land, craft, over],
  strikes: [
    ['lift-off', T.lift],
    ['out over the sand', T.out],
    ['the dip', T.dip],
    ['low over the crest', T.skim],
    ['the climb', T.climb],
    ['the open erg', T.open],
    ['the harvester', T.ahead],
    ['the plume bellies', T.plume],
    ['worm sign', T.sign],
    ['touch down', T.touch],
    ['wings folded', T.settle],
    ['looking up', T.look],
    ...T.crew.map((t, i): [string, number] => [`crew ${i} out`, t]),
    ['Paul out', T.paulOut],
    ['Paul stops in the spice', T.stop],
    ['Leto out', T.letoOut],
    ['Leto down', T.letoDown],
    ['the worm', T.rise],
    ['Leto knocks him', T.bump],
    ['aboard', T.aboard],
    ['up', T.up],
    ['climbing', T.climbing],
    ['the arch', T.arch],
    ['over', T.over],
    ['the maw comes down', T.down],
    ['swallowed', T.swallow],
    ['from above', T.above],
  ],
}
