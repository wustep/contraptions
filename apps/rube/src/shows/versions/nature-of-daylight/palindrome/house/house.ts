import { R, type Pt, type Seg } from '../../../../../parts'
import { mix } from '../cast'
import { box, part, scenery, type Company, type Part, type PartShot, type Slot } from '../kit'
import { HALF, LAST, SEAM, SWELL, TONIC } from '../music'
import type { ShellSpot } from '../seams'
import { HANNAH, HANNAH_AGE, HOUSE, HOUSE_THEME } from '../worlds'
import { CLOCK_HULL, CRADLE_HULL, BED_HULL, TV_HULL, drawBed, drawBedOver, drawClock, drawCradle, drawCradleOver, drawTV, drawTVGlow, tvShell } from './props'
import { drawFloorLight, drawMirror, drawRoom, drawVignette } from './room'
import {
  ALONE,
  BEGIN,
  BEDSIDE_X,
  CLOCK_STRIKES,
  DAWN_PUSHES,
  GONE as GONE_AT,
  HOME_PUSHES,
  HOME_X,
  ianX,
  NEWS_X,
  PATIENT,
  TV,
  babyAt,
  bedX,
  cradleTheta,
  dawnX,
  eraOf,
  homeX,
  lightAt,
  pose,
  ss,
} from './time'

/**
 * The lake house, inside (the HOUSE builder's): one long room of dark concrete and pale oak whose whole side is a
 * window over the grey lake. The same room at four times of her life, which we take for the past and which is the
 * future: the cradle at dawn (the show's first frame), the bed by the window on a grey day, the television at night,
 * and at the end the morning after the shells, Ian, the empty cradle, and the first frame again.
 *
 * The room is one standing drawing that changes by show time (`houseSet`); the parts (`dawn`, `bed`, `news`, `home`)
 * give Louise her lane, Hannah and Ian their places, and the camera its keys. Everything that moves is a function of
 * show time in `time.ts`, read by both.
 */

/* ------------------------------------------------------------------ the room */

/** Every cell the room claims, so the stage draws it whenever any of it is in view. */
export const HOUSE_CELLS: Pt[] = box(-11, -6, 12, 3, 1)

/** Where Louise is on the floor at show time T, for the room's shadows. */
function louiseX(T: number): number | null {
  switch (eraOf(T)) {
    case 'dawn':
      return dawnX(T)
    case 'bed':
      return bedX(T)
    case 'news':
      return NEWS_X
    case 'home':
      return homeX(T)
    default:
      return null
  }
}

/** The room's standing drawing: the room, its light, and what stands in it at each time. */
export const houseSet = scenery<null>({
  name: 'house-set',
  draw: (p, _s, c) => {
    const T = c.t
    const era = eraOf(T)
    if (era === 'none') return
    const k = c.k
    const L = lightAt(T)
    const shadows: Pt[][] = []
    const balls: Pt[] = []
    const lx = louiseX(T)
    if (lx !== null) balls.push([lx, 0])
    const theta = cradleTheta(T)
    if (era === 'dawn' || era === 'home') shadows.push(CRADLE_HULL.map((q) => pose(theta, q)))
    if (era === 'bed') shadows.push(BED_HULL, CLOCK_HULL)
    if (era === 'news') shadows.push(TV_HULL)
    if (era === 'home' && T < ALONE) balls.push([ianX(T), 0])
    drawRoom(p, k, T)
    if (era === 'dawn' || era === 'home') drawCradle(p, k, theta, L)
    if (era === 'bed') {
      drawBed(p, k, T, L)
      drawClock(p, k, T, L)
    }
    if (era === 'news') drawTV(p, k, T, L)
    drawMirror(p, k, T)
    drawFloorLight(p, k, T, shadows, balls)
    if (era === 'news') drawTVGlow(p, k, T)
    drawVignette(p, k, T)
  },
  over: (p, _s, c) => {
    const T = c.t
    const era = eraOf(T)
    if (era === 'bed') drawBedOver(p, c.k, T, lightAt(T))
    if (era === 'dawn' || era === 'home') drawCradleOver(p, c.k, cradleTheta(T), lightAt(T))
  },
})

/* ------------------------------------------------------------------ where each time starts */

/** Where each of the room's legs starts (the ball comes in at (-0.5, 0) from it), in the house's world cells. Dawn and
 * the bed are the same place on the floor (the bed stands where the cradle stood); the news is where she ends at the
 * bed; home starts by the window across the room and ends where dawn began. */
export const DAWN_AT: Pt = [0.5, 0]
export const BED_AT: Pt = [0.5, 0]
export const NEWS_AT: Pt = [NEWS_X + 0.5, 0]
export const HOME_AT: Pt = [HOME_X + 0.5, 0]

/** The shell on the television at the cut (house world cells): its centre and height. */
export const TV_SHELL: ShellSpot = tvShell(SEAM.arrival)

/** When Hannah goes, on the swell: her ball fades out of the bed between these show times. */
export const GONE: [number, number] = GONE_AT

/* ------------------------------------------------------------------ lanes */

