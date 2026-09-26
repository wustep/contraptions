import { defineShow } from '../../registry'

export default defineShow({
  title: 'Married Life',
  label: 'Opus 5.5',
  about: "Michael Giacchino's Married Life, from Up, as a Rube Goldberg machine: a whole life in the house they fix up, live in, patch and leave.",
  still: 150.0,
  async load() { return (await import('./life')).performance },
})
