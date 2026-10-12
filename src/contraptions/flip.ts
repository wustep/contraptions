import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { easeInOutSine, mod } from '../core/ease'

/** A card turning on its axis, showing a different face each half-turn. */
export const flip = defineContraption({
  name: 'flip',
  label: 'Flip',
  tags: ['square', 'turn'],
  period: 120,
  mirror: false,
  setup: ({ color, rng, theme }) => ({
    color,
    back: rng.pick(theme.colors.filter((c) => c !== color)) ?? color,
    dir: rng.sign(),
  }),
  draw: (p, s, { size, u, ink, weight }) => {
    const card = size * 0.62
    const phase = mod(u * s.dir, 1)
    const turn = easeInOutSine(phase < 0.5 ? phase * 2 : (phase - 0.5) * 2)
    // The face changes while the card is edge-on (a quarter of the way into
    // each half-turn), never while it is square to us. Switching at the half
    // (as this did) swapped the colour on a card at full width.
    const face = phase >= 0.25 && phase < 0.75 ? s.back : s.color
    const w = Math.abs(Math.cos(turn * Math.PI)) * card

    outline(p, ink, weight)
    p.rect(0, 0, size * 0.86, size * 0.86)
    p.line(0, -size / 2, 0, -card / 2)
    p.line(0, size / 2, 0, card / 2)

    solid(p, ink, weight, face)
    p.rect(0, 0, Math.max(weight * 1.5, w), card)
  },
})
