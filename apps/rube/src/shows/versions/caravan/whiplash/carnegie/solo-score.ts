import type { Pt } from '../../../../../parts'
import type { KitPiece } from '../drums'
import { CYMBALS, HUSH, KICKS, SNARES, SOLO } from '../music'

/**
 * The solo's score (270.52 → 323.27): who plays which of the recording's strokes, measured drum by drum
 * (`music.ts` `KICKS`, `SNARES`, `CYMBALS`).
 *
 * The story: he starts alone, a ball bouncing on the snare, while a drummer's frame comes down out of the flies over
 * the kit (a yoke on two lines, two long jointed arms with a stick in each grip, a steel shin onto the kick's pedal).
 * On a big stroke he leaps up into the cup at the top of the yoke, where a drummer's head would be, and the frame
 * wakes: from then on it is his body. The arms play the snare, the toms and the cymbals, the shin the kick, and he
 * rides on top, his head bouncing on the accents and leaning into the side that is playing. At the end he jumps back
 * down to the snare, the frame goes limp and flies out, and he plays the last soft strokes into the hush alone.
 *
 * Everything here is show seconds, in the kit's own frame (`drums.ts`: the ball resting on the snare is 0, 0).
 */

export type Limb = 'ball' | 'left' | 'right' | 'foot'
export type Arm = 'left' | 'right'
export interface Stroke {
  t: number
  piece: KitPiece
  limb: Limb
  /** How strong, as measured (its band's 99th percentile is 1). */
  s: number
}

/* ------------------------------------------------------------------ the story's clock */

/** The frame starts down from the flies on the solo's first stroke, and is in place, hanging limp, by here. */
export const RIG_DOWN = 272.2
/** He leaps from the snare on a big stroke, and lands in the cup as the arms play their first. */
export const LEAP = 272.515
export const SEATED = 273.09
/** The foot is down on the pedal by here (it comes down behind the snare as the frame flies in). */
export const FOOT_DOWN = 271.9
/** The last kick of the solo's first stretch: he jumps down from the cup to the snare; the frame goes limp. */
export const UNSEAT = 321.817
export const DOWN = 322.351
/** The frame flies out, gone by the hush. */
export const RIG_UP = 323.2
/** The toss: the house's right arm crashes and throws its stick up, and catches it just before the biggest hit. */
export const TOSS = 289.628
export const CATCH = 290.4
/** The biggest hit of the solo: everything at once, his head thrown back. */
export const SLAM = 290.499
/** The cymbals' climax: from the first run of crashes to the slam's answer. */
export const CLIMAX = [285.9, 291.05]
/** The kick drum's pulse: a stroke every 0.15 s, soft, with nothing else. */
export const PULSE = 316.5
/** Round the toms: the left arm takes the loud low strokes on the rack and floor toms, the right arm the snare. */
export const TOMS = [283.2, 286.0]
/** The snare and the floor tom trading (the right arm on the snare, the left on the floor tom). */
export const TRADE = [305.9, 311.6]

/* ------------------------------------------------------------------ the measured strokes */

type Band = 'kick' | 'snare' | 'cymbal'
interface Raw {
  t: number
  s: number
  band: Band
}
const A = SOLO - 0.01
const B = HUSH + 0.01
const raw: Raw[] = [
  ...KICKS.map((o) => ({ ...o, band: 'kick' as const })),
  ...SNARES.map((o) => ({ ...o, band: 'snare' as const })),
  ...CYMBALS.map((o) => ({ ...o, band: 'cymbal' as const })),
]
  .filter((o) => o.t >= A && o.t <= B)
  .sort((a, b) => a.t - b.t)

/** The measured snare stroke nearest `t` (for his own landings, which are all on the snare). */
const snareAt = (t: number): number => raw.filter((o) => o.band === 'snare').reduce((best, o) => (Math.abs(o.t - t) < Math.abs(best - t) ? o.t : best), Infinity)

/* ------------------------------------------------------------------ the ball */

/**
 * His own strokes, all on the snare: alone at the start (from the solo's first stroke to the leap), and alone at the
 * end (from the jump down to the hush). The seam strokes are the snare's too.
 */
const ALONE_START = [...[270.524, 270.814, 271.395, 271.685, 271.964, 272.237].map(snareAt), LEAP]
const ALONE_END = [DOWN, ...[322.473, 322.734, 322.99].map(snareAt), HUSH]
export const BALL: readonly { t: number; piece: KitPiece; s: number }[] = [...ALONE_START, ...ALONE_END].map((t) => ({ t, piece: 'snare' as const, s: 1 }))

/* ------------------------------------------------------------------ the accents (his head) */

