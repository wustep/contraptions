import { zigLoop, type PieceDef, type World } from './world'

/**
 * Mill. A shaft train unlatches a ball onto a paddle, and a carved loop
 * with a bucket lift keeps three balls in the air on the same beat.
 */
export const mill: PieceDef = {
  name: 'mill',
  label: 'Mill',
  story:
    'A windmill turns a cam that trips a latch; the released ball falls through a paddle into a cup, while circulating balls knock a counter and a wired drip sends the elevator up.',
  theme: 'terracotta',
  res: 9,
  stroke: 1.05,
  place: (w: World) => {
    const C = w.palette

    w.track(zigLoop(0, 0, 4, 8), {
      balls: 3,
      m: 3,
      color: C[0],
      variants: {
        '2,0': 'conveyor',
        '3,0': 'gate',
        '2,4': 'conveyor',
        '3,8': 'gate',
      },
      reactors: [
        { name: 'react-ratchet', col: 2, row: 1, face: 'N', color: C[4] },
        { name: 'react-flag', col: 2, row: 3, face: 'S', color: C[1] },
        { name: 'react-pinwheel', col: 3, row: 5, face: 'E', color: C[3] },
        { name: 'react-lamp', col: 2, row: 7, face: 'S', color: C[0] },
        { name: 'react-bell', col: 3, row: 7, face: 'S', color: C[2] },
        { name: 'react-dominoes', col: 3, row: 1, face: 'E', color: C[3] },
      ],
    })

    w.ports(
      {
        name: 'windmill',
        col: 5,
        row: 0,
        color: C[3],
        kids: [
          {
            name: 'gear',
            col: 6,
            row: 0,
            color: C[2],
            kids: [
              {
                name: 'cam',
                col: 7,
                row: 0,
                color: C[4],
                kids: [
                  {
                    name: 'latch',
                    col: 8,
                    row: 0,
                    color: C[0],
                    ball: C[0],
                    kids: [
                      {
                        name: 'fall',
                        col: 8,
                        row: 1,
                        kids: [
                          {
                            name: 'fall',
                            col: 8,
                            row: 2,
                            kids: [
                              {
                                name: 'landing',
                                col: 8,
                                row: 3,
                                kids: [
                                  {
                                    name: 'conveyor',
                                    col: 7,
                                    row: 3,
                                    color: C[1],
                                    kids: [
                                      {
                                        name: 'dropoff',
                                        col: 6,
                                        row: 3,
                                        kids: [
                                          {
                                            name: 'paddle',
                                            col: 6,
                                            row: 4,
                                            color: C[3],
                                            kids: [
                                              {
                                                name: 'cam',
                                                col: 7,
                                                row: 4,
                                                color: C[4],
                                                kids: [{ name: 'bell', col: 8, row: 4, color: C[0] }],
                                              },
                                              {
                                                name: 'landing',
                                                col: 6,
                                                row: 5,
                                                kids: [
                                                  {
                                                    name: 'cup',
                                                    col: 7,
                                                    row: 5,
                                                    color: C[2],
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

    w.classic('pendulum-wave', 5, 2, { color: C[1] })
    w.classic('metronome', 5, 1, { color: C[4] })
    w.classic('piston', 8, 5, { color: C[3] })

    w.wire(
      [
        w.classic('drip', 5, 6, { color: C[0] }),
        w.classic('gear', 6, 6, { color: C[2] }),
        w.classic('elevator', 7, 6, { color: C[1] }),
        w.classic('gate', 8, 6, { color: C[4] }),
      ],
      0,
    )

    w.classic('belt-drive', 6, 7, { color: C[3] })
    w.classic('pendulum', 5, 7, { color: C[2] })
    w.classic('seesaw', 8, 7, { color: C[1] })
    w.classic('spring', 5, 8, { color: C[0] })
    w.classic('ratchet', 8, 8, { color: C[4] })

    w.fill('spring', { cols: [5, 8] })
  },
}
