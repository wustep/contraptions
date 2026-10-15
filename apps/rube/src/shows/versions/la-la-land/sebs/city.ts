import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../parts'
import { frame, glow, hash, knock, rgba, scenery, smooth } from './kit'
import { END_AT, level } from './music'
import { MIA, NIGHT_MAT, SEBS_MAT } from './worlds'
import { picture } from './lens'
import { insideRoom } from './club/room'
import { FIGURE_AT, FIGURE_SIZE, FIGURE_TURN, KINDLED } from './night/stars'
import { drawPianoFigure } from './piano-figure'
import { DIP, POLE, skyAngle } from './night/painted-waltz'

/**
 * The city of stars round Seb's: what the camera comes in from at the start
 * and draws back into at the end. It is drawn in the piano's frame (the
 * club's room stands on the same origin and draws the building and the
 * street in front of it); everything here is beyond the club and further
 * off the higher it stands: the night sky, the stars, the hills with the
 * observatory on the ridge, the basin full of lights and the towers
 * downtown. (The block the club stands on, its houses and the palms along its
 * pavement, are `street.ts`'s.) Far things slide against the camera, so a
 * push-in feels deep. Nothing hangs in the sky but the stars: no beams.
 *
 * It is a city that is going somewhere: cars along the boulevards and the
 * cross streets of the basin, white coming and red going, a freeway sweeping
 * through it, a train, planes coming down in a line, cars on the road up the
 * hills and the lights of the homes on them. At the start it is late and
 * quiet, a few cars; at the end it fills as The End's orchestra swells, until
 * the whole basin is moving under the stars.
 */
export interface CityState {
  end: boolean
}

/**
 * Where the street is in front of the club, and the horizon beyond. The basin between them is the city seen from a
 * little above, receding: its lights are dense and small at the horizon and fewer and larger toward the street.
 */
const STREET = 3.1
export const HORIZON = -6

const SKY_TOP = '#07061A'
const SKY_MID = '#1B1540'
const SKY_LOW = '#4A2A62'
const HAZE = '#8A4F82'
const HILL_FAR = '#1E1737'
const HILL_NEAR = '#130F26'
const TOWER = '#161330'
const LIGHT = '#F2C46B'
const LIGHT_COOL = '#DCE6FF'
const PALM = '#0C0A18'

/** The stars: positions in a tile of sky a hundred cells wide, sizes, and the slow phases they breathe on. Fixed. */
const STARS = Array.from({ length: 900 }, (_, i) => ({
  x: hash(i, 1, 7) * 140 - 70,
  y: -44 + hash(i, 2, 7) * 42,
  r: 0.02 + Math.pow(hash(i, 3, 7), 6) * 0.07,
  ph: hash(i, 4, 7) * Math.PI * 2,
  sp: 0.4 + hash(i, 5, 7) * 1.1,
  /** One in fifteen or so is a bright one, a larger point: the city of stars has stars that read as stars. */
  bright: hash(i, 6, 7) > 0.935,
}))

/** The basin's lights: depth 1 at the horizon, 0 at the street; far ones many and small. */
const LIGHTS = Array.from({ length: 1400 }, (_, i) => {
  const d = Math.pow(hash(i, 1, 11), 0.45)
  return {
    x: hash(i, 2, 11) * 150 - 75,
    // Depth 0 (near, below the horizon) to 1 (at the horizon).
    d,
    warm: hash(i, 3, 11) < 0.78,
    ph: hash(i, 4, 11) * Math.PI * 2,
    big: hash(i, 5, 11) > 0.93,
  }
})

/**
 * Theirs: the constellation the melody lit round the two of them among the stars, as it stood at the dip, found
 * again in the sky over the city at the end. On The End's swell its stars come out one by one in the order they
 * were lit, in the night's gold among the city's cool stars: high on the right, clear of the credits. In the piano's
 * frame.
 */
const THEIRS_SCALE = 2.15
const THEIRS_PTS = (() => {
  const a = skyAngle(DIP)
  return KINDLED.map((q) => [q.local[0] * Math.cos(a) - q.local[1] * Math.sin(a), q.local[0] * Math.sin(a) + q.local[1] * Math.cos(a)] as Pt)
})()
const THEIRS_C: Pt = [THEIRS_PTS.reduce((s, q) => s + q[0], 0) / THEIRS_PTS.length, THEIRS_PTS.reduce((s, q) => s + q[1], 0) / THEIRS_PTS.length]
export const THEIRS = THEIRS_PTS.map(([x, y], i) => ({ x: 21.5 + (x - THEIRS_C[0]) * THEIRS_SCALE, y: -25.5 + (y - THEIRS_C[1]) * THEIRS_SCALE, size: KINDLED[i].size }))
/**
 * And the figure the planetarium drew round them at the dip, the grand piano, found again round their stars over the
 * city: where it stood against them then, as big against them as it was. It draws on once the last of theirs has
 * come out, and holds to the end.
 */
export const THEIRS_FIGURE = {
  at: [21.5 + (FIGURE_AT()[0] - POLE[0] - THEIRS_C[0]) * THEIRS_SCALE, -25.5 + (FIGURE_AT()[1] - POLE[1] - THEIRS_C[1]) * THEIRS_SCALE] as Pt,
  size: FIGURE_SIZE * THEIRS_SCALE,
  turn: FIGURE_TURN,
}
/** When each of theirs comes out: one by one from a beat after the swell. */
export const THEIRS_AT = THEIRS.map((_, i) => END_AT + 32.268 + 2.3 + i * 0.42)

/** Boulevards: lines of brighter lamps running from the street to a point on the horizon, how a city at night shows its depth. */
const VANISH = 6
const BOULEVARDS = [-70, -46, -27, -12, 20, 38, 58, 84].map((xNear, i) => ({
  xNear,
  xFar: VANISH + (i - 3.5) * 1.4,
  n: 46,
  ph: hash(i, 9, 13) * 6,
}))

