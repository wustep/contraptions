import type p5 from 'p5'
import { frame, type Ctx } from '../kit'
import {
  drawBench,
  drawBottle,
  drawCart,
  drawGlassOnPipe,
  drawLehr,
  drawMould,
  drawMouldStand,
  drawOrgan,
  drawSteam,
  drawThread,
} from './glass-machine'
import { penOf } from './glass-pen'
import { drawFurnace, drawOven, drawRoom } from './glass-shop'

/**
 * GLASS's drawing, back to front: the whitewashed room and its daylight; the two fires (the great furnace at the
 * east, the glory hole's oven at the west); the organ on its rack; the mould's stand, and its halves when they lie
 * open behind the bottle's way; the lehr; the bottle, and the mould's halves when they are shut round it; the bench,
 * the blowing cart and the glass on its pipe; the thread; the steam. `t` is show time.
 */
export function drawGlassworks(p: p5, c: Ctx, t: number): void {
  const pen = penOf(p, c)
  const v = frame(p, c.k)
  p.push()
  p.strokeJoin(p.ROUND)
  p.strokeCap(p.ROUND)
  drawRoom(pen, v)
  drawFurnace(pen, v, t)
  drawOven(pen, v, t)
  drawOrgan(pen, t)
  drawMouldStand(pen, t)
  drawMould(pen, t, false)
  drawLehr(pen, t, v)
  drawBottle(pen, t)
  drawMould(pen, t, true)
  drawBench(pen)
  drawCart(pen, t)
  drawGlassOnPipe(pen, t)
  drawThread(pen, t)
  drawSteam(pen, t)
  p.pop()
}

export function overGlassworks(_p: p5, _c: Ctx, _t: number): void {}