/** The strokes merged across bands when they fall together (within 40 ms): what a listener hears as one hit. */
interface Hit {
  t: number
  S: number
  K: number
  C: number
}
const hits: Hit[] = []
for (const o of raw) {
  if (o.s < 0.35) continue
  const last = hits[hits.length - 1]
  const h = last && o.t - last.t < 0.04 ? last : null
  const into = h ?? { t: o.t, S: 0, K: 0, C: 0 }
  const key = o.band === 'kick' ? 'K' : o.band === 'snare' ? 'S' : 'C'
  into[key] = Math.max(into[key], o.s)
  if (!h) hits.push(into)
}
const loudness = (h: Hit): number => Math.max(h.S, h.C * 0.9, h.K * 0.8)

/**
 * The accents his head bounces on while he rides the frame: the loudest hits, a quarter second apart at least, each
 * with how hard (0..1).
 */
export const ACCENTS: readonly { t: number; a: number }[] = (() => {
  const pool = hits.filter((h) => h.t > SEATED + 0.05 && h.t < UNSEAT - 0.05)
  const order = [...pool].sort((a, b) => loudness(b) - loudness(a))
  const pick: Hit[] = []
  for (const h of order) {
    if (loudness(h) < 0.95) break
    if (pick.every((p) => Math.abs(p.t - h.t) >= 0.24)) pick.push(h)
  }
  // Through the kick drum's pulse (316.5 on) his head keeps its time, small, every other kick.
  const pulse = hits.filter((h) => h.t > PULSE - 0.05 && h.t < UNSEAT - 0.05 && h.K >= 0.5)
  for (let i = 0; i < pulse.length; i++) if (i % 2 === 0 && pick.every((p) => Math.abs(p.t - pulse[i].t) >= 0.2)) pick.push({ ...pulse[i], K: 0.9 })
  return pick.sort((a, b) => a.t - b.t).map((h) => ({ t: h.t, a: Math.min(1, (loudness(h) - 0.6) / 1.9) }))
})()

/* ------------------------------------------------------------------ the arms and the foot */

/** Where each arm's stick strikes each piece it plays: the grip (where the arm holds it) and the stick's angle there. */
export interface Grip {
  grip: Pt
  ang: number
}
/** The stick: this long, held this far from its butt. */
export const STICK = 1.3
export const HOLD = 0.27
const reach = STICK - HOLD
/** A grip from where the tip lands and the stick's angle (0 points right; the house's view, y down). */
const from = (tip: Pt, ang: number): Grip => ({ grip: [tip[0] - Math.cos(ang) * reach, tip[1] - Math.sin(ang) * reach], ang })

/**
 * The house's left arm is the drummer's right hand: the snare's left side, the rack tom, the floor tom, the ride.
 * The house's right arm is his left hand: the snare's right side, the hi-hat, the crash (reached up and over).
 */
export const TARGETS: Record<Arm, Partial<Record<KitPiece, Grip>>> = {
  left: {
    snare: from([-0.21, 0.09], 1.28),
    rack: from([-0.95, -0.7], 0.72),
    floor: from([-2.45, 0.29], Math.PI - 1.0),
    ride: from([-2.5, -1.39], Math.PI - 0.38),
  },
  right: {
    snare: from([0.25, 0.09], Math.PI - 1.18),
    hat: from([1.2, -0.76], Math.PI - 1.1),
    crash: from([1.0, -2.28], Math.PI - 0.72),
  },
}

/** Seconds an arm needs between two strokes: a wrist's rebound, plus the time to carry the stick across. */
function needs(a: Grip | undefined, b: Grip): number {
  if (!a) return 0
  const d = Math.hypot(a.grip[0] - b.grip[0], a.grip[1] - b.grip[1])
  return d < 0.01 ? 0.062 : 0.11 + 0.1 * d
}

