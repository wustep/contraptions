import { scenery } from '../kit'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 */
export const seaFront = scenery<null>({
  name: 'sea-front',
  draw: () => {},
})
