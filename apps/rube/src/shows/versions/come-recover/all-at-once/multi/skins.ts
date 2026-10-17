import { DOJO, HIBACHI, HOME, HOTDOG, LAUNDROMAT, PREMIERE, ROCKS, STAR, VOID, DOJO_THEME, HOTDOG_THEME, HIBACHI_THEME, VOID_THEME, ROCKS_THEME } from '../worlds'
import { at, beam, circle, ellipse, glow, hash, line, mix, poly, rect, rgba, round, type Pen, type Pt } from './skins-pen'
import { flashOf, PL, ring, TH, WEIGHT_H, type Moment, type Skin, type View } from './skins-kit'

import { FILM_SKINS } from './skins-film'
import { FAR_SKINS } from './skins-far'
import { ODD_SKINS } from './skins-odd'
import { MONTAGE_SKINS } from './skins-montage'
import { FLASH_SKINS } from './skins-flash'
import { VERSE_SKINS } from './skins-verse'
import { SHOP_SKINS } from './skins-shop'
import { PLAY_SKINS } from './skins-play'
import { WILD_SKINS } from './skins-wild'
import { SKY_SKINS } from './skins-sky'
import { PAST_SKINS } from './skins-past'
import { TOY_SKINS } from './skins-toy'

export { HP, LE, LW, PL, TH, TILT, WEDGE, WEIGHT_H, type Moment, type Skin, type View } from './skins-kit'

/**
 * The worlds as skins: every universe Evelyn has been to, and some she has not, each as the materials and the one
 * backdrop of a single simple machine. The mosaic draws the same machine in every panel (a seesaw: a wedge, a plank,
 * Evelyn on its left end and a weight on its right, trading throws on the beat) and a skin says what it is made of
 * where it is: a laundromat's wood and steel with a laundry bag for the weight, a red carpet's brass and velvet
 * with a gold statuette, a hot dog in its bun with a mustard bottle. The geometry never changes; only the world
 * does. The surf paints the same worlds' backdrops as it flies through them.
 *
 * Every colour here is one of `worlds.ts`, or a mix of two of them.
 *
 * A skin draws in scene cells: x right, y down, the ground under the seesaw's pivot at 0,0, the ground's top at
 * y = 0. The machine spans x -1.15..1.15 and rises to about y = -1.6 at the top of Evelyn's throw.
 */

function ground(pen: Pen, skin: Skin, v: View): void {
  rect(pen, v.x0 - 0.1, 0, v.x1 - v.x0 + 0.2, Math.max(0.05, v.y1 + 0.1), skin.floor, 0)
  if (skin.edge) rect(pen, v.x0 - 0.1, 0, v.x1 - v.x0 + 0.2, 0.07, skin.edge, 0)
  if (pen.lod <= 1) line(pen, v.x0 - 0.1, 0, v.x1 + 0.1, 0, pen.ink, pen.lw)
}

/** The paper and the ground under a skin's backdrop. */
export function paper(pen: Pen, skin: Skin, v: View): void {
  rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, v.y1 - v.y0 + 0.2, skin.bg, 0)
}

/** A skin's whole backdrop: paper, what stands behind, and the ground. */
export function backdrop(pen: Pen, skin: Skin, m: Moment, v: View): void {
  paper(pen, skin, v)
  skin.back(pen, m, v)
  ground(pen, skin, v)
}

/* ------------------------------------------------------------------ home: the laundromat */

function washer(pen: Pen, x: number, m: Moment, turn: number): void {
  const w = 1.36
  const h = 1.56
  round(pen, x - w / 2, -h, w, h, 0.07, HOME.enamel)
  if (pen.lod <= 1) rect(pen, x - w / 2, -h, w, 0.24, HOME.steel, 0.8)
  const cy = -0.74
  circle(pen, x, cy, 0.46, HOME.steel)
  circle(pen, x, cy, 0.35, HOME.glass, 0.8)
  if (pen.lod <= 1) {
    // The water in the drum, and the wash going round in it.
    const { ctx } = pen
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, cy, 0.35, 0, Math.PI * 2)
    ctx.clip()
    rect(pen, x - 0.4, cy + 0.06 + 0.02 * Math.sin(m.t * 3 + x), 0.8, 0.4, HOME.glassDeep, 0)
    if (pen.lod === 0) {
      for (let i = 0; i < 3; i++) {
        const a = turn + (i * Math.PI * 2) / 3
        ellipse(pen, x + Math.cos(a) * 0.19, cy + Math.sin(a) * 0.19, 0.1, 0.06, [HOME.rose, HOME.denim, HOME.butter][i], 0, a)
      }
    }
    ctx.restore()
    circle(pen, x, cy, 0.35, null, 0.8)
    // A glint on the glass.
    if (pen.lod === 0) line(pen, x - 0.2, cy - 0.14, x - 0.1, cy - 0.24, HOME.light, pen.lw * 1.4)
    circle(pen, x + w / 2 - 0.18, -h + 0.12, 0.05, HOME.gold, 0.6)
  }
}

/** The laundromat's garland: a cord in shallow swags, two red lanterns on each, rocking on their hooks. */
function garland(pen: Pen, m: Moment, v: View): void {
  const y = -2.52
  const sag = 0.13
  const span = 2.2
  const knock = ring(m, 0.55, 0.6)
  for (let i = Math.floor(v.x0 / span); i * span < v.x1; i++) {
    const hx = i * span
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(hx, y)
    ctx.quadraticCurveTo(hx + span / 2, y + 2 * sag, hx + span, y)
    ctx.strokeStyle = pen.ink
    ctx.lineWidth = pen.lw * 0.7
    ctx.stroke()
    for (const u of [0.28, 0.72]) {
      const lx = hx + span * u
      const ly = y + 4 * sag * u * (1 - u)
      const sway = (0.12 + 0.1 * hash(i, u * 10, 41)) * knock + 0.035 * Math.sin(m.t * 1.3 + lx * 1.7)
      at(pen, lx, ly, sway, 1, () => {
        line(pen, 0, 0, 0, 0.07, pen.ink, pen.lw * 0.6)
        ellipse(pen, 0, 0.21, 0.13, 0.15, HOME.red, 0.7)
        rect(pen, -0.065, 0.05, 0.13, 0.04, HOME.gold, 0.6)
        rect(pen, -0.065, 0.33, 0.13, 0.04, HOME.gold, 0.6)
        line(pen, 0, 0.37, 0, 0.5, HOME.gold, pen.lw * 1.4)
      })
    }
  }
}

