import type { Pt } from '../../../../parts'
import { clamp, frame, hash, lerp, mix, poly, rect, rgba, type Brush } from './brush'
import { GARDEN, GULLY, PROFILE, ROAD, TERRACES, VALLEY, groundY } from './geo'
import { rainAt, stormAt, tones, windAt, type Palette } from './look'

/**
 * The hillside the section is cut through: the ground's mass under its profile, the dry-stone walls of the garden
 * and the terraces, the olives on them, the gully and its torrent, the spur the gate stands on, and the road going
 * down from it to the valley and its river. A second hillside stands behind, a little further off, so the slope
 * has depth in the wide shots.
 */

/**
 * The ground's mass, under the profile: the hill's dark face as it falls toward us, seen at nightfall. A lip of the
 * sky's light along every edge that faces up; on the face, faint terrace lines and the crowns of trees on them.
 */
export function drawGround(b: Brush, t: number): void {
  const c = tones(t)
  const f = frame(b)
  const x0 = f.x0 - 2
  const x1 = f.x1 + 2
  const bottom = Math.max(f.y1 + 2, 400)
  const top: Pt[] = [[x0, groundY(x0)]]
  for (const [x, y] of PROFILE) if (x > x0 && x < x1) top.push([x, y])
  top.push([x1, groundY(x1)])
  poly(b, [...top, [x1, bottom], [x0, bottom]], c.hill)
  // Deeper down the face, darker: three steps of shade under the lip.
  const g = b.g
  for (const [d, a] of [[4, 0.22], [12, 0.25], [26, 0.32], [48, 0.35]] as const) {
    g.fillStyle = rgba(c.hillDark, a)
    g.beginPath()
    g.moveTo(top[0][0], top[0][1] + d)
    for (const [x, y] of top) g.lineTo(x, y + d)
    g.lineTo(x1, bottom)
    g.lineTo(x0, bottom)
    g.fill()
  }
  // The face's terraces: level lines of wall-top near the lip, fainter the further down; and trees on them.
  if (b.k > 1.2) {
    const near = (x: number, y: number) => y - groundY(x)
    g.lineWidth = Math.max(b.px, 0.18)
    for (let y = Math.ceil(f.y0 / 7) * 7 + 3; y < f.y1 + 2; y += 7) {
      g.beginPath()
      let on = false
      let fade = 0
      for (let x = x0; x <= x1; x += 1) {
        const d = near(x, y)
        const face = d > 3.5 && d < 30 && !(x > GULLY.x0 - 1 && x < GULLY.x1 + 1) && hash(Math.floor(x / 9), Math.round(y)) > 0.25
        if (face) fade = Math.max(fade, 1 - d / 30)
        if (face && !on) {
          g.moveTo(x, y)
          on = true
        } else if (!face && on) {
          g.lineTo(x, y)
          on = false
        }
      }
      if (on) g.lineTo(x1, y)
      g.strokeStyle = rgba(mix(c.stone, c.hill, 0.55), 0.5 * fade)
      g.stroke()
    }
    g.fillStyle = rgba(mix(c.leafDark, c.hill, 0.55), 0.8)
    g.beginPath()
    for (let y = Math.ceil(f.y0 / 7) * 7 + 3; y < f.y1 + 4; y += 7) {
      for (let i = Math.floor(x0 / 8); i <= x1 / 8; i++) {
        if (hash(i, Math.round(y), 5) > 0.3) continue
        const x = i * 8 + hash(i, Math.round(y), 6) * 6
        const d = near(x, y)
        if (d < 5 || d > 24 || (x > GULLY.x0 - 2 && x < GULLY.x1 + 2)) continue
        const r = 1.3 + hash(i, Math.round(y), 7) * 1.1
        g.moveTo(x + r * 1.3, y - r * 0.5)
        g.ellipse(x, y - r * 0.5, r * 1.3, r * 0.8, 0, 0, Math.PI * 2)
      }
    }
    g.fill()
  }
  // The lip: sky on every upward edge.
  g.strokeStyle = rgba(mix(c.skyLow, c.stone, 0.5), 0.55)
  g.lineWidth = Math.max(b.px, 0.16)
  g.beginPath()
  for (let i = 1; i < top.length; i++) {
    const [ax, ay] = top[i - 1]
    const [bx, by] = top[i]
    if (Math.abs(by - ay) < (bx - ax) * 0.6) {
      g.moveTo(ax, ay + 0.08)
      g.lineTo(bx, by + 0.08)
    }
  }
  g.stroke()
}

