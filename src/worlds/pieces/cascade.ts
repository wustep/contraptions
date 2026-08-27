import { boxLoop, type PieceDef, type World } from './world'

/**
 * Cascade. Gravity does the long work: a tall drop, a converter into a bell,
 * and a wide loop of balls knocking flags along the floor.
 */
export const cascade: PieceDef = {
  name: 'cascade',
  label: 'Cascade',
  story:
    'A hopper at the top falls through tubes onto a paddle whose cam topples dominoes into a bell, and a lower loop of circulating balls knocks the flags home.',
  theme: 'lagoon',
  res: 10,
  stroke: 1,
  place: (w: World) => {
    const C = w.palette

    w.track(boxLoop(0, 6, 9, 9), {
      balls: 2,
      m: 6,
      color: C[0],
      variants: {
        '3,6': 'gate',
        '6,6': 'conveyor',
        '2,9': 'conveyor',
        '7,9': 'gate',
      },
      reactors: [
        { name: 'react-ratchet', col: 2, row: 7, face: 'N', color: C[4] },
        { name: 'react-pinwheel', col: 8, row: 7, face: 'E', color: C[3] },
        { name: 'react-flag', col: 1, row: 8, face: 'S', color: C[1] },
        { name: 'react-lamp', col: 3, row: 8, face: 'S', color: C[0] },
        { name: 'react-flag', col: 5, row: 8, face: 'S', color: C[2] },
        { name: 'react-bell', col: 7, row: 8, face: 'S', color: C[0] },
      ],
    })

    w.classic('marble-run', 0, 0, { color: C[1] })

    w.ports(
      {
        name: 'hopper',
        col: 2,
        row: 0,
        color: C[0],
        ball: C[0],
        kids: [
          {
            name: 'fall',
            col: 2,
            row: 1,
            kids: [
              {
                name: 'fall',
                col: 2,
                row: 2,
                kids: [
                  {
                    name: 'fall',
                    col: 2,
                    row: 3,
                    kids: [
                      {
                        name: 'paddle',
                        col: 2,
                        row: 4,
                        color: C[3],
                        kids: [
                          {
                            name: 'gear',
                            col: 3,
                            row: 4,
                            color: C[2],
                            kids: [
                              {
                                name: 'cam',
                                col: 4,
                                row: 4,
                                color: C[4],
                                kids: [
                                  {
                                    name: 'dominoes',
                                    col: 5,
                                    row: 4,
                                    color: C[1],
                                    kids: [{ name: 'bell', col: 6, row: 4, color: C[0] }],
                                  },
                                ],
                              },
                            ],
                          },
                          {
                            name: 'landing',
                            col: 2,
                            row: 5,
                            kids: [
                              {
                                name: 'conveyor',
                                col: 3,
                                row: 5,
                                color: C[2],
                                kids: [{ name: 'cup', col: 4, row: 5, color: C[4] }],
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

    w.ports(
      {
        name: 'hopper',
        col: 8,
        row: 0,
        color: C[2],
        ball: C[2],
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
                        color: C[3],
                        kids: [{ name: 'cup', col: 6, row: 3, color: C[4] }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { arrive: 80, ball: C[2] },
    )

    w.wire(
      [
        w.classic('hammer', 4, 0, { color: C[0] }),
        w.classic('gear', 5, 0, { color: C[3] }),
        w.classic('lamp', 6, 0, { color: C[1] }),
        w.classic('gate', 7, 0, { color: C[4] }),
      ],
      0,
    )

    w.classic('drip', 4, 1, { color: C[0] })
    w.classic('pendulum', 5, 1, { color: C[2] })
    w.classic('elevator', 6, 1, { color: C[1] })
    w.classic('metronome', 7, 1, { color: C[4] })
    w.classic('seesaw', 4, 2, { color: C[3] })
    w.classic('spring', 5, 2, { color: C[0] })
    w.classic('piston', 6, 2, { color: C[2] })
    w.classic('slope-ball', 7, 2, { color: C[1] })
    w.classic('newtons-cradle', 0, 3, { color: C[4] })
    w.classic('belt-drive', 0, 5, { color: C[3] })
    w.classic('gantry', 8, 4, { color: C[1] })

    w.fill('slope-ball', { rows: [0, 5] })
  },
}
