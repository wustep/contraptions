import { R, type Pt, type Seg } from '../../../../../parts'
import { mix } from '../cast'
import { box, part, scenery, type Company, type Part, type PartShot, type Slot } from '../kit'
import { LAST, PLAGAL, SEAM, SWELL, TONIC } from '../music'
import { HANNAH, HANNAH_AGE, HOUSE, HOUSE_THEME, IAN, LOUISE } from '../worlds'
import { CLOCK_HULL, CRADLE_HULL, BED_HULL, LAMP_HULL, TV_HULL, drawBed, drawBedOver, drawClock, drawCradle, drawCradleOver, drawLamp, drawTV, drawTVGlow } from './props'
import { drawBallMirror, drawFloorLight, drawMirror, drawRoom, drawVignette } from './room'
import { F, FLASH_HITS, FLASH_X, STOOL_HULL, drawSheet, drawStool, flashX, hannahFlashAt, hannahFlashLook } from './flash'
import { RC, RECRUIT_HITS, drawRecruit, drawRecruitOver, recruitX } from './recruit'
import { TEEN_GONE, TEEN_HITS, TEEN_SHOTS, TEEN_STOOL_HULL, TEEN_X, TN, drawTeenStool, hannahTeenAt, hannahTeenDown, hannahTeenLook, teenX } from './teen'
import {
  EMPTY_DX,
  NEAR,
  TURN,
  ianLook,
  ianAfter,
  ianAfterLook,
  IAN_GONE,
  BEGIN,
  BEDSIDE_X,
  CLOCK_STRIKES,
  DAWN_PUSHES,
  GONE as GONE_AT,
  going,
  HOME_PUSHES,
  HOME_X,
  HUG_T,
  ianX,
  NEWS_X,
  PATIENT,
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
 * window over the grey lake. The same room at six times of her life, which we take for the past and which is the
 * future: the cradle at dawn (the show's first frame), Hannah a teenager at the window turning on her mother and going
 * (`teen.ts`), the bed by the window over the days of her illness, the night
 * the shells came (the television on, a helicopter's searchlight: `recruit.ts`), an afternoon in the sun when Hannah
 * draws at the window (the flash, in the middle of the language: `flash.ts`), and at the end the morning after the
 * shells, Ian, the empty cradle, and the first frame again. (The news itself is the lecture hall's: `hall/hall.ts`.)
 *
 * The room is one standing drawing that changes by show time (`houseSet`); the parts (`dawn`, `teen`, `bed`, `recruit`, `flash`, `home`)
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
    case 'teen':
      return teenX(T)
    case 'bed':
      return bedX(T)
    case 'recruit':
      return recruitX(T)
    case 'flash':
      return flashX(T)
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
    // The cradle at its dawn place throughout, empty until Hannah comes into it.
    const dx = era === 'home' && T < BEGIN ? EMPTY_DX : 0
    if (era === 'dawn' || era === 'home') shadows.push(CRADLE_HULL.map((q) => pose(theta, q)).map(([x, y]) => [x + dx, y] as Pt))
    if (era === 'bed') shadows.push(BED_HULL, CLOCK_HULL, LAMP_HULL)
    if (era === 'recruit') shadows.push(TV_HULL)
    if (era === 'flash') shadows.push(STOOL_HULL)
    if (era === 'teen') shadows.push(TEEN_STOOL_HULL)
    if (era === 'home' && T < BEGIN) balls.push([ianX(T), 0])
    if (era === 'home' && T >= BEGIN && T < IAN_GONE) balls.push([ianAfter(T), 0])
    drawRoom(p, k, T)
    if (era === 'dawn' || era === 'home') {
      p.push()
      p.translate(dx * k, 0)
      drawCradle(p, k, theta, L)
      p.pop()
    }
    if (era === 'bed') {
      drawLamp(p, k, T, L)
      drawBed(p, k, T, L)
      drawClock(p, k, T, L)
    }
    if (era === 'recruit') drawTV(p, k, T, L)
    if (era === 'recruit') drawRecruit(p, k, T)
    if (era === 'flash') {
      drawSheet(p, k, T, L)
      drawStool(p, k, T, L)
    }
    if (era === 'teen') drawTeenStool(p, k, T, L)
    drawMirror(p, k, T)
    // Louise first, then Ian when he is here: the same order `balls` has them in; and Hannah when she is on the floor.
    const mirrored = balls.map((b, i) => [b, i === 0 ? LOUISE : IAN] as [Pt, string])
    const down = era === 'teen' && hannahTeenDown(T) ? hannahTeenAt(T) : null
    if (down) mirrored.push([down, HANNAH])
    drawBallMirror(p, k, T, mirrored)
    drawFloorLight(p, k, T, shadows, down ? [...balls, down] : balls)
    if (era === 'recruit') drawTVGlow(p, k, T)
    drawVignette(p, k, T)
  },
  over: (p, _s, c) => {
    const T = c.t
    const era = eraOf(T)
    if (era === 'recruit') drawRecruitOver(p, c.k, T)
    if (era === 'bed') drawBedOver(p, c.k, T, lightAt(T))
    if (era === 'dawn' || era === 'home') {
      p.push()
      p.translate((era === 'home' && T < BEGIN ? EMPTY_DX : 0) * c.k, 0)
      drawCradleOver(p, c.k, cradleTheta(T), lightAt(T))
      p.pop()
    }
  },
})

/* ------------------------------------------------------------------ where each time starts */

/** Where each of the room's legs starts (the ball comes in at (-0.5, 0) from it), in the house's world cells. Dawn and
 * the bed are the same place on the floor (the bed stands where the cradle stood); the night they come for her is where
 * she ends at the bed; home starts by the window across the room and ends where dawn began. */
export const DAWN_AT: Pt = [0.5, 0]
export const TEEN_AT: Pt = [TEEN_X + 0.5, 0]
export const BED_AT: Pt = [0.5, 0]
export const RECRUIT_AT: Pt = [NEWS_X + 0.5, 0]
export const FLASH_AT: Pt = [FLASH_X + 0.5, 0]
export const HOME_AT: Pt = [HOME_X + 0.5, 0]


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

/* ------------------------------------------------------------------ years on, at the window */

export const teen: Part<HouseState> = part<HouseState>(
  { name: 'house-teen', draw: nothing },
  (slot) => {
    const o = TEEN_AT
    const { segs, end } = floorLane(teenX, slot, o, [TN.touch, TN.off, TN.again])
    const company: Company[] = [
      {
        who: 'hannah',
        from: slot.begin,
        to: TEEN_GONE,
        at: (t) => {
          const h = hannahTeenAt(t)
          return h ? { x: h[0] - o[0], y: h[1] - o[1], scale: HANNAH_AGE.teen, spin: hannahTeenLook(t) } : null
        },
      },
    ]
    return { cells: partCells(o), exit: [end[0] + 0.5, end[1]], lane: { segs, fire: TN.touch - slot.begin }, state: { begin: slot.begin }, company }
  },
  () => {
    const o = TEEN_AT
    return TEEN_SHOTS.map(([t, cells, x, y, cut]) => ({ t, cells, hold: [x - o[0], y - o[1]] as Pt, w: 1, ...(cut ? { cut } : {}) }))
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
          const { fade, sink } = going(t)
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
      // The days of her illness (`DAYS`), each its own shot, cut in on the clock's strike that begins it: the grey
      // afternoon, the room and the clock;
      { t: 75.9, cells: 3.9, hold: w(1.15, -0.75) },
      // night, close on the two of them under the lamp;
      { t: 76.185, cells: 2.55, hold: w(0.62, -0.56), cut: true },
      { t: 80.25, cells: 2.5, hold: w(0.66, -0.55) },
      // a pale morning, her coming to the bed's side;
      { t: 80.376, cells: 3.25, hold: w(1.28, -0.6), cut: true },
      { t: 85.2, cells: 3.1, hold: w(1.3, -0.57) },
      // another grey day, the clock whole beside the bed, running down;
      { t: 85.31, cells: 3.6, hold: w(1.95, -0.92), cut: true },
      { t: 89.18, cells: 3.5, hold: w(1.95, -0.9) },
      // and the last evening, the lamp lit again, going to the blue hour: the clock's last notch and its pendulum
      // settling on the swell; then close on Hannah as she goes, and the empty pillow and Louise beside it.
      { t: 89.281, cells: 3.35, hold: w(1.55, -0.8), cut: true },
      { t: SWELL, cells: 3.45, hold: w(1.92, -0.9) },
      // Then in on her as she goes, close while she pales into the pillow, and held on it empty. (The push came after
      // she had gone: she went in the wide, small under the clock, and the close-up found an empty bed.)
      // The clock kept whole at the frame's right: pushed in past it, it was a sliver at the edge, and two fresh readers
      // took it for gone, the clock vanished with her.
      { t: 95.0, cells: 3.15, hold: w(1.95, -0.5) },
      { t: GONE[1], cells: 3.1, hold: w(1.93, -0.48) },
      { t: SEAM.news, cells: 4.6, hold: w(BEDSIDE_X + 1.05, -0.95) },
    ]
  },
)