/** The slope behind the section: the same hill a little way off, darker and bluer, with its own terraces' lines. */
export function drawBehind(b: Brush, t: number): void {
  const c = tones(t)
  const f = frame(b)
  const col = mix(c.hillDark, c.mtNear, 0.45)
  const pts: Pt[] = []
  const x0 = f.x0 - 2
  const x1 = f.x1 + 2
  const back = (x: number) => groundY(x * 1.04 - 6) - 7 - 4 * Math.sin(x * 0.031) - (x > 150 ? (x - 150) * 0.05 : 0)
  for (let x = x0; x <= x1; x += 2) pts.push([x, back(x)])
  pts.push([x1, 500], [x0, 500])
  poly(b, pts, col)
  // Its terraces: faint level lines, and a few trees standing on them.
  if (b.k < 2) return
  const g = b.g
  g.fillStyle = rgba(mix(col, c.leaf, 0.4), 0.7)
  for (let i = 0; i < 26; i++) {
    const x = 60 + i * 13 + hash(i, 4) * 6
    if (x < x0 - 6 || x > x1 + 6) continue
    const y = back(x)
    const r = 2.6 + hash(i, 5) * 1.6
    g.beginPath()
    g.ellipse(x, y - r * 0.7, r * 1.25, r * 0.85, 0, 0, Math.PI * 2)
    g.fill()
  }
}

/* ------------------------------------------------------------------ walls */

/**
 * A dry-stone wall's face, from `x0` to `x1` and `y0` (its top) to `y1`: courses of rough stones, laid with no
 * mortar, a wet sheen of the sky along the coping. Stones only when they would be seen.
 */
export function drawWall(b: Brush, c: Palette, x0: number, y0: number, x1: number, y1: number, seed: number): void {
  rect(b, x0, y0, x1, y1, c.stone)
  if (b.k > 9) {
    const g = b.g
    const h = 0.55
    let row = 0
    for (let y = y0 + 0.25; y < y1 - 0.05; y += h, row++) {
      let x = x0 + (row % 2 ? -0.3 : 0)
      let i = 0
      while (x < x1) {
        const w = 0.55 + hash(row, i, seed) * 0.8
        const sx0 = Math.max(x0, x + 0.04)
        const sx1 = Math.min(x1, x + w - 0.04)
        if (sx1 > sx0) {
          const v = hash(row, i, seed + 1)
          g.fillStyle = v < 0.33 ? c.stoneShade : v < 0.66 ? mix(c.stone, c.stoneShade, 0.45) : mix(c.stone, c.plaster, 0.2)
          g.fillRect(sx0, y + 0.04, sx1 - sx0, Math.min(h - 0.08, y1 - y - 0.06))
        }
        x += w
        i++
      }
    }
    g.fillStyle = rgba(c.stoneDeep, 0.55)
    for (let y = y0 + 0.25; y < y1; y += h) g.fillRect(x0, y, x1 - x0, 0.05)
  }
  // The coping: flat stones along the top, wet.
  rect(b, x0 - 0.15, y0 - 0.3, x1 + 0.15, y0 + 0.08, mix(c.stone, c.plaster, 0.3))
  rect(b, x0 - 0.15, y0 + 0.02, x1 + 0.15, y0 + 0.12, c.stoneShade)
}

/* ------------------------------------------------------------------ trees */

