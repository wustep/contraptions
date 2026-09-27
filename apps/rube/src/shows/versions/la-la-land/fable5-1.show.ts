import { defineShow } from '../../registry'

export default defineShow({
  title: 'Epilogue',
  label: 'Fable 5.1',
  about: "Justin Hurwitz's Epilogue, from La La Land, as a Rube Goldberg machine: the club, the dream, and the club again.",
  still: 152.0,
  async load() { return (await import('./epilogue')).performance },
})