const home: Skin = {
  key: 'home',
  bg: LAUNDROMAT.bg,
  ink: LAUNDROMAT.ink,
  floor: HOME.floor,
  edge: HOME.tileDeep,
  plank: HOME.wood,
  fulcrum: HOME.steel,
  back(pen, m, v) {
    // Tile to shoulder height, grout, and the paper wall over it.
    rect(pen, v.x0 - 0.1, -2.1, v.x1 - v.x0 + 0.2, 2.1, HOME.tile, 0)
    if (pen.lod === 0) {
      for (let y = -1.8; y < 0; y += 0.3) line(pen, v.x0, y, v.x1, y, HOME.tileDeep, pen.lw * 0.7)
      for (let x = Math.floor(v.x0 / 0.3) * 0.3; x < v.x1; x += 0.3) line(pen, x, -2.1, x, 0, HOME.tileDeep, pen.lw * 0.7)
    }
    if (pen.lod <= 2) line(pen, v.x0, -2.1, v.x1, -2.1, HOME.tileDeep, pen.lw * 2)
    // A tube overhead, on its hangers from the ceiling: never a bar floating in the air.
    if (v.y0 < -2.9) {
      rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, -3.42 - v.y0 + 0.1, mix(LAUNDROMAT.bg, HOME.steel, 0.35), 0)
      if (pen.lod <= 2) line(pen, v.x0, -3.42, v.x1, -3.42, LAUNDROMAT.ink, pen.lw)
      if (pen.lod <= 1) for (const hx of [0.2, 2.2]) line(pen, hx, -3.42, hx, -3.06, LAUNDROMAT.ink, pen.lw * 0.6)
      glow(pen, 1.2, -3.0, 1.7, HOME.light, 0.35)
      round(pen, -0.1, -3.06, 2.6, 0.12, 0.06, HOME.light, 0.8)
    }
    // The new year garland strung across under the ceiling, its lanterns rocking when the floor is struck.
    if (pen.lod === 0 && v.y0 < -2.35) garland(pen, m, v)
    const turn = m.t * 2.2
    washer(pen, -1.98, m, turn)
    washer(pen, 1.98, m, turn + 1.3)
  },
  weight(pen) {
    // A laundry bag, tied at the neck, with Waymond's googly eyes on it.
    const h = WEIGHT_H
    poly(pen, [[-0.15, 0], [0.15, 0], [0.17, -h * 0.5], [0.08, -h * 0.82], [-0.08, -h * 0.82], [-0.17, -h * 0.5]], HOME.denim)
    poly(pen, [[-0.06, -h * 0.82], [0.06, -h * 0.82], [0.1, -h], [-0.1, -h]], HOME.denim, 0.8)
    if (pen.lod <= 1) {
      for (const ex of [-0.055, 0.06]) {
        circle(pen, ex, -h * 0.5, 0.05, '#FFFFFF', 0.7)
        circle(pen, ex + 0.01, -h * 0.5 + 0.018, 0.024, '#141414', 0)
      }
    }
  },
}

/* ------------------------------------------------------------------ the premiere */

/**
 * The premiere's crowd behind the rope: heads and shoulders dark against the dark, a hat or two, swaying; on a loud
 * landing they come up on their toes and the press lift their cameras, and a bulb or two goes.
 */
function crowd(pen: Pen, m: Moment, v: View): void {
  const col = mix(PREMIERE.bg, STAR.velvet, 0.18)
  const deep = mix(PREMIERE.bg, '#000000', 0.35)
  const loud = m.since >= 0 && Number.isFinite(m.since) && m.s >= 1.0 ? Math.exp(-m.since / 0.55) : 0
  const step = 0.44
  for (let i = Math.floor(v.x0 / step) - 1; i * step < v.x1 + step; i++) {
    const x = i * step + 0.14 * (hash(i, 3) - 0.5)
    const hy = -1.22 - 0.16 * hash(i, 4) + 0.025 * Math.sin(m.t * 1.7 + i * 1.9) - 0.09 * loud * hash(i, 8)
    round(pen, x - 0.19, hy + 0.12, 0.38, -hy - 0.12, 0.12, col, 0)
    circle(pen, x, hy, 0.115, col, 0)
    if (hash(i, 5) < 0.22) {
      rect(pen, x - 0.15, hy - 0.08, 0.3, 0.04, col, 0)
      rect(pen, x - 0.09, hy - 0.2, 0.18, 0.13, col, 0)
    }
    // The press, with their cameras up over the heads in front.
    if (hash(i, 6) < 0.34 && loud > 0.04) {
      const cy = hy - 0.12 - 0.22 * Math.min(1, loud * 1.6)
      rect(pen, x - 0.11, cy - 0.07, 0.22, 0.14, deep, 0)
      circle(pen, x, cy, 0.045, mix(deep, STAR.brass, 0.4), 0)
      if (m.since < 0.07 && hash(i, 7, Math.round(m.t * 3)) < 0.5) rect(pen, x - 0.06, cy - 0.15, 0.12, 0.06, STAR.flash, 0)
    }
  }
}

const premiere: Skin = {
  key: 'premiere',
  bg: PREMIERE.bg,
  ink: PREMIERE.ink,
  floor: STAR.carpet,
  edge: STAR.gold,
  plank: STAR.brass,
  fulcrum: STAR.velvet,
  back(pen, m, v) {
    // The spotlight, from high on the left, onto the machine.
    beam(pen, -2.6, -3.4, 0.1, 0.1, 0.2, 2.2, STAR.spot, 0.2)
    if (pen.lod === 0) crowd(pen, m, v)
    if (pen.lod <= 1) {
      // Stanchions and their velvet rope, going off either way.
      for (const x of [-1.72, 1.72]) {
        rect(pen, x - 0.03, -0.9, 0.06, 0.9, STAR.brass, 0.7)
        circle(pen, x, -0.93, 0.06, STAR.gold, 0.7)
        ellipse(pen, x, -0.02, 0.13, 0.04, STAR.brass, 0.7)
      }
      const { ctx } = pen
      for (const [a, b] of [[-3, -1.72], [1.72, 3]] as const) {
        ctx.beginPath()
        ctx.moveTo(a, -0.86)
        ctx.quadraticCurveTo((a + b) / 2, -0.58, b, -0.86)
        ctx.strokeStyle = STAR.velvet
        ctx.lineWidth = 0.07
        ctx.stroke()
      }
    }
  },
  weight(pen) {
    // A gold statuette on a brass base.
    const h = WEIGHT_H
    rect(pen, -0.11, -0.07, 0.22, 0.07, STAR.brass, 0.8)
    poly(pen, [[-0.05, -0.07], [0.05, -0.07], [0.035, -h * 0.55], [0.055, -h * 0.72], [0.02, -h * 0.84], [-0.02, -h * 0.84], [-0.055, -h * 0.72], [-0.035, -h * 0.55]], STAR.gold, 0.8)
    circle(pen, 0, -h * 0.91, 0.045, STAR.gold, 0.8)
  },
}

/* ------------------------------------------------------------------ the dojo */

/** The dojo's weapon rack: two posts and two rails, four staffs stood in it, the outer two spears with red tassels. */
function rack(pen: Pen, m: Moment): void {
  const x = -2.62
  const r = ring(m, 0.24, 0.3)
  for (let i = 0; i < 4; i++) {
    const fx = x - 0.36 + i * 0.24
    const tip = fx + 0.06 + r * (i % 2 ? 0.035 : -0.035)
    const top = -1.95 + 0.08 * (i % 2)
    line(pen, fx, -0.03, tip, top, pen.ink, 0.085)
    line(pen, fx, -0.03, tip, top, DOJO.wood, 0.05)
    if (i === 0 || i === 3) {
      poly(pen, [[tip - 0.05, top], [tip + 0.05, top], [tip, top - 0.24]], mix(DOJO.screen, DOJO.wash, 0.45), 0.6)
      line(pen, tip, top + 0.02, tip + 0.05 + r * 0.1, top + 0.2, DOJO.lacquer, 0.045)
    }
  }
  for (const px of [x - 0.5, x + 0.5]) round(pen, px - 0.05, -1.5, 0.1, 1.5, 0.03, DOJO.woodDeep, 0.8)
  for (const ry of [-1.28, -0.36]) rect(pen, x - 0.56, ry, 1.12, 0.08, DOJO.woodDeep, 0.8)
}

