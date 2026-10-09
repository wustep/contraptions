import { rgba } from './canvas'
import { GLASS } from './desk'
import { REACHES, handAt, mugAt } from './hands'
import { lensIn } from './lens'
import { beatOf, drumsAt, smooth, trackAt } from './music'
import { flashAt, shootAt } from './sky'
import { lampAt, lampColor, skyAt } from './world'

/**
 * Whoever sits at the desk, seen at last, the only way they could be: in the window. Once it is dark outside, the
 * glass is a mirror, and the lamp lights them in it, faint, behind the rain: hair up, the sage sweater the hand's sleeve
 * is, head bowed over their work, nodding a little with the drums. Their reflection does what the hand does: lifts the
 * mug to their face for a sip, looks up from the work at the finger drawing on the glass, and up when the lightning
 * goes or a star falls. They come with the lamp and go with it.
 *
 * A reflection is light on the glass, never dark: it only adds. It sits in front of the camera, as anyone's own
 * reflection does, so it is in the pane only when the camera faces the window, and gone at the edge of the glass.
 */

type Ctx = CanvasRenderingContext2D

/** Where the reflection sits when the camera looks at the window over the desk (`lens.ts`'s home): head, and size. */
const AT = { x: -0.62, y: -2.5 }
const HOME_X = 0.21
/** How much it moves with the camera: nearly all the way, as one's own reflection does. */
const FOLLOW = 0.85

const KNIT = '#8FA592'
const SKIN = '#F2B98E'
const HAIR = '#5A3A30'

/** A small canvas the reflection is drawn into, laid over the glass soft: made once. */
let pad: HTMLCanvasElement | null = null
const RES = 96
const BOX = { x0: -1.25, y0: -0.75, x1: 1.25, y1: 1.15 }

/** How strongly the window shows them: the lamp on them, and the dark outside (the dusk outshines a reflection). */
export const reflectionSeen = (t: number): number => lampAt(t) * (1 - skyAt(t).dusk) ** 2 * smooth(t, 30, 90)

/** How the person in the window is, at `t`: how strongly seen, where the head is turned, the mug, the reach. */
function poseAt(t: number) {
  const seen = reflectionSeen(t)
  // Head bowed over the work; up to look out at a flash or a falling star; nodding a little with the drums.
  const up = Math.max(flashAt(t).look, shootAt(t - 0.4).a)
  const tr = trackAt(t)
  const b = beatOf(tr, t)
  const f = b - Math.floor(b)
  const nod = drumsAt(t) * Math.exp(-((f - 0.15) ** 2) / 0.02) * (1 - up)
  const bow = 0.55 * (1 - up) + 0.04 * nod
  const m = mugAt(t)
  // Reaching up to draw on the glass, they look up from the work at what the finger does.
  const draw = REACHES.find((r) => r.kind === 'draw' && t > r.at && t < r.at + r.dur)
  const looking = draw ? handAt(t).a : 0
  return { seen, bow: bow * (1 - looking), sip: m.e * (1 - m.gone) }
}

