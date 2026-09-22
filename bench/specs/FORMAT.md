# Authoritative format

Operator source: `apps/rube/src/builder/spec.ts` defines BUILD_FORMAT, Build,
PieceSpec, WorldSpec, lane operations, shapes, motions, limits, and parseBuild.
`apps/rube/src/builder/compile.ts` compiles validated data into runtime pieces and
worlds. `apps/rube/src/parts.ts` defines placement and drawing conventions.

At start, the operator copies spec.ts into this folder as `build-spec.ts`, plus
only the Theme interface as `theme.ts`. These are reading references; their type
imports point to the original repository and need not resolve here. Pt means
[number, number]; Backdrop is the string union listed in BACKDROPS. No candidate
should follow imports or request the original source tree. The compiler is
operator-only because its dependencies contain catalog solutions.

The runtime validator, not an independently maintained JSON Schema, is the
source of truth. Unknown fields may be tolerated by that validator; do not use
them to carry code or change behavior. benchmark contract.json adds the suite
requirements on top of the portable format.
