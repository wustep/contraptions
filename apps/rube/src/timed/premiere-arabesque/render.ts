import type p5 from 'p5'
import { drawWorld } from '../../engine'
import { at, cameraAt, clampTime, show } from './show'

/** Original Machine drawing, stock palettes, water, plants, trails, and foregrounds. */
export function renderFrame(p: p5, seconds: number) {
  const time = clampTime(seconds), here = at(time), cam = cameraAt(time)
  const W = p.width, H = p.height
  const k = Math.min(H / cam.visible, W / (cam.visible * 16 / 9))
  drawWorld(p, show, time, here, cam, k, { x: 0, y: 0, w: W, h: H }, false)

  // Three world changes, hidden inside a closed iris. Its color is shared on
  // either side of the cut, so neither the camera nor the palette can flash.
  if (here.placed.piece.name === 'portal') {
    const seg = here.placed.lane.segs[here.seg]
    if (seg.portal) {
      const out = seg.portal === 'out', f = out ? here.raw : 1 - here.raw
      const shut = Math.max(0, Math.min(1, out ? (f - .15) / .85 : (f - .15) / .7))
      const eased = shut * shut * (3 - 2 * shut), diameter = Math.hypot(W, H)
      const shade = !out && here.universe.index ? show.universe(here.universe.index - 1).theme.ink : here.universe.theme.ink
      p.push()
      p.noFill(); p.stroke(shade); p.strokeWeight(diameter)
      p.circle(W / 2 + (here.x - cam.x) * k, H / 2 + (here.y - cam.y) * k, diameter * (1 - eased) * 1.5 + diameter)
      p.pop()
    }
  }
}