/** The towers downtown: x, width, height (cells above the horizon), and which windows are lit. */
const TOWERS = [
  { x: 23, w: 1.6, h: 7.5 },
  { x: 25.2, w: 1.1, h: 10.5 },
  { x: 26.8, w: 1.9, h: 8.6 },
  { x: 29.1, w: 1.2, h: 12.2 },
  { x: 30.7, w: 1.5, h: 9.4 },
  { x: 32.6, w: 1.0, h: 6.8 },
  { x: 34, w: 1.7, h: 11.1 },
  { x: 36.1, w: 1.3, h: 7.7 },
]

/** Palms along the street either side of the club: x and height. (`street.ts` stands them in front of the houses.) */
export const PALMS = [
  { x: -23, h: 9.5, lean: -0.05 },
  { x: -19.5, h: 11.2, lean: 0.03 },
  { x: 18.5, h: 10.4, lean: 0.04 },
  { x: 22.5, h: 12.0, lean: -0.03 },
  { x: 31, h: 9.1, lean: 0.02 },
  { x: -31, h: 10.1, lean: -0.02 },
]

/** The ridgelines, as heights above the horizon along x: two layers, far and near. */
const ridge = (x: number, far: boolean): number => {
  if (far) return 5.2 + 2.2 * Math.sin(x * 0.07 + 0.6) + 1.3 * Math.sin(x * 0.19 + 2.1) + 0.5 * Math.sin(x * 0.53)
  return 2.4 + 1.8 * Math.sin(x * 0.09 + 3.2) + 0.9 * Math.sin(x * 0.23 + 0.4) + 0.3 * Math.sin(x * 0.71 + 1.3)
}

/** The observatory's ridge: the near hills, left of the club. */
const OBSERVATORY = -28

/**
 * The End's orchestra arriving (its one clear onset), and the swell it climbs to: through the swell the city's lights
 * grow with the music, the traffic fills the basin, and the observatory on its ridge, where the planetarium is, lights
 * up.
 */
export const SWELL = END_AT + 32.268
/** The End's last chord, which the piano in the stars plays (the credits' own reckoning of it). */
const FINAL_CHORD = END_AT + 39.4
export const CITY_HITS = [SWELL]

/**
 * Many small lights, gathered into a path per colour and brightness level and filled once each: a thousand lamps are
 * a few dozen fills, not a thousand.
 */
const LEVELS = 8
export function lightBatch() {
  const paths = new Map<string, Path2D[]>()
  return {
    dot(color: string, a: number, x: number, y: number, r: number) {
      if (a <= 0.01) return
      let ps = paths.get(color)
      if (!ps) {
        ps = Array.from({ length: LEVELS }, () => new Path2D())
        paths.set(color, ps)
      }
      const lv = Math.max(0, Math.min(LEVELS - 1, Math.floor(Math.min(1, a) * LEVELS)))
      // Under two pixels, a dot is a square: the same on the screen, and much cheaper to fill by the thousand.
      if (r < 2) ps[lv].rect(x - r, y - r, 2 * r, 2 * r)
      else {
        ps[lv].moveTo(x + r, y)
        ps[lv].arc(x, y, r, 0, Math.PI * 2)
      }
    },
    rect(color: string, a: number, x: number, y: number, w: number, h: number) {
      if (a <= 0.01) return
      let ps = paths.get(color)
      if (!ps) {
        ps = Array.from({ length: LEVELS }, () => new Path2D())
        paths.set(color, ps)
      }
      const lv = Math.max(0, Math.min(LEVELS - 1, Math.floor(Math.min(1, a) * LEVELS)))
      ps[lv].rect(x, y, w, h)
    },
    fill(ctx: CanvasRenderingContext2D) {
      for (const [color, ps] of paths) ps.forEach((path, lv) => {
        ctx.fillStyle = rgba(color, (lv + 0.5) / LEVELS)
        ctx.fill(path)
      })
    },
  }
}

/**
 * Her name in lights, without a letter: the sign on the far hills, nine blocks as the Hollywood number's were. Over
 * the city at the start it stands pale and unlit. At the end, on The End's swell, it lights in her yellow, a block at a
 * time from the middle out, as it did at the top of the number in the dream: what the dream gave her, she has. His
 * club is lit below it, and the piano in the stars above them both is what they had only in the dream.
 */
export const SIGN_U = [-8.4, -2.9]
const SIGN_BLOCKS = 9
/** When each block lights, middle first: from the swell's arrival, before their stars come out. */
export const SIGN_AT = Array.from({ length: SIGN_BLOCKS }, (_, i) => SWELL + 0.35 + Math.abs(i - (SIGN_BLOCKS - 1) / 2) * 0.32)
function drawSign(p: p5, k: number, t: number, end: boolean, ox: number, oy: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const [u0, u1] = SIGN_U
  const step = (u1 - u0) / SIGN_BLOCKS
  // Lit, its yellow lies on the hill under it, more as more of it lights: below the blocks, not round them.
  const lit = end ? SIGN_AT.reduce((n, a) => n + smooth(t, a, a + 0.25), 0) / SIGN_BLOCKS : 0
  if (lit > 0.01) glow(p, k, (u0 + u1) / 2 + ox, HORIZON + oy - 3.55, (u1 - u0) * 0.7, MIA, 0.2 * lit, 1, 0.26)
  for (let i = 0; i < SIGN_BLOCKS; i++) {
    const u = u0 + step * (i + 0.5)
    // Level along the hill's face, a little under the crest, the blocks set a hair up and down as the real ones are.
    const top = HORIZON + oy - 5.55 + 0.07 * Math.sin(i * 2.3)
    const w = step * 0.72
    const h = 0.85
    const x = u + ox - w / 2
    const on = end ? smooth(t, SIGN_AT[i], SIGN_AT[i] + 0.25) : 0
    // The struts behind it, down into the hill.
    ctx.fillStyle = rgba('#0B0A14', 0.8)
    ctx.fillRect((x + w * 0.2) * k, (top + h) * k, 0.06 * k, 0.5 * k)
    ctx.fillRect((x + w * 0.75) * k, (top + h) * k, 0.06 * k, 0.5 * k)
    // Unlit, a pale block in the dark; lit, her yellow, with its glow on the hill.
    ctx.fillStyle = rgba('#C9C2D6', 0.32 * (1 - on))
    ctx.fillRect(x * k, top * k, w * k, h * k)
    if (on > 0.01) {
      ctx.fillStyle = rgba(MIA, 0.95 * on)
      ctx.fillRect(x * k, top * k, w * k, h * k)
      ctx.fillStyle = rgba('#FFF4C8', 0.5 * on)
      ctx.fillRect((x + w * 0.15) * k, (top + h * 0.12) * k, w * 0.7 * k, h * 0.3 * k)
    }
  }
}

