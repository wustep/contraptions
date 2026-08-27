import type { Composition, Options } from '../../core/composition'
import { makeRng } from '../../core/rng'
import { themeByName } from '../../core/themes'
import { alarm } from './alarm'
import { cascade } from './cascade'
import { mill } from './mill'
import { createWorld, PIECE_LOOP, type PieceDef } from './world'

export type { PieceDef }
export { PIECE_LOOP }

export const PIECES: PieceDef[] = [alarm, mill, cascade]

export const pieceByName = (name: string): PieceDef | undefined => PIECES.find((p) => p.name === name)

export function buildPiece(options: Options, canvas: number): Composition | null {
  const def = pieceByName(options.piece ?? '')
  if (!def) return null
  const theme = themeByName(options.theme)
  const rng = makeRng(`${options.seed}::piece:${def.name}`)
  const world = createWorld(theme, rng, canvas, def.res, PIECE_LOOP)
  def.place(world)
  return {
    options: { ...options, res: def.res, layout: 'grid' },
    theme,
    cells: world.cells,
    instances: world.instances,
    loop: PIECE_LOOP,
    used: [...new Set(world.instances.map((i) => i.contraption.name))].sort(),
    captions: [],
    header: null,
    wires: world.wires,
    overlays: world.overlays,
  }
}