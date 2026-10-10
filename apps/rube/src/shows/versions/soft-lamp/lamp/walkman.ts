import { mixHex } from '../../../../parts'
import { CUP, WALKMAN } from './desk'
import { MUSIC_END, rmsAt } from './music'
import { rgba } from './canvas'
import { INK, LAMP_ON, lampAt, lightAt, lit } from './world'

/**
 * The Walkman: what the headphones are plugged into, and the show's clock you can see. Through its window the cassette
 * turns, the tape going from one reel to the other over the half hour, the take-up reel fuller as the night goes; its
 * play key is down while the music plays and comes up when it stops; and its little red light flickers with how loud
 * the music is. Its cable runs from the near cup along the desk, behind everything, and up into its side.
 */

type Ctx = CanvasRenderingContext2D

/** When it plays: from the first chord to the music's end. */
const playing = (t: number): boolean => t >= LAMP_ON - 0.5 && t <= MUSIC_END
const progress = (t: number): number => Math.max(0, Math.min(1, t / MUSIC_END))

/** The cable, from the near cup's shell down to the desk, along it, and up into the Walkman's side. */
export function cable(ctx: Ctx, lw: number): void {
  const y = -0.014
  const jack = { x: WALKMAN.x1, y: -0.17 }
  ctx.beginPath()
  ctx.moveTo(CUP.x - CUP.halfW + 0.04, -0.1)
  ctx.quadraticCurveTo(CUP.x - CUP.halfW - 0.12, y, CUP.x - CUP.halfW - 0.4, y)
  // Lying along the desk, with the loose waves a cable keeps.
  const from = CUP.x - CUP.halfW - 0.4
  const to = jack.x + 0.35
  const n = 40
  for (let i = 1; i <= n; i++) {
    const x = from + ((to - from) * i) / n
    ctx.lineTo(x, y - Math.abs(Math.sin(x * 2.3)) * 0.012)
  }
  ctx.quadraticCurveTo(jack.x + 0.08, y, jack.x + 0.03, jack.y)
  ctx.strokeStyle = INK
  ctx.lineWidth = 0.032
  ctx.stroke()
  ctx.strokeStyle = '#3A3448'
  ctx.lineWidth = 0.032 - lw
  ctx.stroke()
}