export const city = scenery<CityState>({
  name: 'city',
  draw(p, s, c) {
    const k = c.k
    const t = c.t
    // Inside the club the room covers the whole city: nothing of it is seen.
    if (insideRoom(picture(p, k, t))) return
    const fr = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    // Parallax: a layer at depth d slides with the camera by (1 - d) of the way.
    const slide = (d: number) => (fr.cx) * (1 - d)
    const lift = (d: number) => (fr.cy - HORIZON) * (1 - d) * 0.35

    // The sky, top to the horizon, and a low haze of the city's light on it.
    const top = Math.min(fr.y0, HORIZON - 40)
    const g = ctx.createLinearGradient(0, top * k, 0, HORIZON * k)
    g.addColorStop(0, SKY_TOP)
    g.addColorStop(0.55, SKY_MID)
    g.addColorStop(0.88, SKY_LOW)
    g.addColorStop(1, HAZE)
    ctx.fillStyle = g
    ctx.fillRect((fr.x0 - 1) * k, (fr.y0 - 1) * k, (fr.x1 - fr.x0 + 2) * k, (fr.y1 - fr.y0 + 2) * k)

    // Stars: far, so they barely move.
    ctx.save()
    const sx = slide(0.08)
    const sy = lift(0.08)
    // A star's size is in cells, so in the widest shots it would shrink below a pixel: it keeps a floor, in pixels of a
    // 540-line frame, so the sky is as starry wide as it is close.
    const px = ((fr.y1 - fr.y0) * k) / 540
    const starDots = lightBatch()
    for (const st of STARS) {
      const x = st.x + sx
      const y = st.y + sy
      if (x < fr.x0 - 1 || x > fr.x1 + 1 || y < fr.y0 - 1 || y > fr.y1 + 1 || y > HORIZON - 3) continue
      // Steady points, breathing a little in their own time; the bright ones larger, not haloed.
      const tw = 0.82 + 0.18 * Math.sin(t * st.sp * 0.6 + st.ph)
      const r = Math.max(0.75 * px, st.r * k, st.bright ? 1.5 * px : 0)
      starDots.dot(LIGHT_COOL, (st.bright ? 0.95 : 0.6) * tw, x * k, y * k, r)
    }
    starDots.fill(ctx)
    if (s.end && t > THEIRS_AT[0] - 0.1) {
      // Theirs, coming out over the city, each a crisp point in the night's gold that comes out a size larger and
      // settles to its own; on the last chord, which the piano round them plays, they step up and hold.
      const at = (i: number): Pt => [THEIRS[i].x + sx, THEIRS[i].y + sy]
      const chord = smooth(t, FINAL_CHORD - 0.05, FINAL_CHORD + 0.35)
      THEIRS.forEach((q, i) => {
        const since = t - THEIRS_AT[i]
        if (since < 0) return
        const [x, y] = at(i)
        const on = smooth(since, 0, 0.12)
        const come = 1 - smooth(since, 0.1, 0.7)
        const r = Math.max(1.8 * px, 0.065 * k) * (0.75 + 0.25 * (q.size / 0.036)) * (1 + 0.35 * come + 0.3 * chord)
        ctx.fillStyle = rgba('#FFF2CC', on)
        ctx.beginPath()
        ctx.arc(x * k, y * k, r, 0, Math.PI * 2)
        ctx.fill()
      })
      const last = THEIRS_AT[THEIRS_AT.length - 1]
      const fd = smooth(t, last + 0.05, last + 0.6) * 1.4
      if (fd > 0) {
        const [fx, fy] = THEIRS_FIGURE.at
        drawPianoFigure(p, k, [fx + sx, fy + sy], THEIRS_FIGURE.size, THEIRS_FIGURE.turn, fd, smooth(t, last, last + 0.35), NIGHT_MAT.gold, 1.3 * px, knock(t - FINAL_CHORD, 1.1))
      }
    }
    ctx.restore()

    // The far hills, then the towers downtown, then the near hills with the observatory on the ridge.
    const hills = (far: boolean, color: string, d: number) => {
      const ox = slide(d)
      const oy = lift(d)
      // Lit from below by the city: a little warmer and lighter toward their foot, dark at the crest against the sky.
      const hg = ctx.createLinearGradient(0, (HORIZON + oy - 9) * k, 0, (HORIZON + oy) * k)
      hg.addColorStop(0, color)
      hg.addColorStop(1, mixHex(color, '#4A2A55', 0.35))
      ctx.fillStyle = hg
      ctx.beginPath()
      ctx.moveTo((fr.x0 - 1) * k, (HORIZON + 2 + oy) * k)
      for (let x = fr.x0 - 1; x <= fr.x1 + 1; x += 0.5) ctx.lineTo(x * k, (HORIZON + oy - ridge(x - ox, far)) * k)
      ctx.lineTo((fr.x1 + 1) * k, (HORIZON + 2 + oy) * k)
      ctx.closePath()
      ctx.fill()
    }
    hills(true, HILL_FAR, 0.2)
    hillLife(p, k, t, s.end, fr, slide(0.2), lift(0.2), px)
    drawSign(p, k, t, s.end, slide(0.2), lift(0.2))

    const tx = slide(0.35)
    const ty = lift(0.35)
    const windows = lightBatch()
    for (const [i, tw] of TOWERS.entries()) {
      const x = tw.x + tx
      if (x + tw.w < fr.x0 - 1 || x > fr.x1 + 1) continue
      const y0 = HORIZON + ty - tw.h
      ctx.fillStyle = TOWER
      ctx.fillRect(x * k, y0 * k, tw.w * k, (tw.h + 1) * k)
      // Windows: a few lit, fixed.
      for (let r = 0; r < Math.floor(tw.h / 0.45); r++) {
        for (let q = 0; q < Math.floor(tw.w / 0.3); q++) {
          const lit = hash(i, r * 7 + q, 3)
          if (lit < 0.8) continue
          windows.rect(LIGHT, 0.35 + 0.4 * (lit - 0.8) * 5, (x + 0.12 + q * 0.3) * k, (y0 + 0.3 + r * 0.45) * k, 0.1 * k, 0.16 * k)
        }
      }
      // A red lamp for the planes on the tallest, a point, on and off.
      if (tw.h > 12) {
        ctx.fillStyle = rgba('#E0533D', Math.sin(t * 2.4) > 0.3 ? 0.95 : 0.25)
        ctx.fillRect((x + tw.w / 2) * k - 1.2 * px, (y0 - 0.15) * k - 1.2 * px, 2.4 * px, 2.4 * px)
      }
    }
    windows.fill(ctx)
    planes(ctx, k, t, s.end, fr, slide(0.12), lift(0.12), px)

    // The near hills: a spur on the left that the observatory stands on, falling away before the club.
    {
      const ox0 = slide(0.45)
      const oy0 = lift(0.45)
      ctx.fillStyle = HILL_NEAR
      ctx.beginPath()
      ctx.moveTo((OBSERVATORY - 30 + ox0) * k, (HORIZON + 2 + oy0) * k)
      for (let x = OBSERVATORY - 30; x <= OBSERVATORY + 22; x += 0.5) {
        const fall = smooth(x, OBSERVATORY + 4, OBSERVATORY + 22)
        ctx.lineTo((x + ox0) * k, (HORIZON + oy0 - (ridge(x, false) + 2.6) * (1 - fall) + 1.2 * fall) * k)
      }
      ctx.lineTo((OBSERVATORY + 22 + ox0) * k, (HORIZON + 2 + oy0) * k)
      ctx.closePath()
      ctx.fill()
    }
    // The observatory on its ridge: a long low building, a dome at each end and a big one in the middle.
    const ox = OBSERVATORY + slide(0.45)
    if (ox > fr.x0 - 4 && ox < fr.x1 + 4) {
      const oy = HORIZON + lift(0.45) - ridge(OBSERVATORY, false) - 2.6 + 0.05
      ctx.fillStyle = HILL_NEAR
      // The terrace it stands on, cut into the ridge and falling away down the slope, so none of it hangs in the air.
      ctx.beginPath()
      ctx.moveTo((ox - 3.4) * k, (oy + 2.2) * k)
      ctx.quadraticCurveTo((ox - 2.2) * k, (oy + 0.05) * k, (ox - 1.5) * k, (oy + 0.02) * k)
      ctx.lineTo((ox + 1.8) * k, (oy + 0.02) * k)
      ctx.quadraticCurveTo((ox + 2.6) * k, (oy + 0.1) * k, (ox + 3.6) * k, (oy + 1.6) * k)
      ctx.lineTo((ox + 3.6) * k, (oy + 2.2) * k)
      ctx.closePath()
      ctx.fill()
      ctx.fillRect((ox - 1.6) * k, (oy - 0.45) * k, 3.2 * k, 0.5 * k)
      ctx.beginPath()
      ctx.arc(ox * k, (oy - 0.45) * k, 0.62 * k, Math.PI, 0)
      ctx.arc((ox - 1.45) * k, (oy - 0.45) * k, 0.32 * k, Math.PI, 0)
      ctx.arc((ox + 1.45) * k, (oy - 0.45) * k, 0.32 * k, Math.PI, 0)
      ctx.fill()
      const lit = s.end ? smooth(t, SWELL, SWELL + 3) : 0
      // Floodlit from its terrace, as it is every night: its walls and domes pale against the hill, more so as it lights.
      const stone = mixHex('#3A3152', '#D9CDB5', 0.25 + 0.5 * lit)
      ctx.fillStyle = stone
      ctx.fillRect((ox - 1.6) * k, (oy - 0.45) * k, 3.2 * k, 0.42 * k)
      ctx.beginPath()
      ctx.arc(ox * k, (oy - 0.45) * k, 0.56 * k, Math.PI, 0)
      ctx.arc((ox - 1.45) * k, (oy - 0.45) * k, 0.27 * k, Math.PI, 0)
      ctx.arc((ox + 1.45) * k, (oy - 0.45) * k, 0.27 * k, Math.PI, 0)
      ctx.fill()
      // The domes' shade on their right, away from the floods.
      ctx.fillStyle = rgba(HILL_NEAR, 0.45)
      ctx.beginPath()
      ctx.arc(ox * k, (oy - 0.45) * k, 0.56 * k, -Math.PI / 2, 0)
      ctx.lineTo(ox * k, (oy - 0.45) * k)
      ctx.fill()
      // Its windows, and the floods' light on the terrace below it.
      ctx.fillStyle = rgba(LIGHT, 0.35 + 0.55 * lit)
      for (let w = -3; w <= 3; w++) ctx.fillRect((ox + w * 0.4 - 0.06) * k, (oy - 0.32) * k, 0.12 * k, 0.16 * k)
      glow(p, k, ox, oy + 0.15, 1.8, LIGHT, 0.08 + 0.14 * lit, 1.4, 0.3)
    }

    // The basin: dark ground from the hills' foot to the street, and on it the lights of the city.
    const basin = ctx.createLinearGradient(0, (HORIZON + lift(0.3)) * k, 0, STREET * k)
    basin.addColorStop(0, '#1A1433')
    basin.addColorStop(1, SEBS_MAT.deep)
    ctx.fillStyle = basin
    ctx.fillRect((fr.x0 - 1) * k, (HORIZON + lift(0.45) + 0.4) * k, (fr.x1 - fr.x0 + 2) * k, (STREET - HORIZON + 2) * k)
    // Through The End's swell the whole city brightens with the music: its lights, and the glow of them on the air
    // over it, which warms with the orchestra, holds through the last chord, and settles as it dies away, so the last
    // seconds of silence are the city as it was.
    const swell = s.end ? smooth(t, SWELL - 6, SWELL + 1) * level(t) : 0
    const swellLight = 1 + 0.7 * swell
    // The scattered lights of the basin hold back a little as its streets fill with cars, so its grid shows.
    const scatter = 0.85 - 0.2 * smooth(busy(t, s.end), 0.4, 1)
    // The city's own glow on the air over it.
    glow(p, k, VANISH + slide(0.25), HORIZON + 0.8 + lift(0.25), 26, '#C9795E', 0.16 + 0.26 * swell, 1.6, 0.28 + 0.08 * swell)
    const lamps = lightBatch()
    for (const b of BOULEVARDS) {
      for (let j = 1; j <= b.n; j++) {
        // Lamps evenly spaced along the ground, so closer together on the screen the further off they are.
        const near = Math.pow(j / b.n, 1.25)
        // They thin out before the street: a lamp near enough to be big would stand beside the club, not in the basin.
        const fade = 1 - smooth(near, 0.68, 0.9)
        if (fade <= 0.01) continue
        const dd = 0.2 + 0.6 * near
        const x = b.xFar + (b.xNear - b.xFar) * near + slide(dd)
        const y = HORIZON + (STREET - 0.6 - HORIZON) * Math.pow(near, 1.6) + lift(dd)
        if (x < fr.x0 - 1 || x > fr.x1 + 1 || y < fr.y0 - 1 || y > fr.y1 + 1) continue
        const tw = 0.8 + 0.2 * Math.sin(t * 0.6 + j * 0.7 + b.ph)
        lamps.dot('#F7C779', (0.45 + 0.4 * near) * tw * fade, x * k, y * k, Math.max(0.6, Math.min(0.045 * (0.5 + 1.5 * near) * k, 2.6 * px)))
      }
    }
    for (const l of LIGHTS) {
      // A light's nearness: at the horizon it moves with the far hills, at the street almost with the world.
      const near = 1 - l.d
      const dd = 0.2 + 0.6 * near
      const x = l.x * (0.45 + 0.55 * near) + slide(dd)
      const y = HORIZON + (STREET - 0.6 - HORIZON) * Math.pow(near, 1.6) + lift(dd)
      if (x < fr.x0 - 1 || x > fr.x1 + 1 || y < fr.y0 - 1 || y > fr.y1 + 1) continue
      const tw = 0.6 + 0.4 * Math.sin(t * (0.8 + l.d) + l.ph)
      // Sized in cells, as the stars are, but the lights are miles off: close by the club's door they would swell into
      // discs, so they keep a ceiling in pixels of a 540-line frame, as the stars keep a floor.
      const r = (l.big ? 0.06 : 0.032) * (0.55 + 1.4 * near)
      lamps.dot(l.warm ? LIGHT : LIGHT_COOL, (0.3 + 0.5 * tw) * (0.75 + 0.25 * near) * swellLight * scatter, x * k, y * k, Math.max(0.5, Math.min(r * k, (l.big ? 3 : 1.8) * px)))
    }
    lamps.fill(ctx)
    traffic(ctx, k, t, s.end, fr, slide, lift, px)

    // The near ground, from the street to the front of the frame.
    ctx.fillStyle = SEBS_MAT.deep
    ctx.fillRect((fr.x0 - 1) * k, (STREET - 0.2) * k, (fr.x1 - fr.x0 + 2) * k, (Math.max(fr.y1, STREET + 6) - STREET + 1) * k)

  },
})


