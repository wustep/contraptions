import { BAR, EMAJOR, RETURN } from './music'
import { smooth } from './look'

/** How gold the tower is lit at `t`: E major comes up over its first two bars and goes as C returns. */
export const gilt = (t: number): number => smooth(t, EMAJOR, EMAJOR + 2 * BAR) * (1 - smooth(t, RETURN, RETURN + BAR))