function assign(): Stroke[] {
  const out: Stroke[] = BALL.map((b) => ({ t: b.t, piece: b.piece, limb: 'ball' as const, s: b.s }))
  const last: Record<Arm, { t: number; g?: Grip; piece?: KitPiece }> = { left: { t: -Infinity }, right: { t: -Infinity } }
  let lastFoot = -Infinity
  let tom: KitPiece = 'floor'
  const inside = (t: number, w: readonly number[]) => t > w[0] && t < w[1]
  const tossing = (t: number) => t > TOSS + 0.01 && t < SLAM - 0.01
  // Where the left arm is round the toms, and the right has the snare.
  const toms = (t: number) => inside(t, TOMS) || inside(t, TRADE)
  const can = (arm: Arm, piece: KitPiece, t: number): boolean => {
    if (arm === 'right' && tossing(t)) return false
    const l = last[arm]
    return t - l.t >= needs(l.g, TARGETS[arm][piece]!)
  }
  const play = (arm: Arm, piece: KitPiece, o: Raw): void => {
    out.push({ t: o.t, piece, limb: arm, s: o.s })
    last[arm] = { t: o.t, g: TARGETS[arm][piece], piece }
  }
  /** One stroke, to whichever arm can take it best: the one rested longer on the snare, an arm that stays put. */
  const single = (o: Raw, options: { arm: Arm; piece: KitPiece }[]): void => {
    let best: { arm: Arm; piece: KitPiece; cost: number } | null = null
    options.forEach((opt, i) => {
      if (!can(opt.arm, opt.piece, o.t)) return
      const l = last[opt.arm]
      const cost = (l.piece === opt.piece ? 0 : 0.12) - Math.min(0.6, o.t - l.t) + i * 0.03
      if (!best || cost < best.cost) best = { ...opt, cost }
    })
    if (best) play((best as { arm: Arm }).arm, (best as { piece: KitPiece }).piece, o)
  }
  // The cymbals are the house's right arm's: the crash when loud, the hi-hat otherwise; the ride is the left's, in
  // the cymbals' climax.
  const cymbalOptions = (o: Raw): { arm: Arm; piece: KitPiece }[] => {
    // In the climax the right arm stays up at the crash, and the left takes the ride when the crash is too soon.
    if (inside(o.t, CLIMAX)) return o.s >= 0.8 ? [{ arm: 'right', piece: 'crash' }, { arm: 'left', piece: 'ride' }] : [{ arm: 'left', piece: 'ride' }]
    return o.s >= 1.15 ? [{ arm: 'right', piece: 'crash' }, { arm: 'right', piece: 'hat' }] : [{ arm: 'right', piece: 'hat' }]
  }

  // The strokes that fall together (within 30 ms) are one hit, and the hands share it out.
  const queue = raw.filter((o) => o.s >= 0.5)
  for (let i = 0; i < queue.length; ) {
    let j = i
    while (j < queue.length && queue[j].t - queue[i].t < 0.03) j++
    const group = queue.slice(i, j)
    i = j
    const pick = (band: Band) => group.filter((o) => o.band === band).sort((a, b) => b.s - a.s)[0]
    const K = pick('kick')
    const S = pick('snare')
    const C = pick('cymbal')
    if (K && K.t >= FOOT_DOWN && K.t <= UNSEAT + 0.01) {
      // Round the toms, the loud low strokes are the left arm's (unless the hands are busy); otherwise the foot's.
      const next: KitPiece = inside(K.t, TRADE) ? 'floor' : tom === 'rack' ? 'floor' : 'rack'
      if (toms(K.t) && K.s >= 0.95 && can('left', next, K.t)) {
        tom = next
        play('left', next, K)
      } else if (K.t - lastFoot >= 0.085) {
        out.push({ t: K.t, piece: 'kick', limb: 'foot', s: K.s })
        lastFoot = K.t
      }
    }
    const hands = (o: Raw | undefined) => o && o.t >= SEATED - 0.01 && o.t <= UNSEAT + 0.01
    const both = hands(S) && hands(C) && !toms(S!.t)
    // Both hands at once: the snare's left, the cymbal's right; forced so on the toss and the slam.
    if (both) {
      const forced = Math.abs(S!.t - TOSS) < 0.03 || Math.abs(S!.t - SLAM) < 0.03
      const climax = inside(S!.t, CLIMAX)
      const cym: KitPiece = forced || ((climax || C!.s >= 1.15) && can('right', 'crash', C!.t)) ? 'crash' : 'hat'
      if (climax && cym === 'hat' && !forced) {
        single(S!, [{ arm: 'left', piece: 'snare' }])
        single(C!, cymbalOptions(C!))
        continue
      }
      if (forced || (can('left', 'snare', S!.t) && can('right', cym, C!.t))) {
        play('left', 'snare', S!)
        play('right', cym, C!)
        continue
      }
    }
    if (hands(S)) single(S!, inside(S!.t, CLIMAX) ? [{ arm: 'left', piece: 'snare' }] : toms(S!.t) ? [{ arm: 'right', piece: 'snare' }] : [{ arm: 'left', piece: 'snare' }, { arm: 'right', piece: 'snare' }])
    if (hands(C)) single(C!, cymbalOptions(C!))
  }
  return out.sort((a, b) => a.t - b.t)
}

/** Every stroke of the solo, in order, with who plays it. */
export const STROKES: readonly Stroke[] = assign()

/** One player's strokes, in order. */
export const strokesOf = (limb: Limb): Stroke[] => STROKES.filter((s) => s.limb === limb)