/* ------------------------------------------------------------------ the city going somewhere */

/**
 * How busy the city is: late and quiet at the start, a few cars; at the end it fills from the band on and is at its
 * fullest as The End's orchestra climbs (490 to 503). Each car, plane and home is out only while the city is busier than
 * its own number, so the city fills by more of everything coming out, never by anything jumping.
 */
function busy(t: number, end: boolean): number {
  return end ? 0.4 + 0.6 * smooth(t, 486, 500) : 0.2
}
/** How much of one thing whose number is `h` (0..1) is out when the city is `b` busy. */
const out = (b: number, h: number): number => smooth(b, h * 0.92, h * 0.92 + 0.08)

const HEAD = '#FFF1D6'
const TAIL = '#FF5A45'
type Slide = (d: number) => number
/**
 * A point of the basin's ground, `gx` across (cells at the street's depth) and `near` 0 at the horizon to 1 at the
 * street, into `BX`, `BY`: thousands a frame, so no array for each.
 */
let BX = 0
let BY = 0
function basinAt(gx: number, near: number, slide: Slide, lift: Slide): void {
  const dd = 0.2 + 0.6 * near
  BX = gx * (0.45 + 0.55 * near) + slide(dd)
  BY = HORIZON + (STREET - 0.6 - HORIZON) * Math.pow(near, 1.6) + lift(dd)
}
/** A car's lamp at depth `near`: a little larger near, never more than a lamp's few pixels. */
const lampR = (near: number, k: number, px: number) => Math.max(0.55, Math.min(0.03 * (0.55 + 1.4 * near) * k, 1.7 * px))
/** Fading out where the basin's lights do, before the street, so nothing big drives past the club's door. */
const nearFade = (near: number) => 1 - smooth(near, 0.66, 0.86)

