import { defineShow } from '../../registry'

/** Placeholder. The music follows the machine: a struck bar wherever a piece fires. */
export default defineShow({
  title: 'Metronome',
  label: 'Free time',
  note: 'A placeholder. A note on every strike, wherever it falls: if you hear it as you see it, picture and sound are locked.',
  async load() {
    const [{ freeTake }, { wavUrl }] = await Promise.all([import('./metronome'), import('../../ticks')])
    const take = freeTake()
    return {
      show: take.show,
      duration: take.duration,
      // A second past the end, so the last note rings out under the last frame.
      soundtrack: { src: wavUrl(take.notes, take.duration + 1), credit: 'Struck bars, made in the page. No recording.' },
    }
  },
})
