import type { YouTubeCue } from '../../../registry'

/**
 * The recording: Víkingur Ólafsson's Goldberg Variations (Deutsche Grammophon, 2023), from the album's own uploads on
 * YouTube, one video to a track, thirty-two of them. Nothing of it is shipped: the show lays the tracks end to end on
 * its timeline (`CUES`), each coming in where the one before it ends, and goes round again from the Aria.
 *
 * The lengths are the uploads' own, to the millisecond, so the cues sit end to end and a track's start is the end of
 * the one before it.
 */

export const ALBUM = 'https://www.youtube.com/playlist?list=OLAK5uy_mOEy0EiYFYA0c4_9nxobe-c5EGO7F50oo'

/** Where a variation is in the score, and what it is: what the picture makes of it. */
export type Kind = 'aria' | 'free' | 'hands' | 'canon' | 'overture' | 'pearl' | 'quodlibet' | 'capo'

export interface Variation {
  /** 0 the Aria, 1 to 30 the variations, 31 the Aria da capo. */
  n: number
  /** The video. */
  id: string
  /** Its length, milliseconds. */
  ms: number
  kind: Kind
  /** What Bach's print heads it with, where that is a name and not just a number. */
  name?: string
  /** A canon's interval, 1 (the unison) to 9. */
  interval?: number
  /** A canon in contrary motion: the second voice is the first turned upside down. */
  inverse?: boolean
  /** In the minor: the light goes cool. */
  minor?: boolean
  /** No bass under it. */
  bassless?: boolean
}

const v = (n: number, id: string, ms: number, kind: Kind, more: Partial<Variation> = {}): Variation => ({ n, id, ms, kind, ...more })

export const VARIATIONS: Variation[] = [
  v(0, 'hMGIncslU6g', 245360, 'aria', { name: 'Aria' }),
  v(1, 'Eb_iPtjn9bo', 90080, 'free'),
  v(2, '95K_ANac-uA', 85720, 'free'),
  v(3, 'YOjVr5LqaGo', 110800, 'canon', { name: 'Canone all’Unisono', interval: 1 }),
  v(4, 'rf2npzmSWGM', 56040, 'free'),
  v(5, '5DuprBnTGGc', 71720, 'hands'),
  v(6, 'gpe5CHCxcP8', 68920, 'canon', { name: 'Canone alla Seconda', interval: 2 }),
  v(7, 'LxyMkERXTyM', 132120, 'free', { name: 'al tempo di Giga' }),
  v(8, 'XZ5_ItNgNSM', 97240, 'hands'),
  v(9, 'm_GTBYJ9jAo', 96320, 'canon', { name: 'Canone alla Terza', interval: 3 }),
  v(10, 'U94hKuy4Eag', 92640, 'free', { name: 'Fughetta' }),
  v(11, 'o5hecPvd6pg', 100000, 'hands'),
  v(12, 'Z_o8mMAyEys', 112920, 'canon', { name: 'Canone alla Quarta', interval: 4, inverse: true }),
  v(13, 'F3kK8w3kEQU', 246120, 'hands'),
  v(14, '1bSQB0k__K8', 122360, 'hands'),
  v(15, 'ehD9MA7-TcY', 337360, 'canon', { name: 'Canone alla Quinta', interval: 5, inverse: true, minor: true }),
  v(16, 'g_10y72173I', 160760, 'overture', { name: 'Ouverture' }),
  v(17, 'GRefng3n2jU', 115560, 'hands'),
  v(18, 'DLjbQyPgkGU', 87840, 'canon', { name: 'Canone alla Sesta', interval: 6 }),
  v(19, '-0aJgyUe8d4', 67120, 'free'),
  v(20, 'yAOrL_rKv0I', 109000, 'hands'),
  v(21, 'fJR-G700WH8', 195240, 'canon', { name: 'Canone alla Settima', interval: 7, minor: true }),
  v(22, '6br6ScteLOY', 76080, 'free', { name: 'alla breve' }),
  v(23, 'C25C-Z_ocxw', 114360, 'hands'),
  v(24, 'UzJFFev7Xbk', 168040, 'canon', { name: 'Canone all’Ottava', interval: 8 }),
  v(25, 'LFsGcBeWAzM', 588000, 'pearl', { name: 'Adagio', minor: true }),
  v(26, 'Xq742QgK0s0', 103720, 'hands'),
  v(27, '2CfPuGV3aPU', 91800, 'canon', { name: 'Canone alla Nona', interval: 9, bassless: true }),
  v(28, 'RMjKv55O2j0', 124080, 'hands'),
  v(29, 'Rml-zLW4vLU', 107120, 'free'),
  v(30, 'uekqDiCScT0', 116120, 'quodlibet', { name: 'Quodlibet' }),
  v(31, 'TDKcWVFzIpU', 155960, 'capo', { name: 'Aria da Capo' }),
]

/** Show time each track starts at, seconds; and one more, the end of the last, which is the period. */
export const STARTS: number[] = (() => {
  const out = [0]
  let ms = 0
  for (const t of VARIATIONS) {
    ms += t.ms
    out.push(ms / 1000)
  }
  return out
})()

/** One time through, seconds: the whole album, and the show's period. */
export const PERIOD = STARTS[VARIATIONS.length]

/** The soundtrack's cues, end to end. */
export const CUES: YouTubeCue[] = VARIATIONS.map((t, i) => ({ id: t.id, at: Math.round(STARTS[i] * 100) / 100, from: 0 }))

/** Round the circle: a moment a period on is the same moment. */
export function wrap(t: number): number {
  const u = t % PERIOD
  return u < 0 ? u + PERIOD : u
}

/** Which track holds show time `t` (already wrapped), and how far through it, 0 to 1. */
export function trackAt(t: number): { i: number; f: number } {
  let lo = 0
  let hi = VARIATIONS.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (STARTS[mid] <= t) lo = mid
    else hi = mid - 1
  }
  return { i: lo, f: Math.min(1, (t - STARTS[lo]) / (STARTS[lo + 1] - STARTS[lo])) }
}

/** A sine that comes round a whole number of times a period, so it is the same at the end as at the start. */
export const osc = (t: number, cycles: number, phase = 0): number => Math.sin((2 * Math.PI * cycles * t) / PERIOD + phase)
