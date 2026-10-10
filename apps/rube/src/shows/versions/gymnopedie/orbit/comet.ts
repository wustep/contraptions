import { PIECES, loudness, osc, wrap } from './music'
import { smooth } from './world'
import { moonAngle } from './frame'

/**
 * A comet over the third Gnossienne: once a period, rising in the east while the moon is up and crossing the sky a little
 * ahead of it, setting in the west before the piece ends. Its tail points away from the sun (under the planet, through
 * the night), so it swings as the comet goes over: a soft dust tail, curving a little, and a fainter, straighter ion
 * tail, blue. A little brighter where the music is fuller.
 */

const [, , GN3] = PIECES

/** How far ahead of the moon it goes, radians (west is negative): up already as the moon rises. */
export const COMET_LEAD = -0.8

/** How much of the comet there is at `t`: in from the third Gnossienne's start, out as it sets, before the piece ends. */
export function cometAt(t: number): number {
  const u = wrap(t)
  const a = cometAngle(t)
  return smooth(u, GN3.from + 4, GN3.from + 20) * (1 - smooth(u, GN3.last - 40, GN3.last - 15)) * (1 - smooth(Math.abs(a), 1.45, 1.75))
}

/** Its angle from overhead, as the sun's and the moon's are (east positive). */
export const cometAngle = (t: number): number => moonAngle(t) + COMET_LEAD

/** How bright it is, with the music. */
export const cometLight = (t: number): number => cometAt(t) * (0.8 + 0.25 * loudness(t))

let sprite: HTMLCanvasElement | null = null

/** The comet drawn once, its head at (HEAD, MID) and its tail along +x: 1024 × 420. */
export const HEAD = 80
export const MID = 150
export function cometSprite(): HTMLCanvasElement {
  if (sprite) return sprite
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 420
  const g = c.getContext('2d')!
  g.globalCompositeOperation = 'lighter'
  // The dust tail: soft round puffs of light along a curving spine, each wider and fainter than the last, so the tail
  // opens and fades from the head with no edge to it.
  const spine = (q: number): [number, number] => [HEAD + 880 * q, MID + 150 * q * q]
  for (let i = 0; i < 140; i++) {
    const q = (i + 0.5) / 140
    const [x, y] = spine(q)
    const r = 14 + 150 * q ** 0.9
    const a = 0.085 * (1 - q) ** 1.4 * (0.6 + 0.4 * q)
    const puff = g.createRadialGradient(x, y, 0, x, y, r)
    puff.addColorStop(0, `rgba(255, 244, 228, ${a.toFixed(4)})`)
    puff.addColorStop(0.5, `rgba(252, 240, 224, ${(a * 0.45).toFixed(4)})`)
    puff.addColorStop(1, 'rgba(250, 236, 220, 0)')
    g.fillStyle = puff
    g.fillRect(x - r, y - r, 2 * r, 2 * r)
  }
  // Faint striations along it, for its grain.
  for (let i = 0; i < 9; i++) {
    const side = (i - 4) / 4
    const grad = g.createLinearGradient(HEAD, MID, HEAD + 800, MID + 120)
    grad.addColorStop(0, 'rgba(255, 244, 228, 0.05)')
    grad.addColorStop(1, 'rgba(255, 244, 228, 0)')
    g.strokeStyle = grad
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(HEAD, MID)
    for (let j = 1; j <= 20; j++) {
      const q = j / 20
      const [x, y] = spine(q * 0.9)
      g.lineTo(x, y + side * (10 + 110 * q) * 0.7)
    }
    g.stroke()
  }
  // The ion tail: straight and narrow, blue.
  for (let i = 0; i < 12; i++) {
    const off = (i - 5.5) * 1.6
    const grad = g.createLinearGradient(HEAD, MID, HEAD + 940, MID)
    grad.addColorStop(0, 'rgba(170, 200, 255, 0.07)')
    grad.addColorStop(0.5, 'rgba(160, 196, 255, 0.035)')
    grad.addColorStop(1, 'rgba(160, 196, 255, 0)')
    g.strokeStyle = grad
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(HEAD, MID + off * 0.3)
    g.lineTo(HEAD + 940, MID - 6 + off)
    g.stroke()
  }
  // The coma round the head, and the head.
  const coma = g.createRadialGradient(HEAD, MID, 0, HEAD, MID, 66)
  coma.addColorStop(0, 'rgba(255, 252, 240, 0.95)')
  coma.addColorStop(0.1, 'rgba(250, 248, 236, 0.55)')
  coma.addColorStop(0.4, 'rgba(220, 232, 250, 0.14)')
  coma.addColorStop(1, 'rgba(220, 232, 250, 0)')
  g.fillStyle = coma
  g.fillRect(HEAD - 66, MID - 66, 132, 132)
  sprite = c
  return c
}

/** The comet's tail streamers stir a little: a slow sway of the drawn tail, radians. */
export const cometSway = (t: number): number => 0.015 * osc(t, 0.05)
