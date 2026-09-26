import { defineShow } from '../../registry'

export default defineShow({
  title: 'Epilogue',
  label: 'Fable 5.1',
  async load() { return (await import('./epilogue')).performance },
})
