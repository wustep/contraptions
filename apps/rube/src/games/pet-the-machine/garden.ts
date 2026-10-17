import p5 from 'p5'
import { canvasOf, downloadBlob } from '../../../../../src/core/capture'
import { outline, solid } from '../../../../../src/core/draw'
import { clamp } from '../../../../../src/core/ease'
import { drawWorld, setupCanvas } from '../../engine'
import { laneAt, type Piece, type PieceCtx } from '../../parts'
import type { Placed } from '../../plan'
import { Show, type ShowPoint } from '../../show'
import type { Universe } from '../../universe'
import { RESIDENTS, behaviors, behaviorById, toys, type Memory, type Perches, type Resident } from './model'
import { ACTOR_SCALE, actorTime, ink, paper, position, theme, type Cast, type Performance } from './performance'

export interface GardenState {
  memory: Memory
  selected: Resident
  performance: Performance | null
  time: number
  idle: number
  pet: { resident: Resident; start: number } | null
  reducedMotion: boolean
}

const sceneWidth = 11.3

function flower(p: p5, x: number, y: number, k: number, color: string, lean = 0): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(lean)
  outline(p, ink, 1.2)
  p.line(0, 0, 0, -0.35 * k)
  p.line(0, -0.1 * k, -0.11 * k, -0.21 * k)
  solid(p, ink, 1, color)
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5
    p.ellipse(Math.cos(a) * 0.075 * k, (-0.4 + Math.sin(a) * 0.075) * k, 0.1 * k, 0.1 * k)
  }
  p.fill(paper)
  p.circle(0, -0.4 * k, 0.075 * k)
  p.pop()
}

function scenery(p: p5, k: number, perches: Perches, idle: number, selected: Resident): void {
  // A tabletop conservatory: faint ribs, one low bed, real screws, and no lighting effects.
  p.push()
  outline(p, '#dadfd3', 1.2)
  p.noFill()
  p.arc(0, 0.4 * k, 10.3 * k, 5.3 * k, Math.PI, Math.PI * 2)
  p.line(-5.15 * k, 0.4 * k, -5.15 * k, 2.15 * k)
  p.line(5.15 * k, 0.4 * k, 5.15 * k, 2.15 * k)
  p.arc(0, 0.4 * k, 7.0 * k, 5.3 * k, Math.PI, Math.PI * 2)
  p.line(-3.5 * k, 0.4 * k, -3.5 * k, 1.8 * k)
  p.line(3.5 * k, 0.4 * k, 3.5 * k, 1.8 * k)
  p.line(-4.95 * k, -0.35 * k, 4.95 * k, -0.35 * k)
  p.line(0, -2.24 * k, 0, -1.5 * k)
  p.circle(0, -1.41 * k, 0.16 * k)

  solid(p, '#a6b19e', 1.2, '#e7ecdf')
  p.rect(0, 2.16 * k, 10.5 * k, 0.36 * k, 0.12 * k)
  outline(p, '#a6b19e', 1)
  p.line(-5.1 * k, 2.05 * k, 5.1 * k, 2.05 * k)
  for (const x of [-4.95, 4.95]) {
    solid(p, ink, 1, paper)
    p.circle(x * k, 2.17 * k, 0.11 * k)
    p.line((x - 0.025) * k, 2.19 * k, (x + 0.025) * k, 2.15 * k)
  }
  for (let i = 0; i < 17; i++) {
    const x = -4.7 + i * 0.56
    outline(p, '#acb8a3', 1)
    p.line(x * k, 1.98 * k, (x + 0.04) * k, 1.91 * k)
  }

  for (const id of RESIDENTS) {
    const [x, y] = position(id, perches)
    const center = x + (id === 'frog' ? 0 : 0.65)
    const width = id === 'frog' ? 1.9 : 3.1
    const level = y + (id === 'frog' ? 0.9 : 0.85)
    solid(p, ink, 1.4, id === selected ? '#e0e7d7' : '#eeeee3')
    p.rect(center * k, (level + 0.1) * k, width * k, 0.2 * k, 0.07 * k)
    for (const leg of [-1, 1]) {
      const lx = center + leg * (width / 2 - 0.25)
      outline(p, '#7f8c7d', 1.3)
      p.line(lx * k, (level + 0.2) * k, lx * k, 1.98 * k)
      p.line((lx - 0.1) * k, 1.98 * k, (lx + 0.1) * k, 1.98 * k)
    }
  }
  flower(p, -4.8, 1.98, k, '#d6ae55', -0.12 + Math.sin(idle * 0.7) * 0.025)
  flower(p, 4.76, 1.98, k, '#c9838a', 0.15 + Math.sin(idle * 0.8) * 0.03)
  flower(p, 4.46, 1.98, k * 0.85, paper, -0.12)

  // Little garden tags and a winding key beneath the frog's pad.
  outline(p, '#889581', 1.2)
  p.line(-4.6 * k, 1.98 * k, -4.6 * k, 1.62 * k)
  solid(p, '#889581', 1, paper)
  p.rect(-4.6 * k, 1.56 * k, 0.4 * k, 0.2 * k, 0.03 * k)
  p.line(-4.71 * k, 1.56 * k, -4.49 * k, 1.56 * k)
  p.pop()
}

