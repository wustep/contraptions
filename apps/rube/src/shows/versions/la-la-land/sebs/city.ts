import { frame, glow, hash, knock, rgba, scenery, smooth } from './kit'
import { AT, END_AT, level } from './music'
import { SEBS_MAT } from './worlds'

/**
 * The city of stars round Seb's: what the camera comes in from at the start
 * and draws back into at the end. It is drawn in the piano's frame (the
 * club's room stands on the same origin and draws the building and the
 * street in front of it); everything here is beyond the club and further
 * off the higher it stands: the night sky, the stars, the searchlights, the
 * hills with the observatory on the ridge, the basin full of lights, the
 * towers downtown, and the palms and lamps of the street either side of the
 * building. Far things slide against the camera, so a push-in feels deep.
 *
 * At the end (`end`) the searchlights come up with the band (478.05) and
 * cross on The End's last chord.
 */
export interface CityState {
  end: boolean
}

/**
 * Where the street is in front of the club, and the horizon beyond. The basin between them is the city seen from a
 * little above, receding: its lights are dense and small at the horizon and fewer and larger toward the street.
 */
const STREET = 3.1
const HORIZON = -6

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

/** The stars: positions in a tile of sky a hundred cells wide, sizes and twinkle phases. Fixed, so nothing shimmers by chance. */
const STARS = Array.from({ length: 420 }, (_, i) => ({
  x: hash(i, 1, 7) * 140 - 70,
  y: -44 + hash(i, 2, 7) * 42,
  r: 0.02 + Math.pow(hash(i, 3, 7), 6) * 0.07,
  ph: hash(i, 4, 7) * Math.PI * 2,
  sp: 0.4 + hash(i, 5, 7) * 1.1,
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

/** Palms along the street either side of the club: x and height. */
const PALMS = [
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
const OBSERVATORY = -38

/**
 * The End's orchestra arriving (its one clear onset), and the swell it climbs to. On the arrival two more searchlights
 * swing up from behind the hills and every beam flares; through the swell the city's lights and the beams grow with
 * the music, and the observatory on its ridge, where the planetarium is, lights up.
 */
export const SWELL = END_AT + 32.268
export const CITY_HITS = [SWELL]

export const city = scenery<CityState>({
  name: 'city',
  draw(p, s, c) {
    const k = c.k
    const t = c.t
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
    for (const st of STARS) {
      const x = st.x + sx
      const y = st.y + sy
      if (x < fr.x0 - 1 || x > fr.x1 + 1 || y < fr.y0 - 1 || y > fr.y1 + 1 || y > HORIZON - 3) continue
      const tw = 0.55 + 0.45 * Math.sin(t * st.sp + st.ph)
      ctx.fillStyle = rgba(LIGHT_COOL, 0.35 + 0.55 * tw)
      ctx.beginPath()
      ctx.arc(x * k, y * k, Math.max(0.6, st.r * k), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // Searchlights: two beams from behind the hills, leaning and slowly sweeping; at the end they come up with the
    // band and cross on The End's last chord.
    const band = s.end ? smooth(t, AT.band - 0.2, AT.band + 2.5) : 0.55
    const last = END_AT + 39.4
    const arrive = s.end ? smooth(t, SWELL - 0.05, SWELL + 1.4) : 0
    const flare = s.end ? knock(t - SWELL, 0.5) : 0
    const beams: [number, number][] = [[0, 30], [1, -12], [2, 58], [3, -44]]
    for (const [i, base] of beams) {
      // The two that come with the orchestra rise from lying along the hills to their place.
      const late = i >= 2
      if (late && arrive <= 0.001) continue
      const side = i % 2 === 0 ? -1 : 1
      const sweep = s.end
        ? 0.32 * Math.sin((t - AT.band) * 0.23 + i * 2.2) * (1 - smooth(t, last - 5, last)) + side * 0.16 * smooth(t, last - 5, last)
        : 0.3 * Math.sin(t * 0.21 + i * 2.2)
      const lean = side * (late ? 0.34 + 1.1 * (1 - arrive) : 0.22) + sweep
      const bx = base + slide(0.3)
      const by = HORIZON + 1 + lift(0.3)
      const len = 60
      const tipX = bx + Math.sin(lean) * len
      const tipY = by - Math.cos(lean) * len
      const a = 0.09 * band * (0.7 + 0.3 * level(t)) * (late ? arrive : 1) * (1 + 1.2 * flare)
      const grad = ctx.createLinearGradient(bx * k, by * k, tipX * k, tipY * k)
      grad.addColorStop(0, rgba('#F4EAD0', a * 1.6))
      grad.addColorStop(1, rgba('#F4EAD0', 0))
      ctx.fillStyle = grad
      const nx = Math.cos(lean)
      const ny = Math.sin(lean)
      ctx.beginPath()
      ctx.moveTo((bx - nx * 0.25) * k, (by - ny * 0.25) * k)
      ctx.lineTo((tipX - nx * 3.2) * k, (tipY - ny * 3.2) * k)
      ctx.lineTo((tipX + nx * 3.2) * k, (tipY + ny * 3.2) * k)
      ctx.lineTo((bx + nx * 0.25) * k, (by + ny * 0.25) * k)
      ctx.closePath()
      ctx.fill()
    }

    // The far hills, then the towers downtown, then the near hills with the observatory on the ridge.
    const hills = (far: boolean, color: string, d: number) => {
      const ox = slide(d)
      const oy = lift(d)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo((fr.x0 - 1) * k, (HORIZON + 2 + oy) * k)
      for (let x = fr.x0 - 1; x <= fr.x1 + 1; x += 0.5) ctx.lineTo(x * k, (HORIZON + oy - ridge(x - ox, far)) * k)
      ctx.lineTo((fr.x1 + 1) * k, (HORIZON + 2 + oy) * k)
      ctx.closePath()
      ctx.fill()
    }
    hills(true, HILL_FAR, 0.2)

    const tx = slide(0.35)
    const ty = lift(0.35)
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
          ctx.fillStyle = rgba(LIGHT, 0.35 + 0.4 * (lit - 0.8) * 5)
          ctx.fillRect((x + 0.12 + q * 0.3) * k, (y0 + 0.3 + r * 0.45) * k, 0.1 * k, 0.16 * k)
        }
      }
      // A red lamp on the tallest.
      if (tw.h > 12) glow(p, k, x + tw.w / 2, y0 - 0.15, 0.35, '#E0533D', 0.5 + 0.5 * Math.sin(t * 2.4))
    }

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
      ctx.fillRect((ox - 1.6) * k, (oy - 0.45) * k, 3.2 * k, 0.5 * k)
      ctx.beginPath()
      ctx.arc(ox * k, (oy - 0.45) * k, 0.62 * k, Math.PI, 0)
      ctx.arc((ox - 1.45) * k, (oy - 0.45) * k, 0.32 * k, Math.PI, 0)
      ctx.arc((ox + 1.45) * k, (oy - 0.45) * k, 0.32 * k, Math.PI, 0)
      ctx.fill()
      const lit = s.end ? smooth(t, SWELL, SWELL + 3) : 0
      glow(p, k, ox, oy - 0.3, 1.6, LIGHT, 0.12 + 0.3 * lit)
      if (lit > 0.01) {
        // Its windows, and the big dome catching the light.
        ctx.fillStyle = rgba(LIGHT, 0.8 * lit)
        for (let w = -3; w <= 3; w++) ctx.fillRect((ox + w * 0.4 - 0.06) * k, (oy - 0.35) * k, 0.12 * k, 0.16 * k)
        glow(p, k, ox, oy - 0.8, 0.8, LIGHT_COOL, 0.35 * lit * (0.8 + 0.2 * level(t)))
      }
    }

    // The basin: dark ground from the hills' foot to the street, and on it the lights of the city.
    const basin = ctx.createLinearGradient(0, (HORIZON + lift(0.3)) * k, 0, STREET * k)
    basin.addColorStop(0, '#1A1433')
    basin.addColorStop(1, SEBS_MAT.deep)
    ctx.fillStyle = basin
    ctx.fillRect((fr.x0 - 1) * k, (HORIZON + lift(0.45) + 0.4) * k, (fr.x1 - fr.x0 + 2) * k, (STREET - HORIZON + 2) * k)
    // Through The End's swell the whole city brightens with the music.
    const swellLight = s.end ? 1 + 0.45 * smooth(t, SWELL - 2, SWELL + 3) * level(t) : 1
    // The city's own glow on the air over it.
    glow(p, k, VANISH + slide(0.25), HORIZON + 0.8 + lift(0.25), 26, '#C9795E', 0.16, 1.6, 0.28)
    for (const b of BOULEVARDS) {
      for (let j = 1; j <= b.n; j++) {
        // Lamps evenly spaced along the ground, so closer together on the screen the further off they are.
        const near = Math.pow(j / b.n, 1.25)
        const dd = 0.2 + 0.6 * near
        const x = b.xFar + (b.xNear - b.xFar) * near + slide(dd)
        const y = HORIZON + (STREET - 0.6 - HORIZON) * Math.pow(near, 1.6) + lift(dd)
        if (x < fr.x0 - 1 || x > fr.x1 + 1 || y < fr.y0 - 1 || y > fr.y1 + 1) continue
        const tw = 0.8 + 0.2 * Math.sin(t * 0.6 + j * 0.7 + b.ph)
        ctx.fillStyle = rgba('#F7C779', (0.45 + 0.4 * near) * tw)
        ctx.beginPath()
        ctx.arc(x * k, y * k, Math.max(0.6, 0.045 * (0.5 + 1.5 * near) * k), 0, Math.PI * 2)
        ctx.fill()
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
      const r = (l.big ? 0.06 : 0.032) * (0.55 + 1.4 * near)
      ctx.fillStyle = rgba(l.warm ? LIGHT : LIGHT_COOL, (0.3 + 0.5 * tw) * (0.75 + 0.25 * near) * swellLight)
      ctx.beginPath()
      ctx.arc(x * k, y * k, Math.max(0.5, r * k), 0, Math.PI * 2)
      ctx.fill()
    }

    // The near ground, from the street to the front of the frame.
    ctx.fillStyle = SEBS_MAT.deep
    ctx.fillRect((fr.x0 - 1) * k, (STREET - 0.2) * k, (fr.x1 - fr.x0 + 2) * k, (Math.max(fr.y1, STREET + 6) - STREET + 1) * k)

    // Palms along the street, in silhouette against the lit sky.
    for (const pm of PALMS) {
      if (pm.x < fr.x0 - 4 || pm.x > fr.x1 + 4) continue
      drawPalm(ctx, k, pm.x, STREET, pm.h, pm.lean + 0.012 * Math.sin(t * 0.5 + pm.x))
    }
  },
})

function drawPalm(ctx: CanvasRenderingContext2D, k: number, x: number, ground: number, h: number, lean: number): void {
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
