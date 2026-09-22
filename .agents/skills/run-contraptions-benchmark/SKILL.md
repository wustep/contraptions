---
name: run-contraptions-benchmark
description: Operate a three-world, ten-piece-per-world construct benchmark with fresh candidates and sealed build gates.
---

# Run the construct benchmark

Read bench/BENCHMARK.md and bench/EVAL.md. Use `node bench/cli.mjs` as the run
state authority; never edit run.json, seal.json, inputs, or rubric to improve a
candidate's result. This skill operates the harness, not the Builder UI.

1. Establish candidate model, provider/harness, budget, tools and isolation level
   from the user's request; ask only for missing conditions needed for comparison.
2. Run `node bench/cli.mjs new <seed>` (or use an explicitly requested suite).
3. Run `node bench/cli.mjs start <suite-id> <model-id>` and record the returned
   run ID/workspace plus exact run conditions in operator notes.
4. Launch a fresh candidate session with only that workspace and TASK.md. Do not
   pass your repository context. If your agent tool cannot provide a clean
   context/filesystem boundary, use an external session/container and disclose
   that limitation. Do not let candidates inspect the parent repo or catalog.
5. Candidate authors three ten-piece Build JSON files and HONESTY.md. Run
   `node bench/cli.mjs check <run-id>` as operator; relay only gate errors while
   within the agreed budget. Record retries. Do not fix candidate artifacts.
6. Stop candidate work, then `node bench/cli.mjs seal <run-id>`. Failed gates are
   valid benchmark outcomes; do not relabel them passing or overwrite the seal.
7. Run `node bench/cli.mjs score <run-id>`. This is a verification/manual scoring
   handoff, not automatic evaluation. Prepare the blind evaluator package exactly
   as EVAL.md describes. Use its pinned-model or labeled human path; no silent
   substitutions. Static inspection cannot earn a completed visual-craft score.
8. Archive evaluator evidence separately, report gates, manual scores (if any),
   model/seed/revision/budget, honesty and isolation caveats, and record paths.
   Do not publish, commit runs, or message other people without user instruction.