/** The reflection, on the glass, after the night and before the window's frame. */
export function reflection(ctx: Ctx, t: number): void {
  const p = poseAt(t)
  if (p.seen < 0.02) return
  const lens = lensIn(ctx)
  const cx = AT.x + FOLLOW * (lens.x - HOME_X)
  const cy = AT.y
  // Mostly inside the glass, or not at all: no figure lurking at its edge.
  const inside = smooth(Math.min(cx - 0.45 - GLASS.x0, GLASS.x1 - (cx + 0.45)), -0.6, 0.1)
  const a = p.seen * inside
  if (a < 0.02) return
  pad ??= Object.assign(document.createElement('canvas'), { width: Math.ceil((BOX.x1 - BOX.x0) * RES), height: Math.ceil((BOX.y1 - BOX.y0) * RES) })
  const g = pad.getContext('2d') as Ctx
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, pad.width, pad.height)
  g.setTransform(RES, 0, 0, RES, -BOX.x0 * RES, -BOX.y0 * RES)
  const warm = lampColor(t)
  // Bowed over the work, the face goes down and forward and more of the top of the head shows.
  const hy = 0.07 * p.bow
  const lean = 0.05 * p.bow
  const hair = rgba(HAIR, 0.95)
  // The hair behind: falling to the shoulders either side of the face.
  g.fillStyle = hair
  g.beginPath()
  g.moveTo(-0.24, 0.3)
  g.bezierCurveTo(-0.3, 0.05, -0.27, -0.24 + hy, 0, -0.26 + hy)
  g.bezierCurveTo(0.27, -0.24 + hy, 0.31, 0.05, 0.25, 0.3)
  g.quadraticCurveTo(0, 0.36, -0.24, 0.3)
  g.fill()
  // Shoulders, sloping from the neck, in the sweater, lit on the lamp's side; a ribbed collar round the neck.
  // (Fading down into the dark: the desk and the room below take no light to throw back.)
  const sw = g.createLinearGradient(0, 0.28, 0, 0.95)
  sw.addColorStop(0, rgba(KNIT, 0.8))
  sw.addColorStop(1, rgba(KNIT, 0))
  g.fillStyle = sw
  g.beginPath()
  g.moveTo(-0.1, 0.27)
  g.bezierCurveTo(-0.35, 0.3, -0.7, 0.36, -0.82, 0.62)
  g.lineTo(-0.9, 1.2)
  g.lineTo(0.9, 1.2)
  g.lineTo(0.82, 0.62)
  g.bezierCurveTo(0.7, 0.36, 0.35, 0.3, 0.1, 0.27)
  g.closePath()
  g.fill()
  g.fillStyle = rgba(KNIT, 0.95)
  g.beginPath()
  g.ellipse(0, 0.3, 0.15, 0.06, 0, 0, Math.PI * 2)
  g.fill()
  // The face, bowed, the lamp's light on the cheek nearer it.
  const face = g.createLinearGradient(-0.16, 0, 0.16, 0)
  face.addColorStop(0, rgba(SKIN, 0.35))
  face.addColorStop(1, rgba(SKIN, 0.95))
  g.fillStyle = face
  g.beginPath()
  g.ellipse(lean, 0.03 + hy, 0.15, 0.19 - 0.03 * p.bow, 0, 0, Math.PI * 2)
  g.fill()
  // Eyes: lowered lids over the work, open when they look up.
  g.strokeStyle = rgba(HAIR, 0.9)
  g.lineWidth = 0.018
  g.lineCap = 'round'
  for (const ex of [-0.06, 0.07]) {
    const x = ex + lean
    const y = 0.04 + hy
    g.beginPath()
    if (p.bow > 0.3) {
      g.moveTo(x - 0.03, y)
      g.quadraticCurveTo(x, y + 0.02, x + 0.03, y)
    } else {
      g.arc(x, y, 0.014, 0, Math.PI * 2)
    }
    g.stroke()
  }
  // The fringe over the brow, the crown, and the bun; the lamp along the bun's edge.
  g.fillStyle = hair
  g.beginPath()
  g.ellipse(lean * 0.6, -0.1 + hy, 0.18, 0.12 + 0.04 * p.bow, 0, Math.PI, Math.PI * 2)
  g.quadraticCurveTo(0.04 + lean, -0.02 + hy + 0.04 * p.bow, -0.18 + lean * 0.6, -0.1 + hy)
  g.fill()
  g.beginPath()
  g.arc(-0.05, -0.3 + hy * 0.5, 0.09, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = rgba(warm, 0.85)
  g.lineWidth = 0.022
  g.beginPath()
  g.arc(-0.05, -0.3 + hy * 0.5, 0.09, -1.3, 0.5)
  g.stroke()
  g.beginPath()
  g.ellipse(0, -0.02 + hy, 0.24, 0.25, 0, -1.1, 0.2)
  g.stroke()
  // A sip: the mug up to their mouth.
  if (p.sip > 0.02) {
    g.globalAlpha = p.sip
    const my = 0.1 + hy + (1 - p.sip) * 0.5
    g.fillStyle = rgba('#EBB0AA', 1)
    g.fillRect(0.02, my, 0.2, 0.24)
    g.strokeStyle = rgba('#EBB0AA', 1)
    g.lineWidth = 0.035
    g.beginPath()
    g.arc(0.24, my + 0.11, 0.06, -1.3, 1.3)
    g.stroke()
    g.fillStyle = rgba(SKIN, 0.8)
    g.beginPath()
    g.ellipse(0.2, 0.3 + hy + (1 - p.sip) * 0.5, 0.07, 0.09, 0, 0, Math.PI * 2)
    g.fill()
    g.globalAlpha = 1
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(GLASS.x0, GLASS.y0, GLASS.x1 - GLASS.x0, GLASS.y1 - GLASS.y0)
  ctx.clip()
  // Light on the glass: it only adds.
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = 0.36 * a
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(pad, cx + BOX.x0, cy + BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0)
  ctx.restore()
}
