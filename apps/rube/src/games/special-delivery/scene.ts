import p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { drawWorld, setupCanvas } from '../../engine'
import { laneAt, type PieceCtx, type Pt } from '../../parts'
import { worldCells, type Placed } from '../../plan'
import { Show, type ShowPoint } from '../../show'
import type { Universe } from '../../universe'
import { Depot } from './game'
import { COLORS, INK, LETTERS, MACHINES, PAPER, PARK, THEME, mailboxAt, readyAt, worldLane, type Station } from './machines'

/** The existing renderer consumes a finite depot scene through its normal Show/Placed/rider interfaces. */
class DepotShow extends Show {
  readonly depotUniverse: Universe
  constructor(readonly depot: () => Depot) {
    super('special-delivery')
    const pieces: Placed[] = (Object.keys(MACHINES) as Station[]).map((station) => {
      const m = MACHINES[station]
      const context = (c: PieceCtx): PieceCtx => ({ ...c, t: c.t * m.rate, since: c.since * m.rate })
      return {
        piece: { ...m.piece, draw: (p, s, c) => m.piece.draw(p, s, context(c)),
          over: m.piece.over ? (p, s, c) => m.piece.over!(p, s, context(c)) : undefined },
        state: m.placement.state, col: m.at[0], row: m.at[1], mirror: 1,
        cells: worldCells(m.placement.cells, ...m.at, 1),
        lane: { ...worldLane(station), fire: m.placement.lane.fire / m.rate },
        start: 10000, span: m.duration, ballIn: { color: PAPER, ghost: false, id: 0 }, changes: [], points: 0,
      }
    })
    const bounds = { x0: 0, x1: 13, y0: -0.5, y1: 5 }
    this.depotUniverse = {
      seed: 'delivery', index: 0, theme: THEME, ballColor: PAPER, taste: 'postal', backdrop: 'plain',
      pieces, bounds, box: bounds, journey: 1000,
      world: { name: 'delivery', label: 'Special Delivery', note: 'The little post office', themes: [THEME],
        pieces: pieces.map((p) => p.piece), backdrops: ['plain'], tastes: { postal: {} } },
    }
  }
  override trailOff(): boolean { return true }
  override at(t: number): ShowPoint {
    const game = this.depot()
    const balls = game.parcels.flatMap((parcel) => {
      const point = game.position(parcel, t)
      return point && !point.hidden ? [{ id: parcel.id, x: point.x, y: point.y, color: point.color, scale: 1.08, spin: null }] : []
    })
    return { ...laneAt(this.depotUniverse.pieces[0].lane, 0), placed: this.depotUniverse.pieces[0],
      ball: { color: PAPER, ghost: false, id: 0 }, universe: this.depotUniverse, local: t, begin: 0, balls }
  }
  pose(t: number): void {
    const game = this.depot()
    ;(Object.keys(MACHINES) as Station[]).forEach((station, i) => {
      const activation = game.activations.slice().reverse().find((a) => a.station === station && a.start <= t)
      const placed = this.depotUniverse.pieces[i]
      placed.start = activation?.start ?? 10000
      placed.ballIn.color = activation?.color ?? PAPER
      placed.state = { ...MACHINES[station].placement.state, ...(station === 'painter' ? { paint: activation?.paint ?? COLORS[0] } : {}) }
    })
  }
}