/** An olive: a short twisted trunk in two or three limbs, a broad grey-green crown in lobes, moved by the wind. */
export function drawOlive(b: Brush, t: number, x: number, y: number, size: number, seed: number): void {
  const c = tones(t)
  const sway = (windAt(t) - 0.1) * 1.4 * size * (0.6 + 0.4 * Math.sin(t * 1.3 + seed))
  const trunk = mix(c.wood, c.stoneShade, 0.35)
  const h = 4.2 * size
  const lean = (hash(seed, 1) - 0.5) * 1.2 * size
  poly(b, [[x - 0.5 * size, y], [x + 0.55 * size, y], [x + 0.32 * size + lean * 0.5, y - h * 0.5], [x + 0.18 * size + lean, y - h], [x - 0.22 * size + lean, y - h], [x - 0.35 * size + lean * 0.4, y - h * 0.5]], trunk)
  // Limbs.
  const g = b.g
  g.strokeStyle = trunk
  g.lineCap = 'round'
  g.lineWidth = 0.3 * size
  g.beginPath()
  g.moveTo(x + lean, y - h)
  g.lineTo(x + lean - 1.6 * size + sway * 0.4, y - h - 1.4 * size)
  g.moveTo(x + lean, y - h)
  g.lineTo(x + lean + 1.7 * size + sway * 0.4, y - h - 1.2 * size)
  g.stroke()
  // The crown: lobes, the underside darker.
  const cx = x + lean + sway * 0.6
  const cy = y - h - 2.3 * size
  g.fillStyle = c.leafDark
  g.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + hash(seed, i) * 0.5
    const r = (1.5 + hash(seed, i, 2) * 0.8) * size
    const lx = cx + Math.cos(a) * 2.4 * size
    const ly = cy + Math.sin(a) * 1.1 * size + 0.5 * size
    g.moveTo(lx + r * 1.2, ly)
    g.ellipse(lx, ly, r * 1.2, r * 0.8, 0, 0, Math.PI * 2)
  }
  g.fill()
  g.fillStyle = c.leaf
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + hash(seed, i, 3) * 0.6
    const r = (1.2 + hash(seed, i, 4) * 0.7) * size
    const lx = cx + Math.cos(a) * 1.9 * size + sway * 0.2
    const ly = cy + Math.sin(a) * 0.9 * size - 0.35 * size
    g.moveTo(lx + r * 1.15, ly)
    g.ellipse(lx, ly, r * 1.15, r * 0.72, 0, 0, Math.PI * 2)
  }
  g.fill()
}

/** A cypress: a tall dark flame, bending a little at its tip in the wind. */
export function drawCypress(b: Brush, t: number, x: number, y: number, h: number, seed: number): void {
  const c = tones(t)
  const sway = (windAt(t) - 0.08) * h * 0.08 * (0.7 + 0.3 * Math.sin(t * 1.1 + seed))
  const w = h * 0.13
  const pts: Pt[] = []
  const n = 10
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const bulge = Math.sin(Math.PI * Math.pow(u, 0.7)) * w * (1 - u * 0.35)
    pts.push([x + bulge + sway * u * u, y - u * h])
  }
  for (let i = n; i >= 0; i--) {
    const u = i / n
    const bulge = Math.sin(Math.PI * Math.pow(u, 0.7)) * w * (1 - u * 0.35)
    pts.push([x - bulge + sway * u * u, y - u * h])
  }
  poly(b, pts, c.cypress)
}

/* ------------------------------------------------------------------ the terraces */

/** Where the olives stand, and how big. */
export const OLIVES: readonly [number, number, number][] = [
  [88.5, 0.95, 1],
  [98.5, 0.8, 2],
  [114, 0.9, 3],
  [130.5, 0.85, 4],
]

