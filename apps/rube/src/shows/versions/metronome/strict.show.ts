import { defineShow } from '../../registry'

/** Placeholder. The machine follows the music: the same machine, retimed so its strikes land on a steady beat. */
export default defineShow({
  title: 'Metronome',
  label: 'Strict time',
  note: 'A placeholder. The same machine under a time map: a steady 120 to the minute, and each strike hurried or held onto the half-beat.',
  async load() {
    const [{ strictTake }, { wavUrl }] = await Promise.all([import('./metronome'), import('../../ticks')])
    const take = strictTake()
    return {
      show: take.show,
      duration: take.duration,
      soundtrack: { src: wavUrl(take.notes, take.duration + 1), credit: 'Struck bars on a beat, made in the page. No recording.' },
    }
  },
})
