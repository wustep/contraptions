import { defineShow } from '../../registry'

export default defineShow({
  title: 'Epilogue',
  label: 'Opus 5.5',
  async load() { return (await import('./sebs')).performance },
})
