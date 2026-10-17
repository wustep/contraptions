import type { Pt } from '../../../../../parts'
import { sway } from '../depth'
import { hash } from '../kit'
import { clamp01, ctxOf, ease, mix, rgba, type Pen } from '../pen'
import { HATS, NET_HIT, RAISE, STRIKE, WAY } from './geo'
import { CAP } from './life'

/**
 * The money game draws a crowd. Two regulars come over from the main floor and lean on the ledge of the opening behind
 * the table, where their beers are, to watch: the first as Marty bounces in, the second on the raise. Leaning on their
 * forearms, their heads go after the ball; they grin at the given point, straighten for the winner, and the one with
 * the hat has it off and waving for the strike while the other slaps the ledge. They stand just past the wall, in the
 * room's own light, so they are drawn here, between the main floor and the wainscot that hides them from the waist down.
 */

interface Watcher {
  /** Where he leans on the ledge, and where he comes from along the main floor. */
  x: number
  from: number
  /** When he sets off, and when he is leaning. */
  go: number
  lean: number
  coat: string
  skin: string
  hat: boolean
  seed: number
}

const WATCHERS: Watcher[] = [
  { x: 11.3, from: 15.5, go: 122.2, lean: 124.4, coat: '#3E4A3C', skin: '#C9946E', hat: true, seed: 1 },
  { x: 12.55, from: 16.6, go: RAISE - 1.6, lean: RAISE + 0.4, coat: '#4A3B33', skin: '#B87E5A', hat: false, seed: 2 },
]

/** Standing tall behind the ledge, his head this far over it; leaning on his forearms, this far. */
const TALL = 1.55
const LOW = 0.9

/** Where each is, how far over he leans, and which way he looks (the ball, once he is watching). */
function poseOf(w: Watcher, t: number): { x: number; bend: number; look: number; walk: number; up: number; slap: number; grin: number } | null {
  if (t < w.go) return null
  const walkU = clamp01((t - w.go) / (w.lean - 0.45 - w.go))
  const x = w.from + (w.x - w.from) * ease(walkU)
  const bend = ease(clamp01((t - (w.lean - 0.45)) / 0.45))
  const ball = WAY.at(t - 0.12)
  const watching = clamp01((t - w.lean) / 0.4)
  const look = watching * Math.max(-1, Math.min(1, (ball[0] - x) / 3.5)) + (1 - watching) * -1
  // The winner and the strike: up off the ledge, arms going up; then a long grin.
  const up = t > STRIKE - 0.05 ? clamp01((t - STRIKE + 0.05) / 0.2) * (1 - clamp01((t - HATS - 1.2) / 0.5)) : 0
  const slap = w.seed === 2 && t > STRIKE ? Math.abs(Math.sin((t - STRIKE) * Math.PI * 3.7)) * (1 - clamp01((t - STRIKE - 1.4) / 0.3)) : 0
  const grin = Math.max(t > NET_HIT && t < NET_HIT + 2.2 ? 1 : 0, up)
  return { x, bend, look, walk: walkU < 1 ? (x / 0.3) * Math.PI : NaN, up, slap, grin }
}

