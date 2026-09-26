import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../parts'
import { frame, hash, scenery, smooth } from './kit'
import { CODA, LAST1, LAST2 } from './music'
import { SKY, STONE } from './worlds'

/**
 * The mountain seen from outside: the director's scenery, drawn first, behind everything. The paper is the rock, so
 * the mountain itself is what is not drawn; this draws the sky above its skyline, the stars, the far ridges and the
 * valley beyond, the stave church in the east valley whose bell rings the trolls out, and the dawn that comes up
 * through the coda.
 *
 * World cells (the gate part's entry is 0, 0; y down). The skyline is `skyline(x)`: the west flank the gate part's
 * path climbs, a cliff with the troll gate at its foot (x ≈ 20, the gate part's exit is inside it at 21.5, -4), the
 * slope up to the summit over the hall (x ≈ 48, y ≈ -21), and the long east flank down to the valley.
 */

/** The skyline's corners, world cells: where the mountain's surface is. Between them, a smooth line. */
export const SKYLINE: Pt[] = [
  [-90, 34], [-60, 26], [-38, 14], [-22, 6.5], [-10, 2.2], [0, 0.13], [8, -1.3], [14, -2.5], [19.8, -3.87],
  // The cliff over the gate: the gate is cut into its foot.
  [20.1, -9.5], [26, -12.5], [34, -15.5], [42, -19.5], [48, -21], [53, -20.2], [60, -16], [70, -9], [82, -1], [96, 9],
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

/** How far the dawn has come at show time `t`: 0 all night, rising through the coda, 1 once Peer is out. */
export const dawn = (t: number): number => smooth(t, CODA, LAST2 + 3)

/** The sky's colour at world height y and show time t (for a part that paints sky, e.g. through the gate). */
export function skyAt(y: number, t: number): string {
  const d = dawn(t)
  const u = Math.max(0, Math.min(1, (y + 50) / 70))
  const night = mixHex(SKY.night, SKY.dusk, u * u)
  const day = mixHex(SKY.morning, SKY.dawn, u * u)
  return mixHex(night, day, d)
}

/** The far valley's parallax: a far thing at (X, Y) is drawn at X + cx·(1 − F), Y + cy·(1 − F) for a camera at (cx, cy). */
const FAR = 0.22
/** The stave church in the east valley, on the far layer (its apparent place in the finale's framing; tune there). */
export const CHURCH: Pt = [18, -2.4]

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
    for (let x = x0; x <= x1; x += step) if (skyline(x) > top) above = true
    if (!above) return
    const d = dawn(t)
    const ctx = p.drawingContext as CanvasRenderingContext2D

    ctx.save()
    // The sky: the region above the skyline, clipped, so everything on the far layer stays behind the mountain.
    ctx.beginPath()
    ctx.moveTo(x0 * k, top * k)
    for (let x = x0; x <= x1 + step; x += step) ctx.lineTo(x * k, skyline(Math.min(x, x1)) * k)
    ctx.lineTo(x1 * k, top * k)
    ctx.closePath()
    ctx.clip()
    const bottom = Math.max(...[x0, (x0 + x1) / 2, x1].map(skyline)) + 1
    const g = ctx.createLinearGradient(0, top * k, 0, bottom * k)
    g.addColorStop(0, skyAt(top, t))
    g.addColorStop(1, skyAt(bottom, t))
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
        const a = (1 - d) * tw * (0.35 + 0.65 * hash(i, 4))
        const col = p.color(SKY.star)
        col.setAlpha(255 * a)
        p.fill(col)
        const r = (0.03 + 0.04 * hash(i, 5)) * k * (f.y1 - f.y0 > 20 ? 1.4 : 1)
        p.ellipse(sx * k, sy * k, r, r)
      }
    }

    // The far ridges: two bands of mountains beyond, darker at night, blue at dawn.
    const ox = f.cx * (1 - FAR)
    const oy = f.cy * (1 - FAR)
    for (const [band, depth, col] of [[0, 0.0, mixHex(SKY.far, SKY.morning, 0.55 * d)], [1, 1.0, mixHex(mixHex(SKY.far, STONE.deep, 0.5), '#6F86A6', 0.6 * d)]] as const) {
      p.noStroke()
      p.fill(col)
      p.beginShape()
      for (let x = x0 - 2; x <= x1 + 2; x += step * 2) {
        const X = x - ox
        const ridge = -1.2 + 1.2 * band + depth * 0 + 0.9 * Math.sin(X * 0.09 + band * 2) + 0.5 * Math.sin(X * 0.23 + 1 + band) + 0.25 * Math.sin(X * 0.61 + band * 4)
        p.vertex(x * k, (ridge + oy) * k)
      }
      p.vertex((x1 + 2) * k, bottom * k)
      p.vertex((x0 - 2) * k, bottom * k)
      p.endShape(p.CLOSE)
    }

    // The sun: at dawn, a rim over the far ridge in the east, then half a disc. Far away (never near Peer).
    if (d > 0.3) {
      const sx = 40 + ox
      const sy = -1.5 + oy - 1.2 * smooth(t, LAST1, LAST2 + 8)
      const glowR = 10
      const gg = ctx.createRadialGradient(sx * k, sy * k, 0, sx * k, sy * k, glowR * k)
      const a = 0.5 * (d - 0.3) / 0.7
      gg.addColorStop(0, `rgba(255,227,166,${a})`)
      gg.addColorStop(1, 'rgba(255,227,166,0)')
      ctx.fillStyle = gg
      ctx.fillRect((sx - glowR) * k, (sy - glowR) * k, 2 * glowR * k, 2 * glowR * k)
    }

    // The stave church in the east valley, far off: stacked roofs, and its bell in the little tower beside it,
    // which swings from the coda's first chord (the bells that send the trolls running) and rings on after.
    drawChurch(p, k, CHURCH[0] + ox, CHURCH[1] + oy, t, d)

    ctx.restore()
    // The skyline's edge: the mountain's rim catches the sky's light (a soft line, not an ink stroke).
    p.noFill()
    const rim = p.color(mixHex(STONE.mid, SKY.dawn, 0.5 * d))
    rim.setAlpha(120 + 100 * d)
    p.stroke(rim)
    p.strokeWeight(Math.max(1, 0.05 * k))
    p.beginShape()
    for (let x = x0; x <= x1 + step; x += step) p.vertex(x * k, skyline(Math.min(x, x1)) * k)
    p.endShape()
  },
})

