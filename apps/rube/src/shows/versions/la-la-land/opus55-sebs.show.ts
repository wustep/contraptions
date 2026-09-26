import { defineShow } from '../../registry'

export default defineShow({
  title: 'Epilogue',
  label: 'Opus 5.5',
  about: "Justin Hurwitz's Epilogue and The End, from La La Land, as a Rube Goldberg machine that starts and ends in Seb's.",
  still: 272.0,
  async load() { return (await import('./sebs')).performance },
})
