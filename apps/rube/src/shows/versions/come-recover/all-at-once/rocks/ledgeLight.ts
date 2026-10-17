import { mixHex } from '../../../../../parts'
import { smooth } from '../kit'
import { EYE_WHITE, ROCKS } from '../worlds'
import { BEGIN, END, MEET, RECOVER } from './ledgePath'

/**
 * The canyon's light over the leg, graded as a colorist would: one day's afternoon, passing in the silence.
 *
 * At the drop it is a high, flat, white noon: the sky pale, the sun small and high, shadows short, everything the
 * same drained sand, the two stones gone to stone in it. Through the rim's silence the sun only creeps. Once the two
 * of them touch on the bench (`MEET`) the world's colour comes back with theirs: the light warms toward a late
 * afternoon gold, the sun lower and the shadows longer, over the same stretch that their colour returns. Then, down
 * the gorge to the ring, a low dusk: the sun near the far rim, the sky warm at the horizon and dusky overhead, and
 * the canyon backlit, each slice farther off a paler silhouette in the haze, the near ledges catching the last light
 * along their tops. Every step is eased; nothing in it jumps.
 *
 * `gold` and `dusk` say how far along it is (0..1 each); the rest is what the painters read.
 */
export interface Light {
  gold: number
  dusk: number
  /** The sky, top to the horizon (the frame's middle). */
  sky: [string, string, string]
  /** The haze everything goes to with distance. */
  haze: string
  /** The sun, as a share of the frame: across (0..1 of its width) and up from the middle (of its height on 16:9). */
  sun: { u: number; v: number; r: number; disc: string; warm: string; glow: number }
  /** High cloud: its body, and its underside, lit from below as the sun goes down. */
  cloud: string
  cloudUnder: string
  /** The light along the ledges' tops. */
  ledgeTop: string
  /** How long a stone's shadow lies, in its own widths, and how far it is thrown away from the sun (cells). */
  shadow: { stretch: number; dx: number; a: number }
  /** What lit rock is graded by, and what far rock is: a slice `n` near (0 the horizon, 1 the near wall). */
  lit: (hex: string) => string
  far: (hex: string, n: number) => string
}

const GOLD = '#EDC48A'
const GOLD_SKY = '#D7DDDA'
const DUSK_TOP = '#9DA1B4'
const DUSK_MID = '#D6AE98'
const DUSK_LOW = '#EDB283'
const DUSK_SHADE = '#836C6A'
const DUSK_HAZE = '#DDB39A'
const HAZE0 = mixHex(ROCKS.far, ROCKS.sky, 0.45)

/** Noon: the look the canyon has always had, which the surf's glimpse of it (at 123 s) keeps. */
export const NOON = lightAt(BEGIN)

export function lightAt(t: number): Light {
  // Warming with the stones' own colour, from their touch to its full return; dusk over the last of the way down.
  const gold = smooth(t, MEET - 0.6, RECOVER[1])
  const dusk = smooth(t, RECOVER[1] - 1.5, END)
  // The sun creeps through the silence and sinks on the way down.
  const day = Math.max(0, Math.min(1, (t - BEGIN) / (END - BEGIN)))
  const sink = 0.18 * day + 0.82 * smooth(t, MEET - 4, END)
  const noonTop = ROCKS.sky
  const noonMid = mixHex(ROCKS.sky, HAZE0, 0.5)
  const top = mixHex(mixHex(noonTop, GOLD_SKY, gold), DUSK_TOP, dusk)
  const mid = mixHex(mixHex(noonMid, mixHex(GOLD_SKY, GOLD, 0.35), gold), DUSK_MID, dusk)
  const low = mixHex(mixHex(HAZE0, mixHex(HAZE0, GOLD, 0.45), gold), DUSK_LOW, dusk)
  const haze = mixHex(mixHex(HAZE0, mixHex(HAZE0, GOLD, 0.3), gold), DUSK_HAZE, dusk)
  const warm = mixHex(mixHex(mixHex(ROCKS.sand, '#FFFFFF', 0.55), '#F6D9A6', gold), '#F2A974', dusk)
  const disc = mixHex(mixHex('#FFFDF6', '#FFF1D4', gold), '#FBD2A2', dusk)
  const litBy = (hex: string) => mixHex(mixHex(hex, GOLD, 0.16 * gold * (1 - dusk)), DUSK_SHADE, 0.24 * dusk)
  return {
    gold,
    dusk,
    sky: [top, mid, low],
    haze,
    sun: { u: 0.74 + 0.04 * sink, v: 0.31 - 0.26 * sink, r: 0.05 * (1 + 0.25 * sink), disc, warm, glow: 0.55 + 0.1 * dusk },
    cloud: mixHex(mixHex(mixHex(ROCKS.sky, EYE_WHITE, 0.7), '#F7EBD6', gold), '#C9B7BC', dusk),
    cloudUnder: mixHex(mixHex(mixHex(ROCKS.sky, EYE_WHITE, 0.55), '#F1D3A1', gold), '#EFA982', dusk),
    ledgeTop: mixHex(mixHex(mixHex(ROCKS.sand, ROCKS.far, 0.4), '#F3D29C', gold), '#F4BE86', dusk),
    shadow: { stretch: 1 + 0.9 * sink + 0.6 * dusk, dx: -(0.05 + 0.9 * sink) * 0.13, a: 1 - 0.25 * dusk },
    lit: litBy,
    // Far rock: warmed in the gold, and at dusk gone toward a silhouette in the haze, the nearer the darker.
    far: (hex, n) => mixHex(mixHex(hex, mixHex(hex, GOLD, 0.6), 0.25 * gold * (1 - dusk)), mixHex(DUSK_HAZE, DUSK_SHADE, 0.25 + 0.65 * n), (0.25 + 0.4 * n) * dusk),
  }
}
