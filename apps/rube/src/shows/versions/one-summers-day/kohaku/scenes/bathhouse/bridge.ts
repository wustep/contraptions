import type { Light } from '../../light'
import { box, fill, ink, lit, mix, poly, rgba, vgrad, type Paint } from '../../paint'
import { BRIDGE, RAIL_Y, SEA_Y, STREET } from '../../geo'

/**
 * The bridge to the bathhouse, and the gorge under it where the railway runs: a long red-railed timber bridge on two
 * piers, the town's stone bank on its west, the bathhouse's footings on its east, the rails in the gorge's floor going
 * east out from under the bathhouse onto the sea.
 */

const RED = '#B4432F'
const TIMBER = '#4A3428'
const LINE = '#2A1712'

/** The gorge: its west wall under the town's end, its floor with the rails, the water lying in it. */
export function drawGorge(g: Paint, L: Light): void {
  const { ctx } = g
  const x0 = STREET.x1 - 1.5
  const x1 = BRIDGE.x1 + 0.3
  // The far wall of the gorge: dark earth going down into shade.
  ctx.fillStyle = vgrad(ctx, BRIDGE.y, SEA_Y + 1, [
    [0, lit('#5E5240', L.ambient)],
    [1, lit('#2C2620', L.ambient)],
  ])
  ctx.fillRect(x0, BRIDGE.y + 0.3, x1 - x0, SEA_Y + 1 - BRIDGE.y)
  // The rails on its floor (sleepers, two rails seen as one line), and the water lying shallow over them.
  box(ctx, x0, RAIL_Y, x1 - x0, 0.05, lit('#4A4038', L.ambient))
  for (let x = x0 + 0.2; x < x1; x += 0.45) box(ctx, x, RAIL_Y + 0.03, 0.22, 0.05, lit('#3A2E26', L.ambient))
  ctx.fillStyle = rgba(mix(L.seaNear, L.seaLit, 0.3), 0.55)
  ctx.fillRect(x0, SEA_Y - 0.01, x1 - x0, 1.2)
  // The town's bank, its stone face going down into the gorge.
  ctx.fillStyle = vgrad(ctx, STREET.y, SEA_Y + 1, [
    [0, lit('#7D776C', L.ambient)],
    [1, lit('#3A362F', L.ambient)],
  ])
  poly(ctx, [[STREET.x1 - 1.6, STREET.y + 0.1], [BRIDGE.x0 + 0.2, STREET.y + 0.1], [BRIDGE.x0 - 0.3, SEA_Y + 1], [STREET.x1 - 1.6, SEA_Y + 1]])
  ctx.fill()
}

/** The bridge: its deck, the arch of its beams under it, two piers, and the red railing along its near side. */
export function drawBridge(g: Paint, L: Light): void {
  const { ctx } = g
  const { x0, x1, y } = BRIDGE
  const timber = lit(TIMBER, L.ambient)
  const red = lit(RED, L.ambient, 0.1)
  const line = mix(LINE, L.top, 0.2)
  // The piers, down into the gorge.
  for (const px of [x0 + (x1 - x0) * 0.33, x0 + (x1 - x0) * 0.68]) {
    poly(ctx, [[px - 0.3, y + 0.3], [px + 0.3, y + 0.3], [px + 0.45, SEA_Y + 0.6], [px - 0.45, SEA_Y + 0.6]])
    ctx.fillStyle = vgrad(ctx, y, SEA_Y, [
      [0, lit('#7A6E60', L.ambient)],
      [1, lit('#3E362E', L.ambient)],
    ])
    ctx.fill()
  }
  // The deck's beam, a shallow arch under it.
  ctx.beginPath()
  ctx.moveTo(x0, y)
  ctx.lineTo(x1, y)
  ctx.lineTo(x1, y + 0.3)
  ctx.quadraticCurveTo((x0 + x1) / 2, y + 0.1, x0, y + 0.3)
  ctx.closePath()
  fill(ctx, timber)
  ink(g, line, 1.4)
  box(ctx, x0, y, x1 - x0, 0.08, lit('#8A7058', L.ambient))
  // The railing: a top rail and posts, red, with a gold cap on every post.
  box(ctx, x0, y - 0.42, x1 - x0, 0.07, red)
  box(ctx, x0, y - 0.2, x1 - x0, 0.04, red)
  for (let x = x0 + 0.05; x <= x1; x += 0.95) {
    box(ctx, x - 0.04, y - 0.46, 0.08, 0.46, red)
    box(ctx, x - 0.055, y - 0.5, 0.11, 0.05, lit('#C4943A', L.ambient, 0.2))
  }
}