const dojo: Skin = {
  key: 'dojo',
  bg: DOJO_THEME.bg,
  ink: DOJO_THEME.ink,
  floor: DOJO.wood,
  edge: DOJO.woodDeep,
  plank: DOJO.woodDeep,
  fulcrum: DOJO.lacquer,
  back(pen, m, v) {
    // Paper screens along the back, in their lattice.
    const top = -2.5
    rect(pen, v.x0 - 0.1, top, v.x1 - v.x0 + 0.2, -top, DOJO.screen, 0)
    const bar = pen.lod >= 2 ? 0.06 : 0.035
    if (pen.lod <= 2) {
      const step = pen.lod === 0 ? 0.36 : 0.72
      for (let x = Math.floor(v.x0 / 1.44) * 1.44; x < v.x1 + 0.1; x += step) line(pen, x, top, x, 0, DOJO.woodDeep, Math.abs(x / 1.44 - Math.round(x / 1.44)) < 1e-6 ? bar * 2.2 : bar)
      for (let y = top; y < 0; y += pen.lod === 0 ? 0.42 : 0.84) line(pen, v.x0, y, v.x1, y, DOJO.woodDeep, bar)
    }
    // A rack of staffs and spears along the left wall, rattling in it when the floor is struck.
    if (pen.lod === 0 && v.x0 < -2.0) rack(pen, m)
    // A wooden dummy stands in the corner, and its arms rattle when the floor is struck.
    const x = 1.95
    const r = ring(m, 0.22, 0.25) * (m.e ? 0.14 : 0.08)
    if (pen.lod <= 1) {
      // Two arms high and one low, rattling in their sockets; the leg, bent at the knee.
      at(pen, x - 0.1, -1.2, -0.3 + r, 1, () => round(pen, -0.5, -0.05, 0.56, 0.1, 0.05, DOJO.woodDeep, 0.8))
      at(pen, x - 0.1, -1.08, 0.08 - r, 1, () => round(pen, -0.52, -0.05, 0.58, 0.1, 0.05, DOJO.woodDeep, 0.8))
      at(pen, x - 0.1, -0.76, 0.12 + r * 0.6, 1, () => round(pen, -0.46, -0.05, 0.52, 0.1, 0.05, DOJO.woodDeep, 0.8))
      poly(pen, [[x - 0.1, -0.42], [x - 0.42, -0.28], [x - 0.36, 0], [x - 0.27, 0], [x - 0.32, -0.24], [x - 0.08, -0.33]], DOJO.woodDeep, 0.8)
    }
    round(pen, x - 0.14, -1.66, 0.28, 1.66, 0.12, DOJO.wood)
    rect(pen, x - 0.24, -0.08, 0.48, 0.08, DOJO.woodDeep, 0.8)
  },
  weight(pen) {
    // A jade seal with its knob, and a gold cord.
    const h = WEIGHT_H
    rect(pen, -0.12, -h * 0.62, 0.24, h * 0.62, DOJO.jade)
    poly(pen, [[-0.08, -h * 0.62], [0.08, -h * 0.62], [0.05, -h * 0.9], [0, -h], [-0.05, -h * 0.9]], DOJO.jade, 0.8)
    if (pen.lod <= 1) line(pen, 0.04, -h * 0.85, 0.1, -h * 0.45, DOJO.gold, 0.03)
  },
}

/* ------------------------------------------------------------------ hot dog fingers */

/** A drape at one side of the recital room, from above the frame to the floor, in folds, gathered at its waist. */
function drape(pen: Pen, side: number, v: View): void {
  const inner = side * 2.5
  const outer = side < 0 ? v.x0 - 0.1 : v.x1 + 0.1
  const top = v.y0 - 0.1
  const cloth = mix(HOTDOG.ketchup, HOTDOG_THEME.bg, 0.4)
  const fold = mix(cloth, HOTDOG.piano, 0.25)
  const waist = -1.05
  // Gathered in at the cord, out again below it to the floor.
  const pull = side * -0.22
  poly(pen, [[outer, top], [inner, top], [inner - pull, waist], [inner, 0.02], [outer, 0.02]], cloth, 0.8)
  for (let j = 1; j < 4; j++) {
    const u = j / 4
    const fx = inner + (outer - inner) * u
    line(pen, fx, top, fx - pull * (1 - u), waist, fold, 0.03)
    line(pen, fx - pull * (1 - u), waist, fx, 0, fold, 0.03)
  }
  line(pen, inner - pull - side * 0.04, waist - 0.04, outer, waist + 0.06, HOTDOG.mustard, 0.05)
}

const hotdog: Skin = {
  key: 'hotdog',
  bg: HOTDOG_THEME.bg,
  ink: HOTDOG_THEME.ink,
  floor: HOTDOG.lilac,
  plank: HOTDOG.bun,
  fulcrum: HOTDOG.ketchup,
  back(pen, m, v) {
    // The recital's drapes at either side, gathered back with a mustard cord.
    if (pen.lod === 0) for (const side of [-1, 1]) if (side < 0 ? v.x0 < -2.45 : v.x1 > 2.45) drape(pen, side, v)
    // The piano that is played with the feet, behind the machine: up on its legs, its keyboard over the plank's
    // highest swing and the weight's head, so the seesaw works under the keys rather than through them.
    const x0 = -1.5
    const x1 = 1.5
    const kb = -1.32
    rect(pen, x0 + 0.12, kb + 0.2, 0.12, -kb - 0.2, HOTDOG.piano)
    rect(pen, x1 - 0.24, kb + 0.2, 0.12, -kb - 0.2, HOTDOG.piano)
    rect(pen, x0, kb - 0.9, x1 - x0, 1.12, HOTDOG.piano)
    if (pen.lod <= 2) {
      rect(pen, x0 - 0.08, kb - 0.12, x1 - x0 + 0.16, 0.12, HOTDOG.piano, 0.8)
      rect(pen, x0, kb, x1 - x0, 0.2, HOTDOG.ivory, pen.lod <= 1 ? 0.6 : 0)
      if (pen.lod <= 1) {
        const n = 16
        for (let i = 1; i < n; i++) {
          const x = x0 + ((x1 - x0) * i) / n
          if (pen.lod === 0) line(pen, x, kb, x, kb + 0.2, HOTDOG.piano, pen.lw * 0.6)
          if ([1, 2, 4, 5, 6].includes(i % 7)) rect(pen, x - 0.035, kb, 0.07, 0.12, HOTDOG.piano, 0)
        }
      }
      // A hand of hot dogs hangs over it, limp, and wobbles when the plank lands.
      if (pen.lod <= 1) {
        const w = ring(m, 0.3, 0.3) * 0.25
        const hx = -2.05
        const hy = -1.95
        round(pen, hx - 0.22, hy - 0.2, 0.44, 0.3, 0.1, HOTDOG.bun)
        for (let i = 0; i < 4; i++) {
          const fx = hx - 0.16 + i * 0.105
          at(pen, fx, hy + 0.08, w * (0.6 + 0.2 * i) + 0.08 * (i - 1.5), 1, () => round(pen, -0.04, 0, 0.08, 0.34 + 0.04 * (i % 2), 0.04, HOTDOG.sausage, 0.7))
        }
      }
    }
  },
  front(pen, m, v) {
    // The audience, in front: the backs of their heads, swaying to it; on a loud landing they clap, floppily.
    if (pen.lod > 0 || v.y1 < 0.3) return
    const col = mix(HOTDOG.piano, HOTDOG.sausageDeep, 0.25)
    const clap = m.since >= 0 && Number.isFinite(m.since) && m.s >= 1.1 ? Math.exp(-m.since / 0.7) : 0
    for (let i = Math.floor(v.x0 / 0.85) - 1; i * 0.85 < v.x1 + 0.5; i++) {
      const x = i * 0.85 + 0.22 * (hash(i, 31) - 0.5)
      const y = 0.52 + 0.07 * hash(i, 32)
      const lean = 0.05 * Math.sin(m.t * 1.1 + i * 1.3)
      at(pen, x, y, lean, 1, () => {
        round(pen, -0.34, 0.18, 0.68, 0.6, 0.2, col, 0)
        ellipse(pen, 0, 0, 0.19, 0.22, col, 0)
        if (hash(i, 33) < 0.3) ellipse(pen, 0.13, -0.17, 0.08, 0.05, HOTDOG.ketchup, 0, 0.4)
      })
      if (clap > 0.06 && hash(i, 34) < 0.6) {
        // Two hands of hot dogs, up, flopping as they meet.
        const meet = Math.abs(Math.sin(m.since * 14))
        for (const s of [-1, 1]) {
          const hx = x + s * (0.06 + 0.1 * meet)
          const hy = y - 0.32 - 0.12 * clap
          round(pen, hx - 0.06, hy, 0.12, 0.09, 0.04, HOTDOG.bun, 0)
          for (let j = 0; j < 3; j++) at(pen, hx - 0.04 + j * 0.04, hy, -s * 0.3 * meet + 0.15 * (j - 1), 1, () => round(pen, -0.016, -0.15, 0.032, 0.15, 0.016, HOTDOG.sausage, 0))
        }
      }
    }
  },
  board(pen) {
    // A hot dog in its bun, mustard down its length.
    round(pen, -PL, -TH / 2, 2 * PL, TH, TH / 2, HOTDOG.bun)
    round(pen, -PL - 0.04, -TH / 2 - 0.05, 2 * PL + 0.08, TH * 0.75, TH * 0.4, HOTDOG.sausage)
    if (pen.lod === 0) {
      const pts: Pt[] = []
      for (let i = 0; i <= 14; i++) pts.push([-PL + 0.1 + (i * (2 * PL - 0.2)) / 14, -TH / 2 - 0.02 + (i % 2 ? -0.025 : 0.01)])
      poly(pen, pts, null, 0, false)
      pen.ctx.strokeStyle = HOTDOG.mustard
      pen.ctx.lineWidth = 0.025
      pen.ctx.stroke()
    }
  },
  weight(pen) {
    // A mustard bottle with a red cap.
    const h = WEIGHT_H
    round(pen, -0.09, -h * 0.72, 0.18, h * 0.72, 0.05, HOTDOG.mustard)
    poly(pen, [[-0.06, -h * 0.72], [0.06, -h * 0.72], [0.02, -h * 0.9], [-0.02, -h * 0.9]], HOTDOG.ketchup, 0.8)
    rect(pen, -0.008, -h, 0.016, h * 0.1, HOTDOG.ketchup, 0)
  },
}

