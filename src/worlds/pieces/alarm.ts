import { boxLoop, type PieceDef, type World } from './world'

/**
 * Alarm. A converter chain and a circulating loop share a 4-second beat;
 * the wired hammer is the strike you hear.
 */
export const alarm: PieceDef = {
  name: 'alarm',
  label: 'Alarm',
  story:
    'A hopper drops a ball through a paddle wheel; the wheel\'s cam unlatches a second ball into a cup, and a circulating ball knocks a flag as a wired hammer rings the bell.',
  theme: 'noir',
  res: 8,
  stroke: 1.15,
  place: (w: World) => {
    const C = w.palette

    w.track(boxLoop(0, 0, 7, 7), {
      balls: 3,
      m: 3,
      color: C[0],
      variants: {
        '3,0': 'gate',
        '5,0': 'conveyor',
        '2,7': 'conveyor',
        '5,7': 'conveyor',
      },
      reactors: [
        { name: 'react-ratchet', col: 3, row: 1, face: 'N', color: C[4] },
        { name: 'react-lamp', col: 1, row: 6, face: 'S', color: C[0] },
        { name: 'react-flag', col: 2, row: 6, face: 'S', color: C[1] },
        { name: 'react-bell', col: 5, row: 6, face: 'S', color: C[0] },
        { name: 'react-pinwheel', col: 6, row: 2, face: 'E', color: C[3] },
        { name: 'react-dominoes', col: 6, row: 4, face: 'E', color: C[2] },
      ],
    })

    w.ports(
      {
        name: 'hopper',
        col: 1,
        row: 1,
        color: C[0],
        ball: C[0],
        kids: [
          {
            name: 'fall',
            col: 1,
            row: 2,
            kids: [
              {
                name: 'paddle',
                col: 1,
                row: 3,
                color: C[3],
                kids: [
                  {
                    name: 'fall',
                    col: 1,
                    row: 4,
                    kids: [
                      {
                        name: 'landing',
                        col: 1,
                        row: 5,
                        kids: [
                          {
                            name: 'conveyor',
                            col: 2,
                            row: 5,
                            color: C[2],
                            kids: [{ name: 'cup', col: 3, row: 5, color: C[4] }],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'gear',
                    col: 2,
                    row: 3,
                    color: C[2],
                    kids: [
                      {
                        name: 'cam',
                        col: 3,
                        row: 3,
                        color: C[3],
                        kids: [
                          {
                            name: 'latch',
                            col: 4,
                            row: 3,
                            color: C[1],
                            ball: C[1],
                            kids: [
                              {
                                name: 'fall',
                                col: 4,
                                row: 4,
                                kids: [
                                  {
                                    name: 'landing',
                                    col: 4,
                                    row: 5,
                                    kids: [{ name: 'cup', col: 5, row: 5, color: C[4] }],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { arrive: 0, ball: C[0] },
    )

    w.wire(
      [
        w.classic('hammer', 4, 1, { color: C[0] }),
        w.classic('gear', 5, 1, { color: C[3] }),
        w.classic('lamp', 5, 2, { color: C[4] }),
        w.classic('bell', 5, 3, { color: C[0] }),
      ],
      24,
    )

    w.classic('drip', 3, 2, { color: C[0] })
    w.classic('metronome', 2, 2, { color: C[1] })
    w.classic('pendulum', 2, 4, { color: C[2] })
    w.classic('elevator', 3, 4, { color: C[3] })
    w.classic('gate', 4, 2, { color: C[4] })
    w.classic('seesaw', 5, 4, { color: C[1] })
    w.classic('piston', 3, 6, { color: C[3] })
    w.classic('traffic', 4, 6, { color: C[2] })

    w.fill('gear')
  },
}