function actor(p: p5, id: Resident, pass: 'draw' | 'over', c: PieceCtx, state: GardenState, cast: Cast): void {
  const perches = state.performance?.decision.perches ?? state.memory.perches
  const [x, y] = position(id, perches)
  const stock = cast[id]
  const t = actorTime(state.performance, id, state.time, state.reducedMotion ? 1 : state.idle)
  const age = state.pet?.resident === id ? state.idle - state.pet.start : -1
  const pleased = age >= 0 && age < 1.4 ? Math.sin(age / 1.4 * Math.PI) : 0
  p.push()
  p.translate(x * c.k, y * c.k)
  const ctx: PieceCtx = { ...c, k: c.k * ACTOR_SCALE, t, since: t - stock.placement.lane.fire, color: toys[state.performance?.decision.toy ?? 'ball'].color, weight: Math.max(1.1, c.k * 0.022), spin: (xx) => xx / 0.13 }
  if (pleased && !state.reducedMotion) p.scale(1 + pleased * 0.025, 1 - pleased * 0.025)
  stock.piece[pass]?.(p, stock.placement.state, ctx)
  p.pop()
  if (pass === 'over' && pleased) {
    const px = (x + (id === 'fern' ? 0.65 : id === 'snail' ? 0.25 : 0.3)) * c.k
    const py = (y - (id === 'frog' ? 2.0 : 0.9) - pleased * 0.15) * c.k
    p.push()
    outline(p, '#bd7352', 1.5)
    p.noFill()
    p.bezier(px, py + 5, px - 18, py - 6, px - 4, py - 13, px, py - 5)
    p.bezier(px, py + 5, px + 18, py - 6, px + 4, py - 13, px, py - 5)
    p.pop()
  }
}

/** Cosmetic marks follow the very same lane as the engine's one ball. */
function toyMark(p: p5, c: PieceCtx, state: GardenState): void {
  const play = state.performance
  if (!play || state.time > play.duration) return
  const at = laneAt(play.lane, state.time)
  // Stock frog's hidden mouth interval is resolved by the clip's own lane.
  const clip = play.clips.find((item) => item.resident === 'frog' && state.time >= item.start && state.time <= item.start + item.duration)
  if (clip && at.hidden) return
  const radius = 0.13 * ACTOR_SCALE * c.k
  if (at.hidden || at.scale < 0.05) return
  p.push()
  p.translate(at.x * c.k, at.y * c.k)
  p.scale(at.scale)
  p.rotate(state.time * 2.5)
  if (play.decision.toy === 'bell') {
    outline(p, ink, 1.25)
    p.line(-radius * 0.55, 0, radius * 0.55, 0)
    p.circle(-radius * 0.55, 0, 2)
    p.circle(radius * 0.55, 0, 2)
    p.arc(0, -radius * 0.95, radius * 0.5, radius * 0.5, Math.PI, Math.PI * 2)
  } else if (play.decision.toy === 'pompom') {
    outline(p, ink, 1)
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4
      p.line(Math.cos(a) * radius * 0.28, Math.sin(a) * radius * 0.28, Math.cos(a) * radius * 1.1, Math.sin(a) * radius * 1.1)
    }
  }
  p.pop()
}

function thought(p: p5, k: number, state: GardenState): void {
  const play = state.performance
  if (!play || state.time < 0.7 || state.time > play.duration - 1.5) return
  const clip = play.clips.filter((c) => state.time >= c.start && state.time <= c.start + c.duration).at(-1)
  if (!clip) return
  const [x, y] = position(clip.resident, play.decision.perches)
  const thoughtX = x + (clip.resident === 'frog' ? 0.1 : 0.55)
  const thoughtY = y - (clip.resident === 'frog' ? 2.5 : 1.0)
  const text = clip.resident === 'snail' ? play.decision.toy === 'pompom' ? 'oh.' : 'hmm…' : clip.resident === 'frog' ? play.decision.toy === 'bell' ? '♪' : '!' : play.decision.behavior === 'fern-trust' ? 'hello.' : 'oh!'
  p.push()
  p.textFont('Georgia')
  p.textSize(Math.max(11, k * 0.16))
  p.textAlign(p.CENTER, p.CENTER)
  const width = Math.max(27, p.textWidth(text) + 17)
  solid(p, '#b7c2ac', 1, paper)
  p.rect(thoughtX * k, thoughtY * k, width, 24, 9)
  outline(p, '#b7c2ac', 1)
  p.line(thoughtX * k, thoughtY * k + 12, thoughtX * k - 3, thoughtY * k + 17)
  p.noStroke()
  p.fill('#657759')
  p.text(text, thoughtX * k, thoughtY * k - 1)
  p.pop()
}