/* ------------------------------------------------------------------ Raccacoonie's kitchen */

const hibachi: Skin = {
  key: 'hibachi',
  bg: HIBACHI_THEME.bg,
  ink: HIBACHI_THEME.ink,
  floor: HIBACHI.steelDeep,
  edge: HIBACHI.steel,
  plank: HIBACHI.steel,
  fulcrum: HIBACHI.steelDeep,
  back(pen, m, v) {
    // The hood over the grill.
    if (v.y0 < -2.2) poly(pen, [[-2.4, -2.9], [2.4, -2.9], [1.8, -2.35], [-1.8, -2.35]], HIBACHI.steelDeep)
    // The onion volcano, burning, and flaring on the loud landings.
    const x = -1.9
    const f = flashOf(m, 0.9, 0.2)
    const lick = 0.5 + 0.5 * Math.sin(m.t * 17) * Math.sin(m.t * 7.3)
    const fh = 0.45 + 0.15 * lick + 0.9 * f
    poly(pen, [[x - 0.2, -0.5], [x - 0.08, -0.5 - fh * 0.7], [x - 0.02, -0.55 - fh * 0.45], [x + 0.03, -0.5 - fh], [x + 0.1, -0.5 - fh * 0.5], [x + 0.2, -0.5]], HIBACHI.flame, 0.7)
    if (pen.lod <= 1) poly(pen, [[x - 0.1, -0.5], [x, -0.5 - fh * 0.55], [x + 0.1, -0.5]], HIBACHI.flameHot, 0)
    for (let i = 0; i < 3; i++) ellipse(pen, x, -0.08 - i * 0.15, 0.3 - i * 0.07, 0.07, HIBACHI.onion, 0.7)
    // The chef's tall hat, set down on the counter, and the raccoon under it, lifting its brim to look out.
    const hx = 1.95
    const lift = pen.lod <= 1 ? 0.07 + 0.07 * Math.max(0, Math.sin(m.t * 1.3)) + 0.06 * Math.max(0, ring(m, 0.3, 0.2)) : 0.06
    rect(pen, hx - 0.5, -0.5, 1.0, 0.5, HIBACHI.steelDeep, 0.8)
    if (pen.lod <= 1) {
      // Its face, its mask, its eyes, under the brim.
      ellipse(pen, hx, -0.62, 0.24, 0.13, HIBACHI.raccoon, 0.7)
      ellipse(pen, hx, -0.64, 0.19, 0.05, HIBACHI.raccoonDeep, 0)
      circle(pen, hx - 0.08, -0.645, 0.025, HIBACHI.hat, 0)
      circle(pen, hx + 0.08, -0.645, 0.025, HIBACHI.hat, 0)
      circle(pen, hx + 0.25, -0.6, 0.03, HIBACHI.raccoonDeep, 0)
    }
    at(pen, hx, -0.62 - lift, 0.05, 1, () => {
      rect(pen, -0.3, -0.12, 0.6, 0.12, HIBACHI.hat, 0.8)
      poly(pen, [[-0.28, -0.12], [-0.34, -0.66], [-0.17, -0.86], [0, -0.78], [0.17, -0.88], [0.34, -0.66], [0.28, -0.12]], HIBACHI.hat)
    })
  },
  front(pen, m, v) {
    // The diners along the griddle, between us and it: heads and shoulders against the flame's light, their tops
    // caught by it; at the onion volcano's flare they rock back.
    if (pen.lod > 0 || v.y1 < 0.3) return
    const f = flashOf(m, 0.9, 0.35)
    const col = mix(HIBACHI_THEME.bg, '#000000', 0.35)
    for (let i = Math.floor(v.x0 / 0.95) - 1; i * 0.95 < v.x1 + 0.5; i++) {
      const x = i * 0.95 + 0.25 * (hash(i, 21) - 0.5)
      const y = 0.5 + 0.06 * hash(i, 22) - 0.07 * f * (0.5 + hash(i, 23)) + 0.012 * Math.sin(m.t * 1.4 + i * 2.1)
      round(pen, x - 0.36, y + 0.2, 0.72, 0.6, 0.2, col, 0)
      ellipse(pen, x, y, 0.2, 0.23, col, 0)
      const { ctx } = pen
      ctx.beginPath()
      ctx.ellipse(x, y, 0.2, 0.23, 0, Math.PI * 1.15, Math.PI * 1.85)
      ctx.strokeStyle = rgba(HIBACHI.flame, 0.55)
      ctx.lineWidth = pen.lw * 1.2
      ctx.stroke()
    }
  },
  board(pen) {
    // A spatula: a wooden handle, and a steel blade.
    round(pen, -PL, -TH * 0.35, PL * 0.9, TH * 0.7, TH * 0.3, HIBACHI.soy)
    rect(pen, -PL * 0.12, -TH / 2, PL * 1.12, TH, HIBACHI.steel)
    if (pen.lod === 0) for (const x of [0.4, 0.62, 0.84]) line(pen, x, -TH * 0.25, x + 0.12, -TH * 0.25, HIBACHI.steelDeep, 0.018)
  },
  weight(pen) {
    // A shrimp, curled, its tail fanned.
    const h = WEIGHT_H
    const { ctx } = pen
    ctx.beginPath()
    ctx.arc(0, -h * 0.5, h * 0.42, Math.PI * 0.75, Math.PI * 2.1)
    ctx.arc(0, -h * 0.5, h * 0.17, Math.PI * 2.1, Math.PI * 0.75, true)
    ctx.closePath()
    ctx.fillStyle = HIBACHI.shrimp
    ctx.fill()
    if (pen.lod <= 1) {
      ctx.strokeStyle = pen.ink
      ctx.lineWidth = pen.lw * 0.8
      ctx.stroke()
    }
    poly(pen, [[-h * 0.3, -h * 0.2], [-h * 0.52, -h * 0.02], [-h * 0.2, 0], [-h * 0.12, -h * 0.14]], mix(HIBACHI.shrimp, HIBACHI.flame, 0.5), 0.8)
  },
}

