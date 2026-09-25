import type p5 from 'p5'
import { clamp, easeInOutCubic, easeInQuad } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { frame, hash, scenery } from './kit'
import { DURATION, FINAL } from './music'
import { BALL, BRAND, MURPH } from './worlds'

/**
 * The end credits. The music has stopped, the lamp is lit, the camp holds at
 * dawn, and the camera goes on drawing back into the sky while the sun comes
 * up. In that sky the credits come, a card at a time. The stars nearest
 * drift together into a small bright cloud, and out of the cloud the card
 * comes into focus: a line in capitals for what they did, the names, and
 * where it is owed the fine print. When it has been read it goes out of
 * focus, and the stars drift apart again. After the last, the camp holds
 * alone at dawn to the end.
 *
 * Two halves. The words are the page's: a show's canvas sets no type, and a
 * saved frame or a recorded video has none (`shows/stage.ts`), so the player
 * sets them over the frame from `creditsAt` in its own face. The starlight
 * is the canvas's: this scenery, drawn over everything.
 */

export interface Card {
  /** Show time the stars start to gather. */
  at: number
  /** How long it stays whole once it has come up. */
  hold: number
  role?: string
  names: (string | [string, string] | [string, string, string])[]
  notes?: string[]
  title?: boolean
}

/** Stars gathering into a card, the card leaving, and how much one card's leaving overlaps the next's coming. */
const FORM = 1.4
const GO = 0.95
const OVERLAP = 0.25

/** The lamp is the last hit (FINAL); the music stops dead a few seconds after, and the porthole lights. Then the credits. */
export const CREDITS_AT = 261.4

const script: Omit<Card, 'at'>[] = [
  { hold: 2.5, role: 'Directed by', names: ['Stephen Wu'] },
  { hold: 2.6, role: 'Machines, drawings and code', names: ['Claude Opus 5.5'] },
  {
    hold: 3.7,
    role: 'With',
    names: [
      ['Joseph Cooper', 'the sand ball', BALL],
      ['Dr. Amelia Brand', 'the blue ball', BRAND],
      ['Murph', 'the slate ball, young and old', MURPH],
      ['TARS', 'four slabs of steel', 'slab:#5A5550'],
    ],
  },
  {
    hold: 3.8,
    role: 'Music',
    names: ['Hans Zimmer'],
    notes: ['“Cornfield Chase” and “No Time for Caution”', 'from Interstellar (2014)'],
  },
  { hold: 2.3, role: 'Drawn with', names: ['p5.js'] },
]

export const CARDS: Card[] = (() => {
  const out: Card[] = []
  let at = CREDITS_AT
  for (const c of script) {
    out.push({ ...c, at })
    at += FORM + c.hold + GO - OVERLAP
  }
  return out
})()

/** When the last card has gone: after it the camp holds alone at dawn, the stars back where they were, to the end. */
export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/** Where a card's top middle sits, as shares of the 16:9 frame: right of the middle (Gargantua hangs high on the left), high in the sky. */
const AT: [number, number] = [0.585, 0.105]
const TITLE_AT: [number, number] = [0.585, 0.13]

/** How far up a card is at `t` (0..1), and how far it still has to settle (hundredths of the frame). */
function lightOf(card: Card, t: number): { light: number; rise: number } {
  const since = t - card.at
  const out = card.at + FORM + card.hold
  const up = clamp((since - FORM * 0.5) / (FORM * 0.5))
  const down = clamp((t - out) / (GO * 0.55))
  return { light: easeInOutCubic(up) * (1 - down), rise: (1 - easeInOutCubic(up)) * 0.9 }
}

/** The cards up at `t`, for the page to set (`Performance.titles`). */
export function creditsAt(t: number): TitleCard[] {
  if (t < CREDITS_AT) return []
  const out: TitleCard[] = []
  CARDS.forEach((card, n) => {
    const { light, rise } = lightOf(card, t)
    if (light <= 0.001) return
    out.push({ key: `liftoff-credits-${n}`, role: card.role, names: card.names, notes: card.notes, title: card.title, light, rise, at: card.title ? TITLE_AT : AT })
  })
  return out
}

/* ------------------------------------------------------------------ the starlight (the canvas's half) */

const STAR = [244, 238, 223]
const star = (a: number): string => `rgba(${STAR[0]}, ${STAR[1]}, ${STAR[2]}, ${Math.max(0, Math.min(1, a))})`
const FAMILY = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif'
/** Stars to a card. */
const MOTES = 170

