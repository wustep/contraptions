import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInQuad, lerp, seg } from '../../core/ease'
import { P, flight, ground, knob, knock, performer, rings, since, stroke } from './circus'

/**
 * The fuse burns down to the breech, the cannon throws the acrobat across
 * the ring into the net, the net catches and tips them onto the ramp, and
 * they roll back along the floor into the cannon for the next shot.
 */
const BREECH: [number, number] = [-0.8, 0.28]
const AIM = -0.72
const BARREL = 0.5
const BORE = 0.19
const WHEEL: [number, number] = [-0.7, 0.35]
const MUZZLE: [number, number] = [BREECH[0] + BARREL * Math.cos(AIM), BREECH[1] + BARREL * Math.sin(AIM)]
const EXIT: [number, number] = [MUZZLE[0] + 0.1 * Math.cos(AIM), MUZZLE[1] + 0.1 * Math.sin(AIM)]
const NET_L: [number, number] = [0.38, 0.1]
const NET_R: [number, number] = [0.9, -0.14]
const NET_C: [number, number] = [0.62, 0.5]
const CATCH: [number, number] = [0.63, 0.13]
const FUSE: [number, number][] = [
  [-0.86, 0.22],
  [-0.95, 0.12],
  [-0.9, -0.02],
  [-0.96, -0.18],
]
const LIT = 0.12
const SHOT = 0.6
/** When the acrobat is back in the breech and the new fuse is in. */
const RELOAD = 0.97

/** A point on the net, a quadratic between the posts, sagging more under load. */
const net = (t: number, load: number): [number, number] => {
  const cy = NET_C[1] + 0.18 * load
  return [
    (1 - t) * (1 - t) * NET_L[0] + 2 * t * (1 - t) * NET_C[0] + t * t * NET_R[0],
    (1 - t) * (1 - t) * NET_L[1] + 2 * t * (1 - t) * cy + t * t * NET_R[1],
  ]
}

export const cannon = defineContraption({
  name: 'cannon',
  label: 'Cannon',
  tags: ['aerial', 'loop'],
  role: 'source',
  span: [2, 1],
  rotations: [0],
  fireAt: SHOT,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const recoil = 0.06 * knock(u, SHOT, 0.03, 0.22)
    const load = u >= 0.78 && u < 0.86 ? Math.sin(seg(u, 0.78, 0.86) * Math.PI) : 0
    const burn = seg(u, LIT, SHOT)

    // The acrobat: shot, caught, tipped onto the ramp, rolled home. The arc's
    // apex has to clear the roof of the footprint by a whole acrobat.
    let pos: [number, number] | null = null
    if (u >= SHOT && u < 0.78) pos = flight(EXIT, CATCH, 0.28, seg(u, SHOT, 0.78))
    else if (u < 0.86 && u >= 0.78) pos = [CATCH[0], CATCH[1] + 0.09 * load]
    else if (u >= 0.86 && u < 0.92) pos = flight(CATCH, [NET_L[0] - 0.03, NET_L[1] - P / 2], 0.04, seg(u, 0.86, 0.92))
    else if (u >= 0.92 && u < 0.97) pos = [lerp(NET_L[0] - 0.03, 0.08, seg(u, 0.92, 0.97)), lerp(NET_L[1] - P / 2, 0.5 - P / 2, easeInQuad(seg(u, 0.92, 0.97)))]
    else if (u >= 0.97 || u < LIT) pos = [lerp(0.08, WHEEL[0], since(u, 0.97) / (LIT + 0.03)), 0.5 - P / 2]

    outline(p, ink, weight)
    ground(p, k, 2)
    // The ramp down from the net's near post.
    stroke(p, k, NET_L[0], NET_L[1], 0.08, 0.5)
    stroke(p, k, NET_L[0], 0.5, NET_L[0], NET_L[1])
    stroke(p, k, NET_R[0], 0.5, NET_R[0], NET_R[1])
    p.beginShape()
    p.vertex(NET_L[0] * k, NET_L[1] * k)
    p.quadraticVertex(NET_C[0] * k, (NET_C[1] + 0.18 * load) * k, NET_R[0] * k, NET_R[1] * k)
    p.endShape()
    for (const t of [0.2, 0.4, 0.6, 0.8]) {
      const [x, y] = net(t, load)
      stroke(p, k, x, y, x, y + 0.06)
    }

    // The acrobat goes under the cannon on the way home, so it goes first.
    if (pos) performer(p, k, ink, weight, s.color, pos[0], pos[1])

    // The fuse. It burns down to the breech, and while the acrobat rolls
    // home the crew feed a new one in at the same rate, so the length is
    // continuous all the way round the loop instead of popping back.
    {
      const n = FUSE.length - 1
      const lit = u >= LIT && u < SHOT
      const at = n * (lit ? 1 - burn : u >= SHOT ? seg(u, SHOT, RELOAD) : 1)
      const i = Math.min(n - 1, Math.floor(at))
      const f = at - i
      const tip: [number, number] = [lerp(FUSE[i][0], FUSE[i + 1][0], f), lerp(FUSE[i][1], FUSE[i + 1][1], f)]
      outline(p, ink, weight)
      p.beginShape()
      p.vertex(FUSE[0][0] * k, FUSE[0][1] * k)
      for (let j = 1; j <= i; j++) p.vertex(FUSE[j][0] * k, FUSE[j][1] * k)
      p.vertex(tip[0] * k, tip[1] * k)
      p.endShape()
      if (lit) knob(p, k, ink, weight, s.color, tip[0], tip[1], 0.07 + 0.02 * Math.sin(u * 200))
    }

    rings(p, k, s.color, weight, MUZZLE[0], MUZZLE[1], 0.12, knock(u, SHOT, 0.02, 0.16), AIM, 2)

    // The barrel on its wheel, kicked back along its own line by the shot.
    p.push()
    p.translate((BREECH[0] - recoil * Math.cos(AIM)) * k, (BREECH[1] - recoil * Math.sin(AIM)) * k)
    p.rotate(AIM)
    solid(p, ink, weight, s.color)
    p.rect((BARREL / 2) * k, 0, BARREL * k, BORE * k)
    p.rect(0, 0, 0.12 * k, (BORE + 0.08) * k)
    p.pop()
    p.push()
    p.translate((WHEEL[0] - recoil * Math.cos(AIM)) * k, WHEEL[1] * k)
    p.rotate(-recoil * 8)
    solid(p, ink, weight, s.color)
    p.circle(0, 0, 0.3 * k)
    outline(p, ink, weight)
    p.line(-0.15 * k, 0, 0.15 * k, 0)
    p.line(0, -0.15 * k, 0, 0.15 * k)
    p.pop()
  },
})