/** The two of them, drawn behind the wainscot: head, shoulders, the near arm, the hat. */
export function watchers(pen: Pen, t: number, f: { x0: number; x1: number; y0: number }): void {
  if (f.y0 > CAP || f.x1 < 10.6 || f.x0 > 17.2) return
  const ctx = ctxOf(pen.p)
  const k = pen.k
  for (const w of WATCHERS) {
    const p = poseOf(w, t)
    if (!p || p.x < f.x0 - 1 || p.x > f.x1 + 1) continue
    const breathe = 0.012 * Math.sin(t * 1.6 + w.seed)
    const bob = Number.isFinite(p.walk) ? 0.03 * Math.abs(Math.sin(p.walk)) : 0
    // Standing to leaning: the head comes down and forward over the ledge.
    const rise = TALL - (TALL - LOW) * p.bend * (1 - 0.6 * p.up) + breathe - bob
    const head: Pt = [p.x - 0.12 * p.bend + 0.02 * sway(t, w.seed, 4), CAP - rise]
    const sh: Pt = [p.x + 0.08 * p.bend, head[1] + 0.34]
    const coat = mix(w.coat, '#1A1418', 0.25)
    // The coat: shoulders down past the ledge (the wainscot covers the rest).
    ctx.fillStyle = rgba(pen, coat, 1)
    ctx.beginPath()
    ctx.moveTo((sh[0] - 0.34) * k, (CAP + 0.3) * k)
    ctx.lineTo((sh[0] - 0.3) * k, (sh[1] + 0.08) * k)
    ctx.quadraticCurveTo(sh[0] * k, (sh[1] - 0.08) * k, (sh[0] + 0.3) * k, (sh[1] + 0.08) * k)
    ctx.lineTo((sh[0] + 0.34) * k, (CAP + 0.3) * k)
    ctx.closePath()
    ctx.fill()
    // The near arm: on the ledge, forearm along it; or up, waving his hat, or slapping down on the ledge.
    const hand: Pt = p.up > 0.05
      ? [sh[0] - 0.42, sh[1] - 0.5 * p.up + 0.1 * Math.sin(t * 9 + w.seed)]
      : [sh[0] - 0.36 + 0.06 * p.bend, CAP - 0.04 - 0.12 * (1 - p.bend) + 0.25 * p.slap]
    const elbow: Pt = p.up > 0.05 ? [sh[0] - 0.36, sh[1] + 0.08] : [sh[0] - 0.1, CAP - 0.04 + 0.1 * (1 - p.bend)]
    ctx.strokeStyle = rgba(pen, mix(coat, '#000000', 0.15), 1)
    ctx.lineWidth = 0.14 * k
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo((sh[0] - 0.22) * k, (sh[1] + 0.1) * k)
    ctx.lineTo(elbow[0] * k, elbow[1] * k)
    ctx.lineTo(hand[0] * k, hand[1] * k)
    ctx.stroke()
    ctx.fillStyle = rgba(pen, w.skin, 1)
    ctx.beginPath()
    ctx.arc(hand[0] * k, hand[1] * k, 0.055 * k, 0, Math.PI * 2)
    ctx.fill()
    // The head, turned to the ball; a nose for which way; the grin.
    ctx.beginPath()
    ctx.ellipse(head[0] * k, head[1] * k, 0.17 * k, 0.2 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgba(pen, mix(w.skin, '#000000', 0.12), 1)
    ctx.beginPath()
    ctx.ellipse((head[0] + 0.13 * p.look) * k, (head[1] + 0.03) * k, 0.045 * k, 0.05 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    if (p.grin > 0.05) {
      ctx.fillStyle = rgba(pen, '#F2E8D8', 0.9 * p.grin)
      ctx.fillRect((head[0] + 0.05 * p.look - 0.06) * k, (head[1] + 0.09) * k, 0.12 * k, 0.03 * k)
    }
    // The hat: on his head, or in his waving hand for the strike.
    if (w.hat) {
      const onHead = p.up < 0.3
      const c: Pt = onHead ? [head[0] - 0.02 * p.look, head[1] - 0.15] : [hand[0], hand[1] - 0.1]
      const tilt = onHead ? 0 : 0.4 * Math.sin(t * 9 + w.seed)
      ctx.save()
      ctx.translate(c[0] * k, c[1] * k)
      ctx.rotate(tilt)
      // A fedora: the brim, and the crown narrowing to its pinched top.
      ctx.fillStyle = rgba(pen, '#22201C', 1)
      ctx.beginPath()
      ctx.ellipse(0, 0.02 * k, 0.26 * k, 0.045 * k, 0, 0, Math.PI * 2)
      ctx.moveTo(-0.15 * k, 0.02 * k)
      ctx.lineTo(-0.12 * k, -0.11 * k)
      ctx.quadraticCurveTo(0, -0.08 * k, 0.12 * k, -0.11 * k)
      ctx.lineTo(0.15 * k, 0.02 * k)
      ctx.fill()
      ctx.restore()
    } else {
      ctx.fillStyle = rgba(pen, hash(w.seed, 3) < 0.5 ? '#2A221B' : '#5A5048', 1)
      ctx.beginPath()
      ctx.ellipse((head[0] - 0.04 * p.look) * k, (head[1] - 0.1) * k, 0.17 * k, 0.11 * k, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
