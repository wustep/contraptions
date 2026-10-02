import { defineShow } from '../../registry'

/** Direction 02. A separate, redesign-only copy of opus55's complete scored journey. */
export default defineShow({
  title: 'Voyage',
  label: 'An Atlas of Absence',
  note: 'Astra · Direction 02 · an animated print about the distance between things.',
  about: 'Voyage after Interstellar, carved in ink and copper on warm paper. A journey measured by absence.',
  still: 115.5,
  async load() { return (await import('./astra-atlas')).performance },
})
