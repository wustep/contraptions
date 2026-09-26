import { defineShow } from '../../registry'

export default defineShow({
  title: 'Cornfield Chase',
  label: 'Opus 5.5',
  about: "Hans Zimmer's Cornfield Chase, from Interstellar, with a Rube Goldberg machine striking on every note.",
  still: 76.2,
  note: 'Pure tech demo — one-shot Opus 5.5 eval-benchmark take; generated stock only, every strike on a measured onset (96 bpm comb).',
  async load() { return (await import('./opus55-music-sync')).performance },
})