/** The cross streets: their depths, and their cars, each with its place on the street, its way and its number. */
const CROSS_NEAR = [0.1, 0.17, 0.25, 0.34, 0.45, 0.57, 0.68]
const CROSS_CARS = CROSS_NEAR.map((_, j) => Array.from({ length: 90 }, (_, i) => ({ g: hash(i, j, 21) * 150, dir: i % 2 ? 1 : -1, v: 1.6 + 1.2 * hash(i, j, 22), h: hash(i, j, 23) })))
/** The boulevards' cars: where along it (0 at the horizon, 1 at the street), coming or going, and their number. */
const BLVD_CARS = Array.from({ length: 8 }, (_, b) => Array.from({ length: 26 }, (_, i) => ({ u: hash(i, b, 31), dir: i % 2 ? 1 : -1, v: 0.012 + 0.01 * hash(i, b, 32), h: hash(i, b, 33) })))

/** The freeway sweeping through the basin, from near on the left round into downtown on the right: its line on the ground. */
const FREEWAY: Pt[] = (() => {
  const ctrl: Pt[] = [[-100, 0.62], [-60, 0.55], [-28, 0.46], [2, 0.42], [24, 0.37], [38, 0.27], [48, 0.15], [56, 0.05], [60, 0]]
  const pts: Pt[] = []
  for (let i = 0; i < ctrl.length - 1; i++) {
    const a = ctrl[Math.max(0, i - 1)]
    const b = ctrl[i]
    const c = ctrl[i + 1]
    const d = ctrl[Math.min(ctrl.length - 1, i + 2)]
    for (let j = 0; j < 24; j++) {
      const u = j / 24
      const u2 = u * u
      const u3 = u2 * u
      const cr = (p0: number, p1: number, p2: number, p3: number) => 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
      pts.push([cr(a[0], b[0], c[0], d[0]), cr(a[1], b[1], c[1], d[1])])
    }
  }
  pts.push(ctrl[ctrl.length - 1])
  return pts
})()
/** Its length along the ground (depth weighed as the basin's depth in cells), point by point. */
const FREEWAY_LEN = (() => {
  const out = [0]
  for (let i = 1; i < FREEWAY.length; i++) out.push(out[i - 1] + Math.hypot(FREEWAY[i][0] - FREEWAY[i - 1][0], (FREEWAY[i][1] - FREEWAY[i - 1][1]) * 90))
  return out
})()
const FREEWAY_CARS = Array.from({ length: 560 }, (_, i) => ({ d: hash(i, 41) * FREEWAY_LEN[FREEWAY_LEN.length - 1], dir: i % 2 ? 1 : -1, v: 7 + 3 * hash(i, 42), h: hash(i, 43) }))
let FG = 0
let FN = 0
/** Where `d` along the freeway is on the ground, into `FG`, `FN`. */
function freewayAt(d: number): void {
  const L = FREEWAY_LEN[FREEWAY_LEN.length - 1]
  const x = ((d % L) + L) % L
  let lo = 0
  let hi = FREEWAY_LEN.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (FREEWAY_LEN[mid] <= x) lo = mid
    else hi = mid
  }
  const f = (x - FREEWAY_LEN[lo]) / Math.max(1e-6, FREEWAY_LEN[hi] - FREEWAY_LEN[lo])
  FG = FREEWAY[lo][0] + (FREEWAY[hi][0] - FREEWAY[lo][0]) * f
  FN = FREEWAY[lo][1] + (FREEWAY[hi][1] - FREEWAY[lo][1]) * f
}