/* ------------------------------------------------------------------ the dark */

const dark: Skin = {
  key: 'void',
  bg: VOID_THEME.bg,
  ink: VOID_THEME.ink,
  floor: VOID.bagel,
  edge: VOID.bagelRim,
  plank: VOID.garlic,
  fulcrum: VOID.bagelRim,
  back(pen, m, _v) {
    // The everything bagel, huge, hanging behind, lit along its top and cold in its hole.
    const cx = 0.2
    const cy = -1.25
    const R = 1.55
    const r = 0.5
    glow(pen, cx, cy, r * 1.8, VOID.glow, 0.45)
    const { ctx } = pen
    ctx.beginPath()
    ctx.ellipse(cx, cy, R, R * 0.8, 0, 0, Math.PI * 2)
    ctx.ellipse(cx, cy, r, r * 0.72, 0, 0, Math.PI * 2, true)
    ctx.fillStyle = VOID.bagel
    ctx.fill('evenodd')
    if (pen.lod <= 1) {
      ctx.strokeStyle = VOID.bagelRim
      ctx.lineWidth = pen.lw * 1.2
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(cx, cy, R, R * 0.8, 0, Math.PI * 1.08, Math.PI * 1.92)
      ctx.strokeStyle = VOID.rimLight
      ctx.lineWidth = pen.lw * 2
      ctx.stroke()
    }
    if (pen.lod === 0) {
      const spin = m.t * 0.12
      for (let i = 0; i < 46; i++) {
        const a = hash(i, 1, 9) * Math.PI * 2 + spin
        const d = r + 0.12 + (R - r - 0.24) * hash(i, 2, 9)
        const sx = cx + Math.cos(a) * d
        const sy = cy + Math.sin(a) * d * 0.8
        const c = i % 5 === 0 ? VOID.salt : i % 3 === 0 ? VOID.poppy : VOID.sesame
        ellipse(pen, sx, sy, 0.03, 0.016, c, 0, a)
      }
    }
  },
  weight(pen) {
    // A small everything bagel, on its edge.
    const h = WEIGHT_H
    const { ctx } = pen
    ctx.beginPath()
    ctx.ellipse(0, -h * 0.5, 0.17, h * 0.5, 0, 0, Math.PI * 2)
    ctx.ellipse(0, -h * 0.5, 0.06, h * 0.19, 0, 0, Math.PI * 2, true)
    ctx.fillStyle = VOID.onion
    ctx.fill('evenodd')
    if (pen.lod <= 1) {
      ctx.strokeStyle = pen.ink
      ctx.lineWidth = pen.lw * 0.8
      ctx.stroke()
    }
    if (pen.lod === 0) for (let i = 0; i < 6; i++) ellipse(pen, Math.cos(i * 1.1) * 0.12, -h * 0.5 + Math.sin(i * 1.1) * h * 0.36, 0.018, 0.01, VOID.sesame, 0, i)
  },
}

/* ------------------------------------------------------------------ the rocks */

const rocks: Skin = {
  key: 'rocks',
  bg: ROCKS.sky,
  ink: ROCKS_THEME.ink,
  floor: ROCKS.stone,
  edge: ROCKS.stoneDeep,
  plank: ROCKS.stoneDeep,
  fulcrum: ROCKS.stone,
  back(pen, _m, v) {
    // The far rim of the canyon, flat-topped, and the near wall falling away.
    poly(pen, [[v.x0 - 0.2, -0.95], [-2.6, -1.05], [-1.9, -1.08], [-1.6, -1.35], [-0.6, -1.38], [-0.35, -1.12], [0.9, -1.1], [1.2, -1.45], [2.4, -1.5], [2.7, -1.2], [v.x1 + 0.2, -1.18], [v.x1 + 0.2, 0], [v.x0 - 0.2, 0]], ROCKS.far, 0)
    if (pen.lod <= 1) {
      poly(pen, [[v.x0 - 0.2, -0.45], [-1.2, -0.52], [-0.4, -0.7], [0.8, -0.66], [1.6, -0.82], [v.x1 + 0.2, -0.78], [v.x1 + 0.2, 0], [v.x0 - 0.2, 0]], ROCKS.canyon, 0)
      if (pen.lod === 0) for (const y of [-0.3, -0.16]) line(pen, v.x0, y, v.x1, y + 0.03, ROCKS.canyonShade, pen.lw * 0.8)
    }
    // A pebble on the ledge's lip.
    if (pen.lod <= 1) ellipse(pen, 1.75, -0.05, 0.09, 0.05, ROCKS.stoneDeep, 0.7)
  },
  weight(pen) {
    // A rock.
    const h = WEIGHT_H * 0.85
    poly(pen, [[-0.17, 0], [0.18, 0], [0.2, -h * 0.45], [0.08, -h], [-0.1, -h * 0.9], [-0.2, -h * 0.4]], ROCKS.stone)
    if (pen.lod === 0) line(pen, -0.02, -h * 0.85, 0.08, -h * 0.35, ROCKS.stoneDeep, pen.lw * 0.8)
  },
}

/* ------------------------------------------------------------------ worlds she never saw: a piñata party */

const PINK = STAR.neonPink
const TEAL = STAR.neonTeal

const pinata: Skin = {
  key: 'pinata',
  bg: HOTDOG.bun,
  ink: HOTDOG_THEME.ink,
  floor: HOTDOG.relish,
  plank: HOTDOG.mustard,
  fulcrum: TEAL,
  back(pen, m, v) {
    // Cut-paper flags strung across the top.
    const colours = [PINK, TEAL, HOTDOG.mustard, HOTDOG.relish, HOTDOG.lilac]
    if (pen.lod <= 2) {
      const y0 = -2.1
      const { ctx } = pen
      if (pen.lod <= 1) {
        ctx.beginPath()
        ctx.moveTo(v.x0 - 0.2, y0 - 0.05)
        ctx.quadraticCurveTo(0, y0 + 0.2, v.x1 + 0.2, y0 - 0.05)
        ctx.strokeStyle = pen.ink
        ctx.lineWidth = pen.lw * 0.6
        ctx.stroke()
      }
      for (let i = -7; i <= 7; i++) {
        const x = i * 0.42
        if (x < v.x0 - 0.3 || x > v.x1 + 0.3) continue
        const sag = 0.2 * (1 - (x / 3.2) ** 2) - 0.05
        const sway = ring(m, 0.4, 0.4) * 0.04 * (i % 2 ? 1 : -1)
        const top = y0 + sag
        const c = colours[(i + 70) % colours.length]
        poly(pen, [[x - 0.15, top], [x + 0.15, top], [x + 0.15 + sway, top + 0.34], [x + 0.08 + sway, top + 0.3], [x + sway, top + 0.36], [x - 0.08 + sway, top + 0.3], [x - 0.15 + sway, top + 0.34]], c, 0.6)
        if (pen.lod === 0) poly(pen, [[x + sway * 0.5, top + 0.1], [x + 0.05 + sway * 0.5, top + 0.17], [x + sway * 0.5, top + 0.24], [x - 0.05 + sway * 0.5, top + 0.17]], HOTDOG.bun, 0)
      }
    }
    // The star piñata, on its rope, swinging.
    const sw = 0.18 * Math.sin(m.t * 2.1) + ring(m, 0.5, 0.5) * 0.12
    const px = 1.75
    const py = -2.4
    const len = 0.85
    const bx = px + Math.sin(sw) * len
    const by = py + Math.cos(sw) * len
    if (pen.lod <= 1) line(pen, px, py - 1, bx, by, pen.ink, pen.lw * 0.7)
    at(pen, bx, by, sw, 1, () => {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
        poly(pen, [[Math.cos(a - 0.3) * 0.2, Math.sin(a - 0.3) * 0.2], [Math.cos(a) * 0.46, Math.sin(a) * 0.46], [Math.cos(a + 0.3) * 0.2, Math.sin(a + 0.3) * 0.2]], i % 2 ? TEAL : HOTDOG.mustard, 0.7)
      }
      circle(pen, 0, 0, 0.24, PINK, 0.8)
      if (pen.lod <= 1) for (let i = 0; i < 3; i++) line(pen, -0.1 + i * 0.1, 0.22, -0.12 + i * 0.1 + 0.03 * Math.sin(m.t * 5 + i), 0.52, colours[i], 0.035)
    })
  },
  board(pen) {
    // The piñata stick, wound with tape.
    round(pen, -PL, -TH / 2, 2 * PL, TH, TH / 2, HOTDOG.mustard)
    if (pen.lod <= 1) for (let i = -4; i <= 4; i++) poly(pen, [[i * 0.24 - 0.04, -TH / 2], [i * 0.24 + 0.04, -TH / 2], [i * 0.24 + 0.08, TH / 2], [i * 0.24, TH / 2]], PINK, 0)
  },
  weight(pen) {
    // A wrapped sweet, twisted at both ends.
    const h = WEIGHT_H * 0.7
    poly(pen, [[-0.1, -h * 0.5], [-0.2, -h * 0.9], [-0.2, -h * 0.1]], TEAL, 0.7)
    poly(pen, [[0.1, -h * 0.5], [0.2, -h * 0.9], [0.2, -h * 0.1]], TEAL, 0.7)
    ellipse(pen, 0, -h * 0.5, 0.12, h * 0.42, PINK, 0.8)
  },
}

