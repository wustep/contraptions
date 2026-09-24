import { defineShow } from '../../registry'

export default defineShow({
  title: 'In the Hall of the Mountain King',
  label: 'Underhill',
  note: 'Three new worlds climb from cave echoes through the pressure works to the throne. Machine strikes follow measured notes; the whole hall accelerates with the orchestra.',
  async load() { return (await import('./underhill')).performance },
})