export function createDepotScene(host: HTMLElement, game: () => Depot, time: () => number): () => void {
  const show = new DepotShow(game)
  let release = () => {}
  const instance = new p5((p) => {
    p.setup = () => {
      const setup = setupCanvas(p, host); release = setup.release
      p.describe('A parcel depot: paint booth, uphill conveyor, three dispatch slots, a cannon, three mailboxes, and a frog returning mistakes.')
      p.frameRate(60)
    }
    p.draw = () => {
      const t = time()
      const g = game()
      const k = Math.min(p.width / 13.3, p.height / 5.5)
      const cam = { x: 6.5, y: 2.1 }
      show.pose(t)
      drawWorld(p, show, t, show.at(t), cam, k, { x: 0, y: 0, w: p.width, h: p.height }, false)
      const sx = (x: number) => p.width / 2 + (x - cam.x) * k
      const sy = (y: number) => p.height / 2 + (y - cam.y) * k
      p.push()
      p.translate(sx(0), sy(0))
      const line = (a: Pt, b: Pt, color = INK, weight = 0.025) => {
        outline(p, color, k * weight); p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
      }
      const label = (text: string, x: number, y: number, size = 0.13, color = INK) => {
        p.noStroke(); p.fill(color); p.textFont('monospace'); p.textSize(k * size); p.textAlign(p.CENTER, p.CENTER); p.text(text, x * k, y * k)
      }
      const box = (x: number, y: number, w: number, h: number, color = PAPER, radius = 0.04) => {
        solid(p, INK, k * 0.025, color); p.rect(x * k, y * k, w * k, h * k, radius * k)
      }

      // The shelves and switch are game furniture. The four acting machines are stock pieces above.
      line([4.2, 1.46], [6.3, 1.46]); line([4.2, 1.54], [6.3, 1.54])
      for (let i = 0; i < 3; i++) {
        const [x] = readyAt(i)
        line([x - 0.19, 1.55], [x + 0.19, 1.55], '#aab3a4', 0.04)
      }
      line([4.45, 1.54], [4.45, 2.85]); line([6.2, 1.54], [6.2, 2.85])
      label('DISPATCH SHELF', 5.22, 0.76)
      label('NEXT →', 6.13, 1.02, 0.11)
      box(PARK[0], PARK[1] + 0.2, 0.62, 0.13, '#e5e7db')
      label('PARK', PARK[0], PARK[1] + 0.48, 0.1)
      line([6.3, 1.46], [6.6, 2.43]); line([6.45, 1.46], [6.75, 2.43])
      box(6.43, 1.73, 0.17, 0.17, '#7a9b72')
      label('01 / PAINT', 1.7, 0.96)
      label('02 / SEND', 7.3, 3.18)
      label('RETURN TO SENDER', 6.8, 4.35, 0.115, '#69766b')
      label('RETURNS', 1.65, 4.25, 0.11)
      line([0.8, 3.97], [3.1, 3.97])
      for (const x of [3.8, 5.5, 7.2, 8.9]) {
        line([x + 0.12, 4.02], [x - 0.12, 4.02], '#acb5a7', 0.018)
        line([x - 0.12, 4.02], [x - 0.04, 3.95], '#acb5a7', 0.018)
      }
      label('GUS', 11.02, 4.49, 0.12)
      label('returns dept.', 11.02, 4.68, 0.105, '#69766b')
      // Address silhouettes: the same address numbers as the order tickets and buttons.
      for (let i = 0; i < 3; i++) {
        const [x, y] = mailboxAt(i)
        box(x, y + 0.18, 0.84, 0.36, '#e5e7db')
        line([x - 0.28, y + 0.1], [x + 0.28, y + 0.1])
        label(String(i + 1).padStart(2, '0'), x, y + 0.48, 0.12)
        if (i === 0) {
          box(x, y - 0.38, 0.28, 0.65, '#ded8bd')
          p.push(); p.translate(x * k, (y - 0.65) * k)
          p.rotate(t * 0.35)
          for (let j = 0; j < 4; j++) { p.rotate(Math.PI / 2); box(0, -0.2, 0.08, 0.35, '#7a9b72') }
          p.pop()
        } else if (i === 1) {
          box(x, y - 0.45, 0.27, 0.72, '#ded8bd')
          box(x, y - 0.72, 0.4, 0.18, COLORS[0])
          box(x, y - 0.48, 0.15, 0.18, PAPER)
        } else {
          solid(p, INK, k * 0.025, COLORS[2]); p.circle(x * k, (y - 0.54) * k, 0.65 * k)
          p.noStroke(); p.fill(PAPER); p.circle((x + 0.14) * k, (y - 0.66) * k, 0.5 * k)
          line([x - 0.19, y - 0.22], [x - 0.19, y - 0.06], '#69766b', 0.015)
        }
        const hit = g.deliveries.slice().reverse().find((d) => d.address === i && d.at <= t && t - d.at < 1.4)
        if (hit) label(hit.good ? 'DELIVERED ✓' : 'RETURN ↶', x, y - 1.05, 0.12, hit.good ? '#476e47' : COLORS[0])
      }
      // Letter codes make color readable without color vision; unpainted parcels have no letter.
      for (const parcel of g.parcels) {
        const point = g.position(parcel, t)
        if (!point || point.hidden) continue
        const color = COLORS.findIndex((c) => c === point.color)
        if (color >= 0) label(LETTERS[color], point.x, point.y + 0.005, 0.15)
      }
      p.pop()
    }
  }, host)
  return () => { release(); instance.remove() }
}