/* ------------------------------------------------------------------ they come for her */

export const recruit: Part<HouseState> = part<HouseState>(
  { name: 'house-recruit', draw: nothing },
  (slot) => {
    const o = RECRUIT_AT
    const { segs, end } = floorLane(recruitX, slot, o, [RC.go])
    return { cells: partCells(o), exit: [end[0] + 0.5, end[1]], lane: { segs, fire: RC.go - slot.begin }, state: { begin: slot.begin } }
  },
  (slot) => {
    const o = RECRUIT_AT
    // Her on the screen: [right, down], a share of the frame's height from its middle.
    const on = (t: number, cells: number, s: Pt): PartShot => ({ t, cells, hold: [recruitX(t) - s[0] * cells - o[0], -s[1] * cells - o[1]], w: 1 })
    return [
      // From the scale cut, the room at night round her, the television on her right and the long window over them,
      // as the light comes up over the lake;
      on(slot.begin + 0.9, 4.3, [0.2, 0.16]),
      // held as it sweeps in and finds her;
      on(RC.found, 4.2, [0.12, 0.16]),
      // and after her as she goes, so at the cut (a scale cut out to the camp in Montana) she is where the camp's wide
      // has her as she lands on the meadow.
      on(RC.go + 0.3, 4.2, [0.09, 0.15]),
      on(slot.end, 4.2, [0.043, 0.145]),
    ]
  },
)