/* ------------------------------------------------------------------ karaoke night */

const karaoke: Skin = {
  key: 'karaoke',
  bg: PREMIERE.bg,
  ink: PREMIERE.ink,
  floor: STAR.wet,
  edge: STAR.brass,
  plank: HIBACHI.steel,
  fulcrum: HOTDOG.piano,
  back(pen, m, v) {
    const bx = 1.5
    const by = -1.62
    // Beams off the ball, turning, and flaring on the loud ones.
    const f = flashOf(m, 0.9, 0.18)
    const turn = m.t * 0.9
    for (let i = 0; i < 5; i++) {
      const a = turn + (i * Math.PI * 2) / 5
      const c = i % 2 ? TEAL : PINK
      beam(pen, bx, by, bx + Math.cos(a) * 3.2, by + Math.abs(Math.sin(a)) * 2.4 + 0.4, 0.05, 0.7, c, 0.22 + 0.4 * f)
    }
    if (pen.lod <= 1) line(pen, bx, v.y0 - 0.2, bx, by - 0.3, pen.ink, pen.lw * 0.8)
    // The mirror ball: squares of light and dark round its face.
    circle(pen, bx, by, 0.3, HIBACHI.steel)
    if (pen.lod <= 1) {
      const { ctx } = pen
      ctx.save()
      ctx.beginPath()
      ctx.arc(bx, by, 0.3, 0, Math.PI * 2)
      ctx.clip()
      const s = pen.lod === 0 ? 0.075 : 0.15
      for (let x = -0.3; x < 0.3; x += s) {
        for (let y = -0.3; y < 0.3; y += s) {
          const lit = hash(Math.round((x + turn * 0.4) / s), Math.round(y / s), 3)
          if (lit > 0.55) rect(pen, bx + x + 0.004, by + y + 0.004, s - 0.008, s - 0.008, lit > 0.85 ? STAR.flash : STAR.cream, 0)
        }
      }
      ctx.restore()
      circle(pen, bx, by, 0.3, null, 0.8)
    }
    glow(pen, bx, by, 0.6, STAR.flash, 0.15 + 0.5 * f)
    // A speaker at the edge of the stage.
    if (pen.lod <= 1) {
      rect(pen, -2.2, -1.0, 0.55, 1.0, HOTDOG.piano, 0.8)
      circle(pen, -1.925, -0.3, 0.17 * (1 + 0.08 * f), HIBACHI.steelDeep, 0.7)
      circle(pen, -1.925, -0.75, 0.09, HIBACHI.steelDeep, 0.7)
    }
  },
  weight(pen) {
    // A microphone.
    const h = WEIGHT_H
    poly(pen, [[-0.035, 0], [0.035, 0], [0.05, -h * 0.66], [-0.05, -h * 0.66]], HOTDOG.piano, 0.8)
    circle(pen, 0, -h * 0.78, 0.085, HIBACHI.steel, 0.8)
    if (pen.lod === 0) line(pen, -0.07, -h * 0.78, 0.07, -h * 0.78, HIBACHI.steelDeep, 0.012)
  },
}

/* ------------------------------------------------------------------ the IRS */

const irs: Skin = {
  key: 'irs',
  bg: ROCKS.sky,
  ink: LAUNDROMAT.ink,
  floor: HOME.steelDark,
  plank: HOME.butter,
  fulcrum: HOME.steel,
  back(pen, _m, v) {
    // A strip light, a filing cabinet on the left, and the auditor's desk on the right with her trophies on it.
    if (v.y0 < -2.4) round(pen, -1.0, -2.75, 2.0, 0.1, 0.05, HOME.light, 0.8)
    const cx = -2.0
    rect(pen, cx - 0.45, -1.85, 0.9, 1.85, HOME.steel)
    if (pen.lod <= 1) {
      for (let i = 1; i < 4; i++) line(pen, cx - 0.45, -1.85 + i * 0.4625, cx + 0.45, -1.85 + i * 0.4625, pen.ink, pen.lw * 0.8)
      for (let i = 0; i < 4; i++) rect(pen, cx - 0.12, -1.85 + i * 0.4625 + 0.16, 0.24, 0.05, HOME.steelDark, 0)
    }
    const dx = 2.0
    rect(pen, dx - 0.7, -0.72, 1.4, 0.08, HOME.wood)
    rect(pen, dx - 0.64, -0.64, 0.08, 0.64, HOME.wood, 0.8)
    rect(pen, dx + 0.56, -0.64, 0.08, 0.64, HOME.wood, 0.8)
    // Paper stacked up, and the trophies.
    rect(pen, dx + 0.1, -1.18, 0.42, 0.46, HOME.paper)
    if (pen.lod === 0) for (let i = 1; i < 5; i++) line(pen, dx + 0.1, -1.18 + i * 0.092, dx + 0.52, -1.18 + i * 0.092, HOME.steel, pen.lw * 0.7)
    for (let i = 0; i < 2; i++) {
      const tx = dx - 0.45 + i * 0.3
      const ty = -0.72
      const s = 0.8 + 0.25 * i
      at(pen, tx, ty, 0, s, () => trophy(pen))
    }
  },
  weight(pen) {
    trophy(pen)
  },
}

function trophy(pen: Pen): void {
  const h = WEIGHT_H
  rect(pen, -0.1, -0.06, 0.2, 0.06, HOME.steelDark, 0.7)
  rect(pen, -0.025, -h * 0.5, 0.05, h * 0.5 - 0.06, STAR.gold, 0.7)
  poly(pen, [[-0.13, -h], [0.13, -h], [0.09, -h * 0.62], [0.03, -h * 0.5], [-0.03, -h * 0.5], [-0.09, -h * 0.62]], STAR.gold, 0.8)
  if (pen.lod <= 1) {
    pen.ctx.beginPath()
    pen.ctx.arc(-0.13, -h * 0.82, 0.05, Math.PI * 0.5, Math.PI * 1.5)
    pen.ctx.moveTo(0.13, -h * 0.87)
    pen.ctx.arc(0.13, -h * 0.82, 0.05, -Math.PI * 0.5, Math.PI * 0.5)
    pen.ctx.strokeStyle = STAR.gold
    pen.ctx.lineWidth = 0.025
    pen.ctx.stroke()
  }
}