/** The fields' soil and grass, their walls, and the olives. */
export function drawTerraces(b: Brush, t: number): void {
  const c = tones(t)
  // The lower garden's front wall (the step down to the first terrace) and each terrace's own.
  const walls: [number, number, number][] = [[GARDEN.edge, GARDEN.lower, TERRACES[0].y]]
  for (let i = 1; i < TERRACES.length; i++) walls.push([TERRACES[i].x0, TERRACES[i - 1].y, TERRACES[i].y])
  // Fields: a band of dark soil, a fringe of grass along its lip.
  for (const tr of TERRACES) {
    rect(b, tr.x0, tr.y - 0.25, tr.x1, tr.y + 0.6, c.earth)
    if (b.k > 14) grass(b, c, tr.x0 + 0.3, tr.x1 - 0.3, tr.y - 0.2, tr.x0)
  }
  for (const [x, top, foot] of walls) drawWall(b, c, x - 1.1, top, x + 0.05, foot, Math.round(x))
  for (const [x, s, seed] of OLIVES) drawOlive(b, t, x, groundY(x) - 0.1, s, seed)
}

function grass(b: Brush, c: Palette, x0: number, x1: number, y: number, seed: number): void {
  const g = b.g
  g.strokeStyle = mix(c.leafDark, c.earth, 0.3)
  g.lineWidth = Math.max(b.px, 0.05)
  g.beginPath()
  for (let x = x0; x < x1; x += 0.35) {
    const h = 0.18 + hash(Math.round(x * 10), seed) * 0.3
    const l = (hash(Math.round(x * 10), seed, 2) - 0.3) * 0.2
    g.moveTo(x, y + 0.1)
    g.lineTo(x + l, y - h)
  }
  g.stroke()
}

/* ------------------------------------------------------------------ the gully and the torrent */

/** The gully's rock: its two walls of grey limestone, broken into ledges, and the torrent in its bed. */
export function drawGully(b: Brush, t: number): void {
  const c = tones(t)
  const rock = mix(c.stone, c.ink, 0.42)
  const rockLit = mix(c.stone, c.ink, 0.25)
  // Ledges: a few flat facets on each wall, a shade lighter where they face up.
  const g = b.g
  g.fillStyle = rockLit
  for (let i = 0; i < 9; i++) {
    const side = i % 2
    const y = 30 + i * 1.9
    const x = side ? GULLY.x1 - 1 - (y - 34) * 0.32 : GULLY.x0 + 0.6 + (y - 28) * 0.36
    const w = 2 + hash(i, 9) * 2
    g.fillRect(side ? x - w : x, y, w, 0.35)
  }
  // The walls' faces, under the profile, with cracks.
  g.strokeStyle = rgba(rock, 0.9)
  g.lineWidth = Math.max(b.px, 0.08)
  g.beginPath()
  for (let i = 0; i < 12; i++) {
    const x = GULLY.x0 + 1 + hash(i, 12) * (GULLY.x1 - GULLY.x0 - 2)
    const y = groundY(x) + 0.5
    g.moveTo(x, y)
    g.lineTo(x + (hash(i, 13) - 0.5) * 1.5, y + 2 + hash(i, 14) * 3)
  }
  g.stroke()
  // The torrent: brown-grey water racing in the bed, higher and whiter as the storm grows.
  const s = clamp(stormAt(t))
  const depth = 0.8 + 2.6 * s * clamp(rainAt(t) * 1.6)
  const bed = GULLY.bed
  const x0 = GULLY.mid - 4 - depth * 0.9
  const x1 = GULLY.mid + 4 + depth * 0.9
  const water = mix(c.water, c.earth, 0.35)
  poly(b, [[x0, bed - depth], [x1, bed - depth], [GULLY.mid + 2.5, bed + 0.5], [GULLY.mid - 2.5, bed + 0.5]], water)
  // Its broken surface: short pale strokes racing down, toward the viewer, so across the frame in a blur.
  if (b.k > 4) {
    g.strokeStyle = rgba(mix(c.waterLight, c.rain, 0.5), 0.35 + 0.35 * s)
    g.lineWidth = Math.max(b.px, 0.1)
    g.beginPath()
    for (let i = 0; i < 18; i++) {
      const u = (hash(i, 21) + t * (0.35 + hash(i, 22) * 0.4)) % 1
      const x = lerp(x0 + 0.5, x1 - 0.5, hash(i, 23))
      const y = bed - depth + 0.2 + u * depth * 0.8
      g.moveTo(x - 0.5, y)
      g.lineTo(x + 0.5, y + 0.05)
    }
    g.stroke()
  }
}

