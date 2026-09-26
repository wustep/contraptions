/**
 * Every strike of Married Life, part by part, in show seconds: what `check:shows` holds against the measured music
 * (`scripts/shows/plans/married-life-onsets.json`). A part that strikes exports its list; this only gathers them.
 */
import { WEDDING_HITS } from './church/wedding'
import { FUNERAL_HITS } from './church/funeral'
import { FIXUP_HITS } from './house/fixup'
import { ALONE_HITS } from './house/alone'
import { CLOUDS_HITS } from './hill/clouds'
import { CLIMB_HITS } from './hill/climb'
import { DOCTOR_HITS } from './clinic/doctor'
import { HOSPITAL_HITS } from './clinic/hospital'
import { NURSERY_HITS } from './inside/nursery'
import { YARD_HITS } from './inside/yard'
import { JAR_HITS } from './inside/jar'
import { TIES_HITS } from './inside/ties'

export const STRIKES: Record<string, number[]> = {
  wedding: WEDDING_HITS,
  fixup: FIXUP_HITS,
  clouds: CLOUDS_HITS,
  nursery: NURSERY_HITS,
  doctor: DOCTOR_HITS,
  yard: YARD_HITS,
  jar: JAR_HITS,
  ties: TIES_HITS,
  climb: CLIMB_HITS,
  hospital: HOSPITAL_HITS,
  funeral: FUNERAL_HITS,
  alone: ALONE_HITS,
}