/**
 * A lane in a part's frame from a place on the floor by show time: sampled finely where she moves, one piece where
 * she rests, and exactly on every time in `keys` (her strikes), so a contact is where the music is.
 */
function floorLane(x: (T: number) => number, slot: Slot, origin: Pt, keys: number[]): { segs: Seg[]; end: Pt } {
  const dt = 1 / 30
  const times = new Set<number>([slot.begin, slot.end])
  for (let T = slot.begin; T < slot.end; T += dt) times.add(T)
  for (const k of keys) if (k > slot.begin && k < slot.end) times.add(k)
  const ts = [...times].sort((a, b) => a - b).filter((t, i, all) => i === 0 || t - all[i - 1] > 1e-6)
  const at = (T: number): Pt => [x(T) - origin[0], -origin[1]]
  const segs: Seg[] = []
  let prev = at(ts[0])
  for (let i = 1; i < ts.length; i++) {
    const here = at(ts[i])
    const dur = ts[i] - ts[i - 1]
    const last = segs[segs.length - 1]
    const still = Math.abs(here[0] - prev[0]) < 1e-7
    if (still && last && Math.abs(last.from[0] - last.to[0]) < 1e-7 && Math.abs(last.to[0] - here[0]) < 1e-7) last.dur += dur
    else segs.push({ from: prev, to: here, dur })
    prev = here
  }
  // The lane starts where the ball comes in: (-0.5, 0).
  segs[0].from = [-0.5, 0]
  return { segs, end: prev }
}

/** Hannah's mark: where she looks. In the cradle, up and toward her mother, turning with the cradle. */
const BABY_LOOK = -Math.PI / 2 - 0.75
/** So small, the theme's ink ring would be most of her: the baby's edge is a deep rose. */
const BABY_RIM = mix(HANNAH, HOUSE.night, 0.62)

/* ------------------------------------------------------------------ dawn */

interface HouseState {
  begin: number
}
const nothing = () => {}

/** The cells a part claims (its place in the room, relative to its origin). */
const partCells = (origin: Pt): Pt[] => box(-6 - origin[0], -3, 6 - origin[0], 1)

export const dawn: Part<HouseState> = part<HouseState>(
  { name: 'house-dawn', draw: nothing },
  (slot) => {
    const o = DAWN_AT
    const { segs, end } = floorLane(dawnX, slot, o, DAWN_PUSHES.map((q) => q.t))
    const company: Company[] = [
      {
        who: 'hannah',
        from: slot.begin,
        to: slot.end,
        at: (t) => {
          const [x, y] = babyAt(t)
          return { x: x - o[0], y: y - o[1], scale: HANNAH_AGE.baby, spin: BABY_LOOK + cradleTheta(t), rim: BABY_RIM }
        },
      },
    ]
    return { cells: partCells(o), exit: [end[0] + 0.5, end[1]], lane: { segs, fire: DAWN_PUSHES[0].t - slot.begin }, state: { begin: slot.begin }, company }
  },
  (slot) => {
    const o = DAWN_AT
    const w = (x: number, y: number): Pt => [x - o[0], y - o[1]]
    return [
      // The first chord in the first frame; then slowly in to the cradle, the baby and her mother's rocking filling
      // the frame as the light comes up on them; over the last two chords back out to the first frame.
      { t: DAWN_PUSHES[0].t, cells: 4.6, hold: w(1.05, -0.95) },
      { t: 8.2, cells: 2.95, hold: w(0.66, -0.44) },
      { t: DAWN_PUSHES[3].t, cells: 2.6, hold: w(0.7, -0.4) },
      { t: slot.end, cells: 4.6, hold: w(1.05, -0.95) },
    ]
  },
)

/* ------------------------------------------------------------------ the bed */

export const bed: Part<HouseState> = part<HouseState>(
  { name: 'house-bed', draw: nothing },
  (slot) => {
    const o = BED_AT
    const { segs, end } = floorLane(bedX, slot, o, [80.376])
    const r = HANNAH_AGE.young
    const company: Company[] = [
      {
        who: 'hannah',
        from: slot.begin,
        to: GONE[1] - 0.02,
        at: (t) => {
          // She turns toward her mother when she comes close. On the swell she goes: paler, and smaller, sinking into
          // the pillow she lies on, until there is nothing there.
          const look = -Math.PI / 2 - 0.2 - 0.9 * ss(t, 80.1, 81.6)
          const fade = ss(t, GONE[0], GONE[1] - 0.1)
          const sink = ss(t, GONE[0] + 0.3, GONE[1] - 0.05)
          const pale = mix(HOUSE.linen, HOUSE.linenShade, 0.4)
          const scale = r * (1 - 0.985 * sink)
          const bottom = PATIENT[1] + R * r
          return {
            x: PATIENT[0] - o[0],
            y: bottom - R * scale - o[1],
            scale,
            spin: look,
            color: mix(HANNAH, pale, fade),
            rim: mix(HOUSE_THEME.ink, pale, fade),
          }
        },
      },
    ]
    return { cells: partCells(o), exit: [end[0] + 0.5, end[1]], lane: { segs, fire: 80.376 - slot.begin }, state: { begin: slot.begin }, company }
  },
  () => {
    const o = BED_AT
    const w = (x: number, y: number): Pt => [x - o[0], y - o[1]]
    return [
      // In on the two of them by the pillow, the clock's pendulum at the frame's edge; on the swell close on Hannah as
      // she goes; then the empty pillow and Louise beside it, and back to the room.
      { t: 76.185, cells: 3.7, hold: w(1.2, -0.72) },
      { t: 80.376, cells: 3.2, hold: w(1.24, -0.56) },
      { t: 85.31, cells: 2.95, hold: w(1.22, -0.5) },
      { t: 89.281, cells: 2.8, hold: w(1.14, -0.46) },
      { t: SWELL, cells: 2.55, hold: w(0.98, -0.42) },
      { t: GONE[1], cells: 2.72, hold: w(0.93, -0.43) },
      { t: SEAM.news, cells: 4.6, hold: w(BEDSIDE_X + 1.05, -0.95) },
    ]
  },
)

