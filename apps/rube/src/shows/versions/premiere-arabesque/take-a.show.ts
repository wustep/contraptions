import { defineShow } from '../../registry'

/** Première Arabesque to Patrizia Prati's recording. The choreography lives in the timed take. */
export default defineShow({
  title: 'Première Arabesque',
  label: 'Take A',
  note: "Patrizia Prati's recording, from the first audible note. Regular, Forest, Aqua, Arcade.",
  async load() {
    const { loadPrati } = await import('./prati')
    return loadPrati()
  },
})