class GardenShow extends Show {
  readonly universeValue: Universe
  readonly piece: Placed
  override trailOff = () => true
  constructor(private readonly state: GardenState, cast: Cast) {
    super('pet-the-machine-v1')
    const art: Piece = {
      name: 'little-garden', weight: 0, place: () => null,
      draw: (p, _s, c) => {
        scenery(p, c.k, state.performance?.decision.perches ?? state.memory.perches, state.reducedMotion ? 0 : state.idle, state.selected)
        const play = state.performance
        if (play) {
          const [x] = play.lane.segs[play.lane.segs.length - 1].to
          solid(p, ink, 1, '#dce4d0')
          p.ellipse(x * c.k, 2.0 * c.k, 0.62 * c.k, 0.13 * c.k)
        }
        for (const id of RESIDENTS) actor(p, id, 'draw', c, state, cast)
      },
      over: (p, _s, c) => {
        for (const id of RESIDENTS) actor(p, id, 'over', c, state, cast)
        toyMark(p, c, state)
        thought(p, c.k, state)
      },
    }
    this.piece = { piece: art, state: null, col: 0, row: 0, mirror: 1, cells: [[0, 0]], lane: { segs: [{ from: [0, 0], to: [0, 0], dur: 1 }], fire: 0 }, start: 0, span: 1, ballIn: { color: toys.ball.color, ghost: false, id: 0 }, changes: [], points: 0 }
    const bounds = { x0: -6, y0: -3, x1: 6, y1: 3 }
    this.universeValue = {
      index: 0, seed: 'little-garden', theme, taste: 'quiet', ballColor: toys.ball.color, backdrop: 'plain', pieces: [this.piece], box: bounds, bounds, journey: 100,
      world: { name: 'pet-garden', label: 'Little garden', note: '', themes: [theme], backdrops: ['plain'], pieces: [], tastes: {} },
    }
  }
  override at(t: number): ShowPoint {
    const play = this.state.performance
    const at = laneAt(play?.lane ?? this.piece.lane, t)
    const hidden = !play || t < 0 || t > play.duration
    return { ...at, universe: this.universeValue, placed: this.piece, local: t, begin: 0, ball: this.piece.ballIn,
      balls: hidden || at.hidden ? [] : [{ id: 1, x: at.x, y: at.y, color: toys[play!.decision.toy].color, scale: ACTOR_SCALE * at.scale, spin: play!.decision.toy === 'ball' ? undefined : null }],
    }
  }
}

export interface Garden {
  postcard(play: Performance): Promise<void>
  destroy(): void
}

export function createGarden(host: HTMLElement, state: GardenState, cast: Cast, tick: (dt: number) => void): Garden {
  const show = new GardenShow(state, cast)
  let release = () => {}
  let last = performance.now()
  let exporting = false
  const instance = new p5((p) => {
    p.setup = () => {
      release = setupCanvas(p, host).release
      p.frameRate(60)
      canvasOf(p).setAttribute('aria-hidden', 'true')
    }
    p.draw = () => {
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!exporting && !document.hidden) tick(dt)
      const k = Math.min(p.width / sceneWidth, p.height / 4.95)
      drawWorld(p, show, state.time, show.at(state.time), { x: 0, y: 0.1 }, k, { x: 0, y: 0, w: p.width, h: p.height }, false)
    }
  })

  return {
    async postcard(play) {
      const previous = { performance: state.performance, time: state.time }
      exporting = true
      state.performance = play
      state.time = clamp(play.hero / play.duration) * play.duration
      instance.redraw()
      const card = document.createElement('canvas')
      card.width = 1400
      card.height = 1040
      const ctx = card.getContext('2d')!
      ctx.fillStyle = paper
      ctx.fillRect(0, 0, card.width, card.height)
      ctx.strokeStyle = '#a7af9f'
      ctx.lineWidth = 2
      ctx.strokeRect(28, 28, 1344, 984)
      ctx.fillStyle = ink
      ctx.font = '16px ui-monospace, monospace'
      ctx.fillText('POSTCARDS FROM THE LITTLE GARDEN', 64, 83)
      const source = canvasOf(instance)
      const width = 1280
      const height = Math.min(670, width * source.height / source.width)
      ctx.drawImage(source, 60, 100 + (670 - height) / 2, width, height)
      const behavior = behaviorById(play.decision.behavior)!
      ctx.font = '46px Georgia, serif'
      ctx.fillText(behavior.title, 65, 820)
      ctx.font = '22px Georgia, serif'
      ctx.fillText(behavior.line, 65, 867)
      ctx.font = '15px ui-monospace, monospace'
      ctx.fillText(`${state.memory.names.snail} / ${state.memory.names.frog} / ${state.memory.names.fern}`, 65, 945)
      ctx.textAlign = 'right'
      ctx.fillText(`PET THE MACHINE  ·  ${String(behaviors.findIndex((b) => b.id === behavior.id) + 1).padStart(2, '0')} / 13`, 1335, 945)
      state.performance = previous.performance
      state.time = previous.time
      instance.redraw()
      exporting = false
      const blob = await new Promise<Blob | null>((resolve) => card.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('The postcard could not be drawn.')
      downloadBlob(blob, `pet-the-machine-${behavior.id}.png`)
    },
    destroy() { release(); instance.remove() },
  }
}
