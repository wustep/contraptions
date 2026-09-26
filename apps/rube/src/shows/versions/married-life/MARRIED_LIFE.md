# Married Life

Michael Giacchino's *Married Life*, from Up (2009), as a Rube Goldberg machine: the film's montage of Carl and
Ellie's life, from the wedding to Carl alone in the house, in the film's order. Directed by Claude Opus 5.5.

This file is the show's arrangement and its craft notes. It grows as the show is built; the builders' working
brief is kept out of the repo (`dev/BUILD_BRIEF.md`).

## The cue

The label's upload (Michael Giacchino - Topic, ℗ 2009 Walt Disney Records, `2rn-vMbFglI`), whole, from its first
sample: 250.6 s, rung out by 248.5 s. The show runs to 258 s, the credits over the house.

Measured once by `scripts/shows/married-life-onsets.py` into `scripts/shows/plans/married-life-onsets.json`. The
waltz does not keep one tempo, so there is no comb: a tracker follows it beat by beat, each beat is moved onto its
own attack where one is near, and in the two waltzes each beat has its bar and its place in the bar (the downbeat
is where the bass's oom is).

| s | music | film |
| ---: | --- | --- |
| 0.44 | a flash; the Wedding March, jazzed | the wedding |
| 17.76 | waltz bar 1 (175 bpm, 1.03 s a bar): the swell | the kiss, the families |
| 21.58 | the waltz proper | the house fixed up; (49.64) the clouds; (63.25) the nursery |
| 71.0 | the waltz slows and stops; 73.46 a held note | the doctor's office |
| 84.38 | the piano alone | Ellie alone in the yard |
| 100.36 | the waltz again, slower (163 bpm, 1.10 s a bar) | the book; the jar; (140.66) the ties |
| 161.68 | it presses on, faster; a cadence of three to 167.71 | the tickets |
| 167.71 | a held note; 174.67 | the hill; the fall |
| 180.41 | strings and piano | the hospital |
| 189.45 | quieter; 197.71 the strongest onset; silence | the church, empty |
| 201.94 | the piano alone; last note 242.53 | home |

## The show

One path, cut the way the film cuts: ten legs in four places, each cut a match cut on Carl (`life/show.ts`,
`life/seams.ts`). The house is the machine: built, lived in for years, patched, left idle.

Carl is square and Ellie is round (the film's own shape language); he is the thread and she is company. They grey
with the years (`AGE` in `life/music.ts`), fastest through the ties. His balloon at the end is his young blue.
