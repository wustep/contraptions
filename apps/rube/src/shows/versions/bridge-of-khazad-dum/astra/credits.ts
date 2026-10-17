import type { TitleCard } from '../../../registry'
import { smooth } from './math'
import { CAST, MUSIC_END } from './motion'

const cards: Omit<TitleCard, 'key' | 'light' | 'at'>[] = [
  { title: true, names: ['Burden'], notes: ['after The Fellowship of the Ring'] },
  { role: 'Directed by', names: ['GPT-6 Astra'] },
  { role: 'The fellowship', names: [['Frodo', 'the moss ball', CAST.frodo.color], ['Sam', 'the clay ball', CAST.sam.color], ['Gandalf', 'the chalk ball', CAST.gandalf.color]] },
  { role: 'Music by Howard Shore', names: ['The Bridge of Khazad Dum'], notes: ['The Lord of the Rings: The Fellowship of the Ring (2001)', 'Demo · soundtrack played by YouTube'] },
]

/** Live DOM, and the existing words.ts painter for Save video. Never drawn by a piece. */
export function creditsAt(t: number): TitleCard[] {
  if (t < MUSIC_END) return []
  return cards.flatMap((card, i) => {
    const at = MUSIC_END + i * 6.2
    const light = smooth(t, at, at + 1.1) * (1 - smooth(t, at + 5, at + 6.2))
    return light > 0 ? [{ ...card, key: `burden-${i}`, light, rise: 0, at: [0.74, 0.16] as [number, number], scale: i === 3 ? 0.62 : 0.85, plain: true, matte: true }] : []
  })
}