/* ------------------------------------------------------------------ a street corner, and its sign */

const spinner: Skin = {
  key: 'spinner',
  bg: HOME.glass,
  ink: LAUNDROMAT.ink,
  floor: HOME.steelDark,
  edge: HOME.steel,
  plank: HOME.wood,
  fulcrum: HIBACHI.flame,
  back(pen, m, v) {
    // A shopfront on the corner.
    rect(pen, v.x0 - 0.2, -2.6, -1.3 - v.x0 + 0.2, 2.6, HOME.wood)
    if (pen.lod <= 1) {
      rect(pen, -2.35, -1.55, 0.8, 1.0, HOME.glassDeep, 0.8)
      rect(pen, -2.4, -1.72, 0.9, 0.12, HOME.red, 0.7)
    }
    // The sign on its pole: an arrow that turns on the landings.
    const x = 1.8
    rect(pen, x - 0.03, -1.55, 0.06, 1.55, HOME.steelDark, 0.7)
    const turns = Math.floor((m.t - 0.2) / 0.8)
    const spin = m.since >= 0 && m.e ? Math.max(0, 1 - Math.exp(-m.since / 0.07) * Math.cos(m.since * 16)) : 1
    const a = (turns + spin) * Math.PI
    const sx = Math.cos(a)
    at(pen, x, -1.45, 0, 1, () => {
      pen.ctx.save()
      pen.ctx.scale(Math.abs(sx) < 0.08 ? 0.08 * Math.sign(sx || 1) : sx, 1)
      poly(pen, [[-0.55, -0.14], [0.25, -0.14], [0.25, -0.26], [0.6, 0], [0.25, 0.26], [0.25, 0.14], [-0.55, 0.14]], HOME.gold)
      if (pen.lod <= 1) poly(pen, [[-0.4, -0.05], [0.2, -0.05], [0.2, -0.12], [0.42, 0], [0.2, 0.12], [0.2, 0.05], [-0.4, 0.05]], HOME.red, 0)
      pen.ctx.restore()
    })
    // The kerb.
    if (pen.lod <= 1) rect(pen, v.x0 - 0.1, 0.18, v.x1 - v.x0 + 0.2, 0.05, HOME.steel, 0)
  },
  weight(pen) {
    // A traffic cone.
    const h = WEIGHT_H
    rect(pen, -0.14, -0.04, 0.28, 0.04, HIBACHI.flame, 0.7)
    poly(pen, [[-0.1, -0.04], [0.1, -0.04], [0.025, -h], [-0.025, -h]], HIBACHI.flame, 0.8)
    if (pen.lod <= 1) poly(pen, [[-0.065, -h * 0.35], [0.065, -h * 0.35], [0.05, -h * 0.55], [-0.05, -h * 0.55]], HOME.enamel, 0)
  },
}

/* ------------------------------------------------------------------ the alley, in the rain: in another life */

const alley: Skin = {
  key: 'alley',
  bg: STAR.wet,
  ink: PREMIERE.ink,
  floor: PREMIERE.bg,
  plank: STAR.rain,
  fulcrum: HIBACHI.steelDeep,
  back(pen, m, _v) {
    // Two neon signs on the wet brick: a heart and a lantern.
    const on = 0.75 + 0.25 * Math.sin(m.t * 23) * Math.sin(m.t * 3.1)
    const hx = -1.55
    const hy = -1.5
    glow(pen, hx, hy, 0.9, PINK, 0.4 * on)
    const heart: Pt[] = []
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2
      heart.push([hx + 0.3 * Math.pow(Math.sin(a), 3), hy - 0.24 * (0.8125 * Math.cos(a) - 0.3125 * Math.cos(2 * a) - 0.125 * Math.cos(3 * a) - 0.0625 * Math.cos(4 * a))])
    }
    poly(pen, heart, null, 0)
    pen.ctx.strokeStyle = PINK
    pen.ctx.lineWidth = pen.lod <= 1 ? 0.05 : 0.09
    pen.ctx.stroke()
    const lx = 1.7
    const ly = -1.3
    glow(pen, lx, ly, 0.7, TEAL, 0.35)
    ellipse(pen, lx, ly, 0.2, 0.26, null, 0)
    pen.ctx.strokeStyle = TEAL
    pen.ctx.stroke()
    if (pen.lod <= 1) line(pen, lx, ly - 0.26, lx, ly - 0.5, TEAL, 0.04)
  },
  front(pen, m, v) {
    if (pen.lod > 1) return
    // Rain, slanting, and falling on.
    const n = pen.lod === 0 ? 26 : 12
    for (let i = 0; i < n; i++) {
      const x = v.x0 + (v.x1 - v.x0 + 0.6) * hash(i, 4, 2)
      const sp = 5 + 2 * hash(i, 5, 2)
      const y = v.y0 + ((m.t * sp + hash(i, 6, 2) * 9) % (v.y1 - v.y0 + 0.4))
      line(pen, x - y * 0.18, y, x - y * 0.18 - 0.05, y + 0.26, STAR.rain, pen.lw * 0.8)
    }
  },
  weight(pen) {
    // An umbrella, open, on its hook.
    const h = WEIGHT_H
    pen.ctx.beginPath()
    pen.ctx.moveTo(-0.2, -h * 0.55)
    pen.ctx.quadraticCurveTo(0, -h * 1.15, 0.2, -h * 0.55)
    pen.ctx.lineTo(0.1, -h * 0.6)
    pen.ctx.lineTo(0, -h * 0.55)
    pen.ctx.lineTo(-0.1, -h * 0.6)
    pen.ctx.closePath()
    pen.ctx.fillStyle = PINK
    pen.ctx.fill()
    if (pen.lod <= 1) {
      pen.ctx.strokeStyle = pen.ink
      pen.ctx.lineWidth = pen.lw * 0.8
      pen.ctx.stroke()
    }
    line(pen, 0, -h * 0.55, 0, -0.06, pen.ink, 0.025)
    pen.ctx.beginPath()
    pen.ctx.arc(0.04, -0.06, 0.04, Math.PI, 0, true)
    pen.ctx.stroke()
  },
}

/* ------------------------------------------------------------------ the new year */