/** The Metro across the basin on its viaduct, at this depth; its trains, each a run of lit windows. */
const RAIL_NEAR = 0.4
const TRAINS = [
  { at: -2, g: 40, v: -4.2 },
  { at: 486, g: -110, v: 5.2 },
  { at: 497, g: 105, v: -4.6 },
]

/** The cars of the basin: the cross streets, the boulevards and the freeway, and the train. */
function traffic(ctx: CanvasRenderingContext2D, k: number, t: number, end: boolean, fr: { x0: number; x1: number; y0: number; y1: number }, slide: Slide, lift: Slide, px: number): void {
  const b = busy(t, end)
  const cars = lightBatch()
  const seen = (x: number, y: number) => x >= fr.x0 - 0.5 && x <= fr.x1 + 0.5 && y >= fr.y0 - 0.5 && y <= fr.y1 + 0.5
  // The freeway: its road a ribbon lit by its own lamps, wider as it comes nearer; the lamps along it, a dotted line of
  // sodium; and the river of lights on it, white coming and red going.
  ctx.lineCap = 'round'
  for (let i = 0; i + 1 < FREEWAY.length; i += 12) {
    const near = FREEWAY[Math.min(FREEWAY.length - 1, i + 6)][1]
    ctx.strokeStyle = rgba('#3B2A46', 0.85 * nearFade(near))
    ctx.lineWidth = Math.max(1.5, 0.16 * (0.45 + 0.55 * near) * k)
    ctx.beginPath()
    for (let j = i; j <= Math.min(FREEWAY.length - 1, i + 12); j++) {
      basinAt(FREEWAY[j][0], FREEWAY[j][1], slide, lift)
      if (j === i) ctx.moveTo(BX * k, BY * k)
      else ctx.lineTo(BX * k, BY * k)
    }
    ctx.stroke()
  }
  for (let i = 0; i < FREEWAY.length; i += 2) {
    const near = FREEWAY[i][1]
    basinAt(FREEWAY[i][0], near, slide, lift)
    if (!seen(BX, BY)) continue
    cars.dot('#F2B65A', 0.45 * nearFade(near), BX * k, (BY - 0.06 * (0.5 + near)) * k, lampR(near, k, px) * 0.8)
  }
  for (const c of FREEWAY_CARS) {
    const a = out(b, c.h)
    if (a <= 0.01) continue
    freewayAt(c.d + c.dir * c.v * t)
    const near = FN
    basinAt(FG, near, slide, lift)
    const y = BY + c.dir * 0.03 * (0.5 + near)
    if (!seen(BX, y)) continue
    cars.dot(c.dir > 0 ? TAIL : HEAD, 0.95 * a * nearFade(near) * smooth(near, 0.01, 0.06), BX * k, y * k, lampR(near, k, px) * 1.15)
  }
  // The cross streets: a line of lamps along each, and cars going each way along them.
  CROSS_NEAR.forEach((near, j) => {
    const f = nearFade(near)
    for (let g = -75 + (j % 2) * 1.1; g < 75; g += 2.2) {
      basinAt(g, near, slide, lift)
      if (!seen(BX, BY)) continue
      cars.dot('#F7C779', 0.38 * f, BX * k, (BY - 0.03 * (0.5 + near)) * k, lampR(near, k, px) * 0.75)
    }
    for (const c of CROSS_CARS[j]) {
      const a = out(b, c.h) * f
      if (a <= 0.01) continue
      const g = ((((c.g + c.dir * c.v * t) % 150) + 150) % 150) - 75
      basinAt(g, near, slide, lift)
      const y = BY + c.dir * 0.02 * (0.5 + near)
      if (!seen(BX, y)) continue
      cars.dot(c.dir > 0 ? TAIL : HEAD, 0.85 * a, BX * k, y * k, lampR(near, k, px))
    }
  })
  // The boulevards, from the street to the horizon: headlamps coming down them toward us, tail lights going away.
  BOULEVARDS.forEach((bl, i) => {
    for (const c of BLVD_CARS[i]) {
      const a0 = out(b, c.h)
      if (a0 <= 0.01) continue
      const u = (((c.u + c.dir * c.v * t) % 1) + 1) % 1
      const near = Math.pow(u, 1.25)
      const a = a0 * nearFade(near) * smooth(near, 0.02, 0.08)
      if (a <= 0.01) continue
      const dd = 0.2 + 0.6 * near
      const x = bl.xFar + (bl.xNear - bl.xFar) * near + slide(dd) + c.dir * 0.05 * (0.5 + 1.5 * near)
      const y = HORIZON + (STREET - 0.6 - HORIZON) * Math.pow(near, 1.6) + lift(dd)
      if (!seen(x, y)) continue
      cars.dot(c.dir > 0 ? HEAD : TAIL, 0.9 * a, x * k, y * k, lampR(near, k, px))
    }
  })
  cars.fill(ctx)
  // The Metro: a train across the basin now and then, a run of lit windows.
  const f = nearFade(RAIL_NEAR)
  basinAt(0, RAIL_NEAR, slide, lift)
  const ry = BY
  if (ry > fr.y0 - 1 && ry < fr.y1 + 1) {
    const scale = 0.45 + 0.55 * RAIL_NEAR
    for (const tr of TRAINS) {
      const head = tr.g + tr.v * (t - tr.at)
      if (head < -90 || head > 90) continue
      const dir = Math.sign(tr.v)
      const len = 13
      for (let w = 0; w < 40; w++) {
        const g = head - dir * w * (len / 40)
        if (Math.abs(g) > 75) continue
        basinAt(g, RAIL_NEAR, slide, lift)
        const x = BX
        if (x < fr.x0 - 0.5 || x > fr.x1 + 0.5) continue
        ctx.fillStyle = w === 0 ? rgba(HEAD, f) : w === 39 ? rgba(TAIL, f) : rgba('#FBEACB', 0.95 * f)
        ctx.fillRect(x * k - 0.6 * px, (ry - 0.05 * scale) * k, Math.max(1, 0.18 * scale * k), Math.max(1, 0.035 * k * scale))
      }
    }
  }
}

