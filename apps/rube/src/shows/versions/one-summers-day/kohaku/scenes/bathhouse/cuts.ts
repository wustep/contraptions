import { M } from '../../music'

/**
 * Where the bathhouse's front is taken away, and when, for the scenes that go inside it: her room on the third storey
 * from the dawn to the train (it opens and closes under the dissolves at each end). The building reads these through
 * its piece in `bathhouse.ts`.
 */
export const roomCut = (t: number): number => (t >= M.breath && t < M.high ? 1 : 0)