/* ------------------------------------------------------------------ the news */

export const news: Part<HouseState> = part<HouseState>(
  { name: 'house-news', draw: nothing },
  (slot) => {
    const o = NEWS_AT
    const dur = slot.end - slot.begin
    return { cells: partCells(o), exit: [0, 0], lane: { segs: [{ from: [-0.5, 0], to: [-0.5, 0], dur }], fire: 0 }, state: { begin: slot.begin } }
  },
  (slot) => {
    const o = NEWS_AT
    const c: Pt = [TV.x + TV.w / 2 - o[0], TV.y + TV.h / 2 - o[1]]
    // Into the screen until its picture fills the frame.
    return [
      { t: slot.begin + 1.9, cells: 2.35, hold: [c[0] - 0.42, c[1] + 0.02] },
      { t: slot.end, cells: 1.3, hold: c },
    ]
  },
)

/* ------------------------------------------------------------------ home */

export const home: Part<HouseState> = part<HouseState>(
  { name: 'house-home', draw: nothing },
  (slot) => {
    const o = HOME_AT
    const { segs, end } = floorLane(homeX, slot, o, [337.85, ...HOME_PUSHES.map((q) => q.t)])
    const company: Company[] = [
      {
        who: 'ian',
        from: slot.begin,
        to: ALONE,
        at: (t) => ({ x: ianX(t) - o[0], y: -o[1], spin: Math.PI + 0.35 }),
      },
      {
        who: 'hannah',
        from: BEGIN,
        to: slot.end + 1,
        at: (t) => {
          const [x, y] = babyAt(t)
          return { x: x - o[0], y: y - o[1], scale: HANNAH_AGE.baby, spin: BABY_LOOK + cradleTheta(t), rim: BABY_RIM }
        },
      },
    ]
    return { cells: partCells(o), exit: [end[0] + 0.5, end[1]], lane: { segs, fire: BEGIN - slot.begin }, state: { begin: slot.begin }, company }
  },
  (slot) => {
    const o = HOME_AT
    const w = (x: number, y: number): Pt => [x - o[0], y - o[1]]
    const first = w(1.05, -0.95)
    const keys: PartShot[] = [
      // Close on the two of them by the window.
      { t: 336.2, cells: 3.45, hold: w(HOME_X - 0.42, -0.56) },
      { t: 337.85, cells: 3.1, hold: w(HOME_X - 0.1, -0.46) },
      { t: ALONE - 0.05, cells: 2.9, hold: w(HOME_X + 0.02, -0.43) },
      // Ian is gone: the same room, wider, and the cradle across it.
      { t: ALONE, cells: 5.6, hold: w(-1.05, -1.2), cut: true },
      { t: 345.49, cells: 5.5, hold: w(-0.3, -1.14) },
      { t: BEGIN - 0.05, cells: 6.1, hold: w(-0.1, -1.24) },
      // The opening played backwards: the cut opens close on the cradle at dawn, Hannah in it (the dawn's closest
      // framing); close through the last B-flat; then one long slow draw back, arriving on the first frame exactly on
      // the last attack, and held there to the end.
      { t: BEGIN, cells: 2.6, hold: w(0.7, -0.4), cut: true },
      { t: TONIC, cells: 2.7, hold: w(0.69, -0.41) },
      { t: LAST, cells: 4.6, hold: first },
      { t: slot.end, cells: 4.6, hold: first },
    ]
    return keys
  },
)

/* ------------------------------------------------------------------ strikes */

/** Every strike of the house's parts. */
export const HOUSE_HITS: number[] = [
  // Dawn: she rocks the cradle on every chord.
  ...DAWN_PUSHES.map((q) => q.t),
  // The bed: the clock strikes on the chords, and on the swell it has run down.
  ...CLOCK_STRIKES,
  // The news: the television comes on on the half cadence.
  HALF,
  // Home: the sun through the glass, the last touch, the cut to her alone, the empty cradle, and the cradle again.
  SEAM.home,
  337.85,
  ALONE,
  ...HOME_PUSHES.map((q) => q.t),
].sort((a, b) => a - b)
