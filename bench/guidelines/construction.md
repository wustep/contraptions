# Piece and world construction rules

- Coordinates are cells, west to east, y downward. Entry ball center is [-0.5,0].
  A cell centered at [x,y] occupies x±0.5 and y±0.5. Ball radius and rail FLOOR
  are 0.13; the resting ball center is y=0, so the rail is at y=0.13.
- Claim occupied cells, including [0,0], with no duplicates. The benchmark caps
  each piece at six cells; the format additionally caps the row span (including
  exit) at five. Claim space used by motion and flights. Avoid gratuitous bulk.
- Each lane step starts at the previous endpoint. `wait` stays there. End at
  [exit.at[0] - 0.5 * exit.dir, exit.at[1]]. The exit cell is not occupied by the
  piece. `dir` is 1 or -1. Design for mirrored placement too.
- Use one fire step (or the first step fires by default). `t` is time since entry;
  `since` is time since fire, and may be negative. Motion should look armed
  before arrival, react to contact, then settle. Never draw a second ball.
- A moving carrier should track the ball using `follow` with lane step indices.
  Use hidden steps only for a plausible enclosure, never to hide a discontinuity.
  A flight needs visible launch and landing causes. Ball paint needs a visible
  source and a matching paint time. Purely decorative mechanisms are insufficient.
- Shapes use role colors: color, accent, paint, paper, ink. The compiler chooses
  fills different from the arriving ball. Use silhouette and ink to maintain
  readability; no raster images, HTML, scripts, or remote assets.
- Each WorldSpec includes 1–4 themes, a legal backdrop list, a stock rail host
  (workshop/garden/harbor/arcade), and empty borrow. Rail and portal infrastructure
  is supplied automatically and does not count toward your ten pieces.
- A theme has a slug name, short label, #RRGGBB bg and ink, and exactly five
  #RRGGBB colors. Ink must contrast with paper. Use your own palette.
- Maximums inherited from the format: 40 lane steps, 80 total shapes, group depth
  3, coordinate reach ±8, lane time 7 seconds. Consult build-spec.ts for exact
  field ranges, op variants, motion options, and validation semantics.

Chain clarity is more than positional continuity: the picture should explain the
transfer of motion. Schema gates establish local lane contracts, not physical
simulation, collision freedom over all frames, or a guaranteed planner layout.