/* ------------------------------------------------------------------ the road and the valley */

/** The road: a pale band up the far bank's face in hairpins, each leg with its low wall on the outside. */
export function drawRoad(b: Brush, t: number): void {
  const c = tones(t)
  const g = b.g
  const surface = mix(c.earth, c.stone, 0.4)
  // The wall under each leg, then the leg.
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.strokeStyle = mix(c.stoneShade, c.hill, 0.35)
  g.lineWidth = 0.7
  g.beginPath()
  g.moveTo(ROAD[0][0], ROAD[0][1] + 0.6)
  for (let i = 1; i < ROAD.length; i++) g.lineTo(ROAD[i][0], ROAD[i][1] + 0.6)
  g.stroke()
  g.strokeStyle = surface
  g.lineWidth = 1.0
  g.beginPath()
  g.moveTo(ROAD[0][0], ROAD[0][1])
  for (let i = 1; i < ROAD.length; i++) g.lineTo(ROAD[i][0], ROAD[i][1])
  g.stroke()
  // Puddles along it in the rain: flat lozenges of the sky.
  const wet = clamp(rainAt(t) * 2 + 0.3)
  g.fillStyle = rgba(c.skyLow, 0.3 * wet)
  for (let i = 0; i < 18; i++) {
    const j = Math.floor(hash(i, 31) * (ROAD.length - 1))
    const u = hash(i, 32)
    const [ax, ay] = ROAD[j]
    const [bx, by] = ROAD[j + 1]
    g.beginPath()
    g.ellipse(lerp(ax, bx, u), lerp(ay, by, u) - 0.1, 0.6 + hash(i, 33), 0.11, Math.atan2(by - ay, bx - ax), 0, Math.PI * 2)
    g.fill()
  }
}

/** The river at the foot of the far bank, and the old bridge over it: one round arch of stone. */
export function drawValley(b: Brush, t: number): void {
  const c = tones(t)
  const { bridge } = VALLEY
  const s = clamp(stormAt(t))
  const rise = 1.8 * s * clamp(rainAt(t) * 1.6)
  const mx = (bridge.x0 + bridge.x1) / 2
  const r = 7
  const deck = bridge.y
  const water = mix(c.water, c.earth, 0.25)
  // The river, coming down toward us under the arch and spreading on the valley floor.
  poly(b, [[mx - 5.5 - rise, deck + 5.6 - rise * 0.5], [mx + 5.5 + rise, deck + 5.6 - rise * 0.5], [mx + 9 + rise, 140], [mx - 9 - rise, 140]], water)
  const g = b.g
  g.strokeStyle = rgba(mix(c.waterLight, c.rain, 0.4), 0.4 + 0.3 * s)
  g.lineWidth = Math.max(b.px, 0.12)
  g.beginPath()
  for (let i = 0; i < 16; i++) {
    const u = (hash(i, 41) + t * (0.2 + hash(i, 42) * 0.25)) % 1
    const y = deck + 6 + u * 30
    const half = 5.5 + (y - deck - 6) * 0.12
    const x = mx + (hash(i, 43) - 0.5) * 2 * half * 0.8
    g.moveTo(x - 0.6, y)
    g.lineTo(x + 0.6, y)
  }
  g.stroke()
  // The bridge: its parapet, its deck, its arch.
  const stone = mix(c.stone, c.ink, 0.2)
  const pts: Pt[] = [[bridge.x0 - 2, deck - 0.2], [bridge.x1 + 2, deck - 0.2], [bridge.x1 + 2, deck + 6.5]]
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI
    pts.push([mx + Math.cos(a) * r, deck + 6.5 - Math.sin(a) * r * 0.75])
  }
  pts.push([bridge.x0 - 2, deck + 6.5])
  poly(b, pts, stone)
  rect(b, bridge.x0 - 2.2, deck - 1.1, bridge.x1 + 2.2, deck - 0.2, mix(stone, c.plaster, 0.15))
}