export const credits = scenery<null>({
  name: 'credits',
  draw: () => {},
  over: (p: p5, _s, c) => {
    const t = c.t
    if (t < CREDITS_AT) return
    const { k } = c
    const f = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    // In the screen's own place, as the page's words are: keep the scale, lose the world's translation.
    const m = ctx.getTransform()
    const W = (f.x1 - f.x0) * k
    const H = (f.y1 - f.y0) * k
    const left = f.x0 * k + m.e / m.a
    const top = f.y0 * k + m.f / m.d
    // The composed frame the page sets the words over: 16:9, whole, in the middle.
    const fw = Math.min(W, (H * 16) / 9)
    const fh = (fw * 9) / 16
    const fx = left + (W - fw) / 2
    const fy = top + (H - fh) / 2
    const u = fh / 100
    ctx.save()
    ctx.setTransform(m.a, m.b, m.c, m.d, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    for (let n = 0; n < CARDS.length; n++) {
      const card = CARDS[n]
      const since = t - card.at
      const out = card.at + FORM + card.hold
      if (since < 0 || t > out + GO) continue
      // Where the names will be: under the role, a cloud as wide as the widest name.
      const at = card.title ? TITLE_AT : AT
      const size = (card.title ? 7.4 : card.names.length > 1 ? 4.1 : 5.6) * u
      ctx.font = `400 ${size}px ${FAMILY}`
      const wide = Math.max(...card.names.map((nm) => (typeof nm === 'string' ? ctx.measureText(nm).width * (card.title ? 1.5 : 1) : ctx.measureText(nm[0]).width * 2.1)))
      const tall = size * 1.3 * card.names.length
      const cx = fx + at[0] * fw
      const cy = fy + at[1] * fh + (card.role ? 3.6 * u : 0) + tall / 2
      const rx = wide * 0.62 + 2 * u
      const ry = tall * 0.62 + 1.2 * u
      const { light } = lightOf(card, t)
      // A bed of light where the card comes up, brightest as it is read.
      const bed = clamp(since / FORM) * (1 - clamp((t - out) / GO))
      if (bed > 0.01) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(1, ry / rx)
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.25)
        g.addColorStop(0, `rgba(120, 128, 190, ${0.16 * bed})`)
        g.addColorStop(0.55, `rgba(90, 96, 160, ${0.08 * bed})`)
        g.addColorStop(1, 'rgba(90, 96, 160, 0)')
        ctx.fillStyle = g
        ctx.fillRect(-rx * 1.3, -rx * 1.3, rx * 2.6, rx * 2.6)
        ctx.restore()
      }
      // The stars: from the sky into the cloud, a slow swirl in it while the card is up, and back out to other places.
      const dot = Math.max(1, fh / 900)
      for (let j = 0; j < MOTES; j++) {
        const seed = n * 17
        const delay = 0.35 * hash(j, seed, 3)
        const a = easeInOutCubic(clamp((since - delay) / (FORM - 0.35)))
        const b = easeInQuad(clamp((t - out - 0.25 * hash(j, seed, 4)) / (GO - 0.25)))
        const hx = fx + fw * (0.03 + 0.94 * hash(j, seed, 1))
        const hy = fy + fh * (0.01 + 0.52 * hash(j, seed, 2))
        const ex = fx + fw * (0.03 + 0.94 * hash(j, seed, 5))
        const ey = fy + fh * (0.01 + 0.48 * hash(j, seed, 6))
        // Its place in the cloud: denser in the middle, turning slowly.
        const r = Math.sqrt(hash(j, seed, 7)) * 0.95
        const th = hash(j, seed, 8) * Math.PI * 2 + (t - card.at) * (0.05 + 0.08 * hash(j, seed, 9))
        const gx = cx + Math.cos(th) * r * rx
        const gy = cy + Math.sin(th) * r * ry
        const curl = Math.sin(Math.PI * a) * (hash(j, seed, 10) - 0.5) * 0.1 * fh
        let px = hx + (gx - hx) * a + curl
        let py = hy + (gy - hy) * a - Math.abs(curl) * 0.3
        if (b > 0) {
          px = gx + (ex - gx) * b
          py = gy + (ey - gy) * b
        }
        // Brightest as they arrive; they settle to a glimmer under the words, and go out as they leave.
        const twinkle = 0.7 + 0.3 * Math.sin(t * (2 + hash(j, seed, 11) * 3) + j)
        const glim = (0.35 + 0.65 * a) * (1 - 0.55 * light) * (1 - b) * twinkle
        if (glim < 0.02) continue
        ctx.fillStyle = star(glim)
        ctx.beginPath()
        ctx.arc(px, py, dot * (0.6 + 0.9 * hash(j, seed, 12)), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  },
})

/** For the check: the credits come after the music has stopped, and the last has gone well before the end. */
export const CREDITS_OK = CREDITS_AT >= FINAL + 4 && LAST_GONE <= DURATION - 2
