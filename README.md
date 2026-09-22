# contraptions

Tiny animated machines. The front door is a Rube Goldberg chain that never
ends: one ball, one thread, four worlds. Beside it, a generator that
scatters a grid of looping mechanisms — each cell a small, self-contained
machine that loops forever, and the piece is whatever falls out of
scattering a few hundred of them across a grid.

**[Machine →](https://contraptions-wustep.vercel.app/)** ·
**[Explorations →](https://contraptions-wustep.vercel.app/explorations/)** ·
**[Shows →](https://contraptions-wustep.vercel.app/shows/)**

## What it is

Two public modes of one thing live here.

**Machine** is one ball on one thread through a Rube Goldberg chain that
never ends. The camera follows the ball. Every portal is a door to a
whole new map: a new palette, a new taste in pieces, a new place.

**Explorations** is the generator that Machine grew out of. Grids of tiny
looping machines, every dial exposed. Heavily inspired by
[Okazz](https://x.com/okazz_/status/2090999902805393607).

Two more modes wear the same chrome: **Shows** and **Playground**. The
**Builder** is in the repo but hidden for now — it is not ready.

## Run it

```bash
npm install
npm run dev
npm run build
```

`npm run dev` serves Machine at [http://localhost:8791/](http://localhost:8791/).
Explorations is at `/explorations/`. Shows and Playground are at
`/shows/` and `/playground/`.

`npm run build` writes one `dist/` with the same paths. Needs Node 22.
One Vite root serves every mode. `BASE=/contraptions/ npm run build`
mounts that site under `/contraptions/` — assets, the mode switch, and
the old forwards — for a host that is not the whole domain.

Old links still work: `/sandbox/` forwards to Explorations, `/rube/`
forwards to Machine, both keeping the seed.

## Modes

The switch at the top of the panel moves between them and carries the
seed across.

**Machine** goes around Regular, Forest, Aqua and Arcade in a fixed
order. Each world is a place with its own pieces and palettes, not a
colour swap. The seed decides what you see inside a visit; the order of
worlds does not change.

**Explorations** has six modes of tiny machines on a grid. Every control
is in the URL, so any frame you like is a shareable link.

**Shows** is Machine set to music. A machine choreographed to a piece,
the soundtrack locked to the picture, as many takes as you care to keep
side by side.

**Playground** is where pieces and worlds wait to be let into Machine:
new ones, ones a craft pass took out, and worlds that are not in the
loop yet. You can watch them the way Machine would show them.

## More

The long notes live in [`docs/`](docs/) and [`docs/promo/`](docs/promo/).
That is the place for show plans, arrangement notes, review status, and
the Playground's rejected log — not this file.

## License

Released under the [MIT License](LICENSE). Copyright Stephen Wu, 2026.
See `LICENSE` for the full text.