/* ------------------------------------------------------------------ the flash */

export const flash: Part<HouseState> = part<HouseState>(
  { name: 'house-flash', draw: nothing },
  (slot) => {
    const o = FLASH_AT
    const { segs, end } = floorLane(flashX, slot, o, [F.touch])
    const company: Company[] = [
      {
        who: 'hannah',
        from: slot.begin,
        to: slot.end,
        at: (t) => {
          const [x, y] = hannahFlashAt(t)
          return { x: x - o[0], y: y - o[1], scale: HANNAH_AGE.child, spin: hannahFlashLook(t) }
        },
      },
    ]
    return { cells: partCells(o), exit: [end[0] + 0.5, end[1]], lane: { segs, fire: F.touch - slot.begin }, state: { begin: slot.begin }, company }
  },
  (slot) => {
    const o = FLASH_AT
    const w = (x: number, y: number): Pt => [x - o[0], y - o[1]]
    return [
      // From the chamber's framing in to the two of them and her sheet on the glass, and held while she draws, her ring
      // last; then the scale cut out to the world's ring of twelve (the share), her place on the screen held.
      { t: slot.begin + 2.0, cells: 2.25, hold: w(FLASH_X + 0.66, -0.55) },
      { t: F.daddy, cells: 2.2, hold: w(FLASH_X + 0.64, -0.56) },
      { t: slot.end, cells: 2.45, hold: w(FLASH_X + 0.62, -0.68) },
    ]
  },
)

/* ------------------------------------------------------------------ home */

/**
 * Home: two legs either side of the run remembered (`lawn.ts`, `recall`), one part. It comes in where she is on the floor
 * at its slot's start: by the window (HOME_AT), and a step nearer the cradle (CRADLE_AT).
 */