/** The stave church, tiny and far: a dark tarred silhouette with a lit window at night, its bell beside it. */
function drawChurch(p: p5, k: number, x: number, y: number, t: number, d: number): void {
  const s = 0.55
  p.push()
  p.rectMode(p.CORNER)
  p.translate(x * k, y * k)
  p.noStroke()
  const tar = mixHex(SKY.tar, '#6A5A4A', 0.35 * d)
  p.fill(tar)
  // Three stacked roofs narrowing upward, a spire on top.
  for (let i = 0; i < 3; i++) {
    const w = (1.3 - i * 0.35) * s
    const yy = -i * 0.42 * s
    p.triangle(-w * 0.6 * k, yy * k, w * 0.6 * k, yy * k, 0, (yy - 0.36 * s) * k)
    p.rect(-w * 0.42 * k, (yy - 0.02) * k, w * 0.84 * k, 0.22 * s * k)
  }
  p.triangle(-0.1 * s * k, -1.2 * s * k, 0.1 * s * k, -1.2 * s * k, 0, -1.75 * s * k)
  p.rect(-0.62 * s * k, 0, 1.24 * s * k, 0.5 * s * k)
  // A lit window at night.
  if (d < 0.8) {
    const win = p.color('#F0A64B')
    win.setAlpha(200 * (1 - d))
    p.fill(win)
    p.rect(-0.08 * s * k, 0.12 * s * k, 0.16 * s * k, 0.2 * s * k)
  }
  // The bell tower: a little open frame to the right, the bell swinging in it.
  const bx = 1.2 * s
  p.fill(tar)
  p.rect(bx * k, -0.5 * s * k, 0.08 * s * k, 1.0 * s * k)
  p.rect((bx + 0.5 * s) * k, -0.5 * s * k, 0.08 * s * k, 1.0 * s * k)
  p.triangle((bx - 0.1 * s) * k, -0.5 * s * k, (bx + 0.68 * s) * k, -0.5 * s * k, (bx + 0.29 * s) * k, -0.85 * s * k)
  const ring = t >= CODA ? Math.min(1, (t - CODA) / 1.5) * (t > LAST2 + 6 ? Math.exp(-(t - LAST2 - 6) / 6) : 1) : 0
  const a = 0.7 * ring * Math.sin((t - CODA) * Math.PI * 1.05)
  p.push()
  p.translate((bx + 0.33 * s) * k, -0.45 * s * k)
  p.rotate(a)
  p.fill(mixHex(SKY.bell, SKY.sun, 0.3 * d))
  p.beginShape()
  p.vertex(-0.07 * s * k, 0.02 * s * k)
  p.vertex(0.07 * s * k, 0.02 * s * k)
  p.vertex(0.14 * s * k, 0.3 * s * k)
  p.vertex(-0.14 * s * k, 0.3 * s * k)
  p.endShape(p.CLOSE)
  p.pop()
  p.pop()
}
