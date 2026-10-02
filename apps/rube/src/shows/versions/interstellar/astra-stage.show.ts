import { defineShow } from '../../registry'

export default defineShow({
  title: 'Voyage',
  label: 'The Infinite Stage',
  note: 'A world visibly built to move becomes a home. Redesign only.',
  about: 'Voyage after Interstellar, staged in cut paper, painted plywood and visible machinery.',
  still: 135.5,
  async load() { return (await import('./astra-stage')).performance },
})