const homeAt = (t: number): Pt => [homeX(t) + 0.5, 0]
export const CRADLE_AT: Pt = homeAt(SEAM.cradle)
export const home: Part<HouseState> = part<HouseState>(
  { name: 'house-home', draw: nothing },
  (slot) => {
    const o = homeAt(slot.begin)
    const { segs, end } = floorLane(homeX, slot, o, [337.85, TURN, NEAR, ...HOME_PUSHES.map((q) => q.t)])
    const all: Company[] = [
      {
        who: 'ian',
        from: slot.begin,
        to: Math.min(BEGIN, slot.end),
        at: (t) => ({ x: ianX(t) - o[0], y: -o[1], spin: ianLook(t) }),
      },
      {
        who: 'ian',
        from: BEGIN,
        to: IAN_GONE,
        at: (t) => ({ x: ianAfter(t) - o[0], y: -o[1], spin: ianAfterLook(t) }),
      },
      {
        who: 'hannah',
        from: BEGIN,
        to: slot.end + 1,
        at: (t) => {
          // She comes into the cradle the way she went from the bed, backwards: out of the linen, paler and smaller,
          // rising and filling into herself. Her foot stays where the cradle holds her.
          const [x, y] = babyAt(t)
          const { fade, sink } = going(t)
          const pale = mix(HOUSE.linen, HOUSE.linenShade, 0.4)
          const scale = HANNAH_AGE.baby * (1 - 0.985 * sink)
          return {
            x: x - o[0],
            y: y + R * (HANNAH_AGE.baby - scale) - o[1],
            scale,
            spin: BABY_LOOK + cradleTheta(t),
            color: mix(HANNAH, pale, fade),
            rim: mix(BABY_RIM, pale, fade),
          }
        },
      },
    ]
    // Before the cut away, only Ian by the window; after it, all of it.
    const company = all.filter((c) => c.from < slot.end)
    const fire = (slot.end > BEGIN ? BEGIN : HUG_T) - slot.begin
    return { cells: partCells(o), exit: [end[0] + 0.5, end[1]], lane: { segs, fire }, state: { begin: slot.begin }, company }
  },
  (slot) => {
    const o = homeAt(slot.begin)
    const w = (x: number, y: number): Pt => [x - o[0], y - o[1]]
    const first = w(1.05, -0.95)
    const keys: PartShot[] = [
      // Close on the two of them by the long window, the empty cradle whole on their right; as they turn to it and go
      // toward it, the frame goes with them.
      { t: 336.4, cells: 3.35, hold: w(0.95, -0.6) },
      { t: HUG_T, cells: 3.1, hold: w(1.08, -0.53) },
      { t: TURN, cells: 3.0, hold: w(1.15, -0.51) },
      { t: NEAR, cells: 2.92, hold: w(1.22, -0.5) },
      { t: BEGIN, cells: 2.85, hold: w(1.26, -0.49) },
      // The opening played backwards: as Hannah comes, the camera goes in to the cradle, to the dawn's closest framing,
      // over the chord; close through the last B-flat; then one long slow draw back, arriving on the first frame
      // exactly on the last attack, and held there to the end. (It was a cut, onto nearly the same framing, and read as
      // a slip in the edit.)
      { t: PLAGAL, cells: 2.6, hold: w(0.7, -0.4) },
      { t: TONIC, cells: 2.7, hold: w(0.69, -0.41) },
      { t: LAST, cells: 4.6, hold: first },
      ...(slot.end > LAST ? [{ t: slot.end, cells: 4.6, hold: first }] : []),
    ]
    return keys
  },
)

/* ------------------------------------------------------------------ strikes */

/** Every strike of the house's parts. */
export const HOUSE_HITS: number[] = [
  // Dawn: she rocks the cradle on every chord.
  ...DAWN_PUSHES.map((q) => q.t),
  // Years on at the window: the room, her touch on the stool, Hannah rounding on her and going, the empty stool.
  ...TEEN_HITS,
  // The bed: the clock strikes on the chords, and on the swell it has run down.
  ...CLOCK_STRIKES,
  // They come for her: the light over the lake, the beam finding her, her going.
  ...RECRUIT_HITS,
  // The flash: Hannah's strokes on the beats, and her mother's touch on the stool on the chord.
  ...FLASH_HITS,
  // Home: the sun through the glass, the touch, the turn to the empty cradle, the step toward it, and the cradle again.
  SEAM.home,
  337.85,
  TURN,
  NEAR,
  ...HOME_PUSHES.map((q) => q.t),
].sort((a, b) => a - b)
