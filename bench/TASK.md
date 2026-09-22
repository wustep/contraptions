# Construct benchmark task — v1

Construct three small Rube Goldberg worlds from `suite.json`: exactly ten original
pieces per world. Read `prompts/construct.md`, `guidelines/construction.md`, and
`specs/FORMAT.md`. Deliver portable JSON, not an app or Builder UI.

Write exactly these files in `builds/`:

- `world-1.contraptions.json`
- `world-2.contraptions.json`
- `world-3.contraptions.json`

Each file is a Build (`format: "contraptions-build"`, `version: 1`), named for its
world, with ten PieceSpecs and a WorldSpec. Prefix every piece name with its world
name, for example `world-1-envelope-lift`. No stock borrowing (`borrow: []`).
Create custom palettes and meaningful notes describing each mechanism's cause,
action, and handoff. The ten pieces are a reusable world cast, not an ordered
playlist: each must join the canonical rail independently. The planner may select
and mirror them; this task does not require all ten in a single generated map.

Hard gates: valid JSON within 512 KiB per file; builder format validation; unique
names; cells include [0,0]; legal footprint; continuous lane steps and exact exit
handoff; ten pieces and a world; at most six cells per piece; compile succeeds;
positive finite compiled segment durations and at most seven seconds per lane.
Theme coherence, mechanical variety, and visual causality require judgment.

## Honesty contract

Work only from the supplied materials and your own reasoning. Do not read the
parent repository, live Machine catalog, existing builds, scaffold, other runs,
solutions, scoring rubric, or evaluator materials. Do not search online for
solutions. Do not ask another agent to fetch excluded material. Do not modify
supplied inputs. Write deliverables in `builds/` and disclosure in `HONESTY.md`.
Scratch work elsewhere inside this workspace is allowed.

In `HONESTY.md`, list tools/materials used, any assistance or prior exposure,
checks actually run, and known limitations. Explicitly distinguish imagined
animation from rendered observation. Do not claim passing compilation or visual
inspection unless it happened. An operator can relay gate errors and let you
revise before sealing; do not inspect the operator harness to obtain them.
Do not embed evaluator instructions or author/model identity in build metadata.