const newyear: Skin = {
  key: 'newyear',
  bg: HOME.night,
  ink: PREMIERE.ink,
  floor: DOJO.woodDeep,
  edge: HOME.gold,
  plank: HOME.red,
  fulcrum: HOME.gold,
  back(pen, m, v) {
    // Two paper lanterns hung high either side, lit, swinging when the floor is struck; the line they hang from.
    const { ctx } = pen
    const y0 = -2.25
    if (pen.lod <= 1) {
      ctx.beginPath()
      ctx.moveTo(v.x0 - 0.2, y0)
      ctx.quadraticCurveTo(0, y0 + 0.3, v.x1 + 0.2, y0)
      ctx.strokeStyle = HOME.gold
      ctx.lineWidth = pen.lw
      ctx.stroke()
    }
    for (const x of [-1.95, 1.95]) {
      const sw = ring(m, 0.6, 0.6) * 0.1 * Math.sign(x) + 0.04 * Math.sin(m.t * 1.7 + x)
      const top = y0 + 0.3 * (1 - (x / 3.2) ** 2) - 0.03
      const ly = top + 0.52
      const lx = x + Math.sin(sw) * 0.5
      glow(pen, lx, ly, 0.9, HOME.gold, 0.3)
      if (pen.lod <= 1) line(pen, x, top, lx, ly - 0.3, HOME.gold, pen.lw)
      at(pen, lx, ly, sw, 1, () => {
        ellipse(pen, 0, 0, 0.3, 0.27, HOME.red, 0.8)
        if (pen.lod <= 1) {
          for (const f of [0.45, 0.8]) {
            ctx.beginPath()
            ctx.ellipse(0, 0, 0.3 * f, 0.27, 0, 0, Math.PI * 2)
            ctx.strokeStyle = mix(HOME.red, HOME.gold, 0.55)
            ctx.lineWidth = pen.lw * 0.8
            ctx.stroke()
          }
        }
        rect(pen, -0.13, -0.33, 0.26, 0.08, HOME.gold, 0.6)
        rect(pen, -0.13, 0.25, 0.26, 0.08, HOME.gold, 0.6)
        if (pen.lod <= 1) for (const tx of [-0.05, 0, 0.05]) line(pen, tx, 0.33, tx + sw * 0.2, 0.58, HOME.gold, 0.025)
      })
    }
  },
  weight(pen) {
    // A red envelope, sealed with gold.
    const h = WEIGHT_H * 0.85
    rect(pen, -0.12, -h, 0.24, h, HOME.red)
    if (pen.lod <= 1) {
      poly(pen, [[-0.12, -h], [0.12, -h], [0, -h * 0.7]], mix(HOME.red, HOME.night, 0.25), 0.6)
      circle(pen, 0, -h * 0.7, 0.035, HOME.gold, 0)
    }
  },
}

/* ------------------------------------------------------------------ the table */

const FILM = { home, premiere, dojo, hotdog, hibachi, void: dark, rocks, pinata, karaoke, irs, spinner, alley, newyear }
const NEW_FILM = { ...MONTAGE_SKINS, ...FLASH_SKINS, ...VERSE_SKINS }
const NEW_ODD = [SHOP_SKINS, PLAY_SKINS, WILD_SKINS, SKY_SKINS, PAST_SKINS, TOY_SKINS] as Record<string, Skin>[]
export const SKINS: Record<string, Skin> & typeof FILM = { ...FILM, ...FILM_SKINS, ...FAR_SKINS, ...ODD_SKINS, ...NEW_FILM, ...Object.assign({}, ...NEW_ODD) }

/**
 * One wall of worlds, which only grows. The wall splits 2, 4, 9, 16, 36, 64 and 144 (`STEPS` in `mosaic.ts`), each grid
 * holding the last, home at (0, 0); every panel keeps its world and its place in the wall through every break, and a
 * break only deals new worlds into the cells it adds round the old. The film's own lives come first, while the panels
 * are big (the premiere at two; the dojo and the hot dogs at four; the kitchen and the rest of her jumps at nine and
 * sixteen; the lives from the film's montage from sixteen to sixty-four), then the lives she might have had. At 144
 * every world is there once, all at once.
 */
const FIRST_SEEN: string[][] = [
  ['premiere'],
  ['dojo', 'hotdog', 'hibachi'],
  ['void', 'rocks', 'pinata', 'karaoke', 'irs', 'spinner', 'alley', 'newyear'],
  ['opera', 'monolith', 'alpha', 'pug', 'lobby', 'trophy', 'pinky', 'elvis', 'bagel', 'googly', 'temple', 'riot', 'arrest', 'rainbow', 'spotlight'],
]
/** The grids, as `mosaic.ts` lays them: the panels each one shows, home at (0, 0). Each holds the one before it. */
export const SCREENS: { i0: number; i1: number; j0: number; j1: number }[] = [
  { i0: 0, i1: 1, j0: 0, j1: 0 },
  { i0: 0, i1: 1, j0: 0, j1: 1 },
  { i0: -1, i1: 1, j0: -1, j1: 1 },
  { i0: -1, i1: 2, j0: -1, j1: 2 },
  { i0: -2, i1: 3, j0: -2, j1: 3 },
  { i0: -3, i1: 4, j0: -3, j1: 4 },
  { i0: -5, i1: 6, j0: -5, j1: 6 },
]
/** The cells screen `s` adds to the wall, nearest home first. */
const addedBy = (s: number): [number, number][] => {
  const g = SCREENS[s]
  const was = SCREENS[s - 1]
  const out: [number, number][] = []
  for (let j = g.j0; j <= g.j1; j++) {
    for (let i = g.i0; i <= g.i1; i++) {
      const old = was ? i >= was.i0 && i <= was.i1 && j >= was.j0 && j <= was.j1 : i === 0 && j === 0
      if (!old) out.push([i, j])
    }
  }
  return out.sort((a, b) => Math.hypot(a[0] - 0.3, a[1] - 0.3) - Math.hypot(b[0] - 0.3, b[1] - 0.3) || hash(a[0], a[1], 3) - hash(b[0], b[1], 3))
}

/** How unlike two worlds look at a glance: their paper and their floor. */
function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const unlike = (a: Skin, b: Skin): number => {
  const d = (x: string, y: string) => {
    const p = rgbOf(x)
    const q = rgbOf(y)
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
  }
  return d(a.bg, b.bg) + 0.5 * d(a.floor, b.floor)
}

const WALL: Map<string, string> = (() => {
  // The pool, in the order the breaks take it: the film's lives (by hand for the first few, then the rest), then the
  // made-up lives, the new ones dealt round their groups so a break gets a mix.
  const order: string[] = FIRST_SEEN.flat()
  const add = (k: string) => {
    if (!order.includes(k) && k !== 'home') order.push(k)
  }
  for (const k of Object.keys(NEW_FILM)) add(k)
  for (const k of Object.keys(FILM_SKINS)) add(k)
  for (const k of [...Object.keys(FAR_SKINS), ...Object.keys(ODD_SKINS)]) add(k)
  const groups = NEW_ODD.map((g) => Object.keys(g))
  for (let n = 0; groups.some((g) => n < g.length); n++) for (const g of groups) if (n < g.length) add(g[n])
  const all = order.filter((k) => SKINS[k])

  const at = new Map<string, string>([['0,0', 'home']])
  let next = 0
  for (let s = 0; s < SCREENS.length; s++) {
    const cells = addedBy(s)
    // Each break takes the next of the pool, as many as it adds cells; the last takes every world left.
    const pool = s === SCREENS.length - 1 ? all.slice(next) : all.slice(next, next + cells.length)
    next += pool.length
    const rank = new Map(pool.map((k, n) => [k, n]))
    for (const [i, j] of cells) {
      let best = -1
      let score = -Infinity
      for (let n = 0; n < pool.length; n++) {
        // Unlike its neighbours already laid, old and new, and the earlier in the pool the nearer home.
        let near = Infinity
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const v = at.get(`${i + di},${j + dj}`)
          if (v) near = Math.min(near, unlike(SKINS[pool[n]], SKINS[v]) * (di && dj ? 1.3 : 1))
        }
        const sc = Math.min(near, 260) - 1.6 * (rank.get(pool[n]) ?? 0)
        if (sc > score) {
          score = sc
          best = n
        }
      }
      if (best < 0) break
      at.set(`${i},${j}`, pool[best])
      pool.splice(best, 1)
    }
  }
  return at
})()

/**
 * The world of panel (i, j) of the wall, whichever screen it is on (home at 0, 0). Past the wall's last grid (a wider
 * stage, the slide before the dive), the wall goes on as itself again, so no world is ever beside itself.
 */
export function skinAt(i: number, j: number): Skin {
  const g = SCREENS[SCREENS.length - 1]
  const wrap = (v: number, lo: number, hi: number) => ((((v - lo) % (hi - lo + 1)) + (hi - lo + 1)) % (hi - lo + 1)) + lo
  return SKINS[WALL.get(`${wrap(i, g.i0, g.i1)},${wrap(j, g.j0, g.j1)}`) ?? 'home']
}