/** The planes: a line of them coming down over the basin, a landing light each and its wingtips. */
const PLANE_A: Pt = [-62, -31]
const PLANE_B: Pt = [58, -9]
const PLANE_EVERY = 10
const PLANE_RUN = 110
function planes(ctx: CanvasRenderingContext2D, k: number, t: number, end: boolean, fr: { x0: number; x1: number; y0: number; y1: number }, ox: number, oy: number, px: number): void {
  const b = busy(t, end)
  const n = Math.ceil(PLANE_RUN / PLANE_EVERY)
  for (let i = 0; i < n; i++) {
    const a = out(b, hash(i, 51) * 0.8)
    if (a <= 0.01) continue
    const u = (t + i * PLANE_EVERY) / PLANE_RUN
    const f = u - Math.floor(u)
    // Out of the dark at the top of its line and into the haze at its foot.
    const fade = a * smooth(f, 0, 0.05) * (1 - smooth(f, 0.9, 1))
    const x = PLANE_A[0] + (PLANE_B[0] - PLANE_A[0]) * f + ox
    const y = PLANE_A[1] + (PLANE_B[1] - PLANE_A[1]) * f + oy
    if (x < fr.x0 - 0.5 || x > fr.x1 + 0.5 || y < fr.y0 - 0.5 || y > fr.y1 + 0.5 || fade <= 0.01) continue
    const r = Math.max(1.2 * px, 0.05 * k) * (0.8 + 0.4 * f)
    ctx.fillStyle = rgba('#FFF4DC', 0.95 * fade)
    ctx.beginPath()
    ctx.arc(x * k, y * k, r, 0, Math.PI * 2)
    ctx.fill()
    const sp = Math.max(4 * px, 0.25 * k) * (0.8 + 0.4 * f)
    ctx.fillStyle = rgba('#E0533D', 0.8 * fade)
    ctx.fillRect(x * k - sp - px, y * k - 1.6 * px, 1.6 * px, 1.6 * px)
    ctx.fillStyle = rgba('#5BD08A', 0.8 * fade)
    ctx.fillRect(x * k + sp - px, y * k - 1.6 * px, 1.6 * px, 1.6 * px)
  }
}