export function walkman(ctx: Ctx, lw: number, t: number): void {
  const { x0, x1, h } = WALKMAN
  const w = x1 - x0
  const l = Math.min(1, lightAt(x1, -h / 2, 1) * lampAt(t) * 1.6 + 0.22)
  const shell = (c: string) => lit(mixHex(c, '#1E1A30', 0.6), c, l)
  const on = playing(t)
  // The keys along its top, the play key down while it plays.
  for (let i = 0; i < 4; i++) {
    const kx = x0 + 0.07 + i * 0.13
    const down = i === 1 && on ? 0.035 : 0
    ctx.beginPath()
    ctx.rect(kx, -h - 0.06 + down, 0.1, 0.07)
    ctx.fillStyle = shell(i === 1 ? '#E8DCC4' : '#B9AFA0')
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = lw * 0.5
    ctx.stroke()
  }
  // The body.
  const body = () => {
    const r = 0.05
    ctx.beginPath()
    ctx.moveTo(x0 + r, -h)
    ctx.lineTo(x1 - r, -h)
    ctx.quadraticCurveTo(x1, -h, x1, -h + r)
    ctx.lineTo(x1, -r * 0.4)
    ctx.quadraticCurveTo(x1, 0, x1 - r, 0)
    ctx.lineTo(x0 + r, 0)
    ctx.quadraticCurveTo(x0, 0, x0, -r * 0.4)
    ctx.lineTo(x0, -h + r)
    ctx.quadraticCurveTo(x0, -h, x0 + r, -h)
    ctx.closePath()
  }
  body()
  const g = ctx.createLinearGradient(x0, 0, x1, 0)
  g.addColorStop(0, shell('#B95F44'))
  g.addColorStop(1, shell('#D98060'))
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = lw
  ctx.stroke()
  // A band across its foot.
  ctx.fillStyle = shell('#8E4634')
  ctx.fillRect(x0 + 0.02, -0.09, w - 0.04, 0.05)
  // The window, and the cassette in it.
  const wx0 = x0 + 0.07
  const wx1 = x1 - 0.07
  const wy0 = -h + 0.08
  const wy1 = -0.14
  ctx.beginPath()
  ctx.rect(wx0, wy0, wx1 - wx0, wy1 - wy0)
  ctx.fillStyle = '#16121C'
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = lw * 0.6
  ctx.stroke()
  ctx.save()
  ctx.beginPath()
  ctx.rect(wx0, wy0, wx1 - wx0, wy1 - wy0)
  ctx.clip()
  // The cassette's label.
  ctx.fillStyle = shell('#EDE2CC')
  ctx.fillRect(wx0 + 0.02, wy0 + 0.015, wx1 - wx0 - 0.04, 0.05)
  ctx.fillStyle = shell('#E59A86')
  ctx.fillRect(wx0 + 0.02, wy0 + 0.045, wx1 - wx0 - 0.04, 0.012)
  // The reels: tape wound from the left to the right over the half hour; they turn as fast as the tape needs.
  const p = progress(t)
  const cy = (wy0 + 0.07 + wy1) / 2 + 0.01
  const tt = Math.min(t, MUSIC_END)
  // Wound by area, as tape is: from the bare hub to a full reel, its radius the root of what is on it, so the start
  // and the end are plainly a full reel and an empty one, and the half hour reads at a glance.
  const HUB = 0.026
  const FULL = 0.07
  const wound = (share: number) => Math.sqrt(HUB * HUB + (FULL * FULL - HUB * HUB) * share)
  const reels: [number, number][] = [[wx0 + 0.11, wound(1 - p)], [wx1 - 0.11, wound(p)]]
  for (const [rx, rr] of reels) {
    ctx.beginPath()
    ctx.arc(rx, cy, rr, 0, Math.PI * 2)
    ctx.fillStyle = shell('#6A3E28')
    ctx.fill()
    // The pack's edge, catching a little light.
    ctx.strokeStyle = rgba('#C98A5E', 0.35 * l)
    ctx.lineWidth = 0.006
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(rx, cy, 0.024, 0, Math.PI * 2)
    ctx.fillStyle = shell('#E8DCC4')
    ctx.fill()
    // The hub's teeth, turning.
    const a = (tt * 0.28) / rr
    ctx.strokeStyle = rgba('#2A2230', 0.9)
    ctx.lineWidth = 0.008
    for (let k = 0; k < 3; k++) {
      const ang = a + (k * Math.PI * 2) / 3
      ctx.beginPath()
      ctx.moveTo(rx + Math.cos(ang) * 0.006, cy + Math.sin(ang) * 0.006)
      ctx.lineTo(rx + Math.cos(ang) * 0.02, cy + Math.sin(ang) * 0.02)
      ctx.stroke()
    }
  }
  ctx.restore()
  // The glass's sheen.
  ctx.strokeStyle = rgba('#FFFFFF', 0.12)
  ctx.lineWidth = 0.012
  ctx.beginPath()
  ctx.moveTo(wx0 + 0.03, wy1 - 0.02)
  ctx.lineTo(wx0 + 0.12, wy0 + 0.02)
  ctx.stroke()
  // The light: on while it plays, flickering with the music's loudness.
  const lx = x1 - 0.05
  const ly = -0.065
  const v = on ? 0.45 + 0.55 * Math.min(1, rmsAt(t) * 1.6) : 0
  ctx.beginPath()
  ctx.arc(lx, ly, 0.014, 0, Math.PI * 2)
  ctx.fillStyle = mixHex('#4A1A1A', '#FF5A4A', v)
  ctx.fill()
  if (v > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const gl = ctx.createRadialGradient(lx, ly, 0, lx, ly, 0.07)
    gl.addColorStop(0, rgba('#FF5A4A', 0.5 * v))
    gl.addColorStop(1, rgba('#FF5A4A', 0))
    ctx.fillStyle = gl
    ctx.fillRect(lx - 0.08, ly - 0.08, 0.16, 0.16)
    ctx.restore()
  }
}