/**
 * Life on the far hills: the lights of the homes on their lower slopes, thinning toward the crest, more of them lit as
 * the city fills; and the road that climbs them to the ridge, a few cars on its bends, red going up and white coming
 * down. All of it on the hills' own slow layer.
 */
const HOMES = Array.from({ length: 520 }, (_, i) => {
  const x = hash(i, 61) * 150 - 75
  const top = ridge(x, true)
  return { x, hgt: 0.25 + Math.pow(hash(i, 62), 1.8) * top * 0.72, warm: hash(i, 63) < 0.85, h: hash(i, 64) }
})
/** The road up the hill, its bends in the hills' frame (across, and height above the horizon). */
const HILL_ROAD: Pt[] = [[-4, 0.4], [7.5, 1.3], [0.5, 2.2], [9, 3.05], [3, 3.95], [10, 4.75], [6.5, 5.3]]
const HILL_ROAD_X0 = Math.min(...HILL_ROAD.map((q) => q[0]))
const HILL_ROAD_X1 = Math.max(...HILL_ROAD.map((q) => q[0]))
const HILL_ROAD_LEN = HILL_ROAD.slice(1).reduce((n, q, i) => n + Math.hypot(q[0] - HILL_ROAD[i][0], q[1] - HILL_ROAD[i][1]), 0)
function onHillRoad(d: number): Pt {
  let rest = ((d % HILL_ROAD_LEN) + HILL_ROAD_LEN) % HILL_ROAD_LEN
  for (let i = 1; i < HILL_ROAD.length; i++) {
    const a = HILL_ROAD[i - 1]
    const b = HILL_ROAD[i]
    const L = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (rest <= L) return [a[0] + ((b[0] - a[0]) * rest) / L, a[1] + ((b[1] - a[1]) * rest) / L]
    rest -= L
  }
  return HILL_ROAD[HILL_ROAD.length - 1]
}
const HILL_CARS = Array.from({ length: 7 }, (_, i) => ({ d: (i / 7) * HILL_ROAD_LEN + 2 * hash(i, 71), dir: i % 2 ? 1 : -1, v: 0.9 + 0.4 * hash(i, 72), h: hash(i, 73) }))
function hillLife(p: p5, k: number, t: number, end: boolean, fr: { x0: number; x1: number; y0: number; y1: number }, ox: number, oy: number, px: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const b = busy(t, end)
  const dots = lightBatch()
  const base = HORIZON + oy
  for (const hm of HOMES) {
    const x = hm.x + ox
    const y = base - hm.hgt
    if (x < fr.x0 - 0.5 || x > fr.x1 + 0.5 || y < fr.y0 - 0.5 || y > fr.y1 + 0.5) continue
    // A few homes are lit at any hour; more as the city fills.
    const a = out(Math.min(1, b + 0.25), hm.h)
    if (a <= 0.01) continue
    dots.dot(hm.warm ? LIGHT : LIGHT_COOL, (0.35 + 0.25 * (1 - hm.hgt / 7)) * a, x * k, y * k, Math.max(0.6, Math.min(0.03 * k, 1.2 * px)))
  }
  // The road: only its few lamps along the bends, and the cars on it.
  if (HILL_ROAD_X1 + ox > fr.x0 - 1 && HILL_ROAD_X0 + ox < fr.x1 + 1) {
    for (let d = 0.6; d < HILL_ROAD_LEN; d += 2.6) {
      const [x, h] = onHillRoad(d)
      dots.dot('#F2B65A', 0.4, (x + ox) * k, (base - h - 0.05) * k, Math.max(0.6, 0.9 * px))
    }
    for (const c of HILL_CARS) {
      const a = out(Math.min(1, b + 0.3), c.h)
      if (a <= 0.01) continue
      const [x, h] = onHillRoad(c.d + c.dir * c.v * t)
      dots.dot(c.dir > 0 ? TAIL : HEAD, 0.95 * a, (x + ox) * k, (base - h) * k, Math.max(0.8, Math.min(0.045 * k, 1.6 * px)))
    }
  }
  dots.fill(ctx)
  // The crest catches the last of the sky's light: a fine line along it.
  ctx.strokeStyle = rgba(SKY_LOW, 0.55)
  ctx.lineWidth = Math.max(0.8, 0.03 * k)
  ctx.beginPath()
  for (let x = fr.x0 - 1; x <= fr.x1 + 1; x += 0.5) {
    const y = base - ridge(x - ox, true)
    if (x === fr.x0 - 1) ctx.moveTo(x * k, y * k)
    else ctx.lineTo(x * k, y * k)
  }
  ctx.stroke()
}

export function drawPalm(ctx: CanvasRenderingContext2D, k: number, x: number, ground: number, h: number, lean: number): void {
  const topX = x + lean * h
  const topY = ground - h
  ctx.strokeStyle = PALM
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.16 * k
  ctx.beginPath()
  ctx.moveTo(x * k, ground * k)
  ctx.quadraticCurveTo((x + lean * h * 0.3) * k, (ground - h * 0.6) * k, topX * k, topY * k)
  ctx.stroke()
  // The crown: fronds that droop, each a filled curved blade.
  ctx.fillStyle = PALM
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.38
    const L = 1.5 + 0.25 * Math.cos(i * 1.7)
    const ex = topX + Math.cos(a) * L
    const ey = topY + Math.sin(a) * L * 0.55 + 0.55 * Math.abs(Math.cos(a))
    const mx = topX + Math.cos(a) * L * 0.55
    const my = topY + Math.sin(a) * L * 0.55 - 0.18
    ctx.beginPath()
    ctx.moveTo(topX * k, topY * k)
    ctx.quadraticCurveTo(mx * k, (my - 0.12) * k, ex * k, ey * k)
    ctx.quadraticCurveTo(mx * k, (my + 0.1) * k, topX * k, (topY + 0.06) * k)
    ctx.fill()
  }
}
