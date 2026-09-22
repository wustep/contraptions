# Construct benchmark — operator protocol v1.1

Measures construction of portable pieces and worlds from written briefs. Inspired
by StageBench's task/honesty/isolated workspace/seal pattern. It is independent
of Machine, Shows, Playground, and Builder generation. One suite is **3 worlds ×
10 pieces**. The starter suite contains briefs only, never reference solutions.

Use Node 22 and `npm ci` from the repository root. No additional packages or API
credentials are needed for gates. Commands work as `node bench/cli.mjs …` or
`npm run bench -- …`:

```sh
node bench/cli.mjs new experiment-42
node bench/cli.mjs start starter candidate-model-id
node bench/cli.mjs check <run-id>
node bench/cli.mjs seal <run-id>
node bench/cli.mjs score <run-id>
node bench/cli.mjs score <run-id> --assess
```

1. **New:** optional seed produces deterministic briefs from a versioned pool;
   every invocation mints a new suite ID. Use the printed ID instead of `starter`
   to run that suite. Repeated seeds reproduce briefs, not IDs. This finite pool
   does not guarantee unseen ideas; report seed and avoid tuning to scored suites.
2. **Start:** records model, revision, dirty-tree flag, exact candidate inputs,
   their digest, and rubric. Creates `~/.contraptions-bench/<run-id>/` containing
   only TASK, prompt, guidelines, format references, suite, and empty builds/.
   Set `CONTRAPTIONS_BENCH_HOME=/absolute/outside/path` if desired. Repository
   descendants, including symlink aliases, are rejected. No compiler bundle,
   samples, scaffold, rubric, or other runs enter the workspace.
3. Launch a **fresh candidate session** with that working directory, no inherited
   repository context, and TASK.md as the entrypoint. Record exact provider,
   resolved model, harness, budget/time limit, tool access, and any prior exposure
   in operator notes alongside run.json. Fix these conditions across comparisons.
   Do not edit run.json or the input snapshot. Candidate produces only JSON and
   HONESTY.md; no candidate scripts are executed by this harness.
4. **Check:** runs the real parseBuild and compileBuild gates without sealing.
   Operators may relay errors before the agreed deadline. It exits nonzero for
   failed gates. Record attempt counts/feedback in operator notes for fair runs.
5. **Seal:** stops candidate work by protocol, copies exact build bytes into
   bench/runs/<run-id>/builds/, runs gates on those bytes, and writes seal.json
   with artifact/compiler hashes, gate details, and an unrated assessment.json.
   Malformed delivery structure (missing/extra files, symlinks, oversize files)
   is rejected before sealing; structurally complete but invalid builds are
   sealed as ineligible and exit nonzero. HONESTY.md is archived; absence is
   explicitly marked unverified. A sealed run cannot be checked/resealed; start
   another run for a new attempt. Workspace changes cannot alter sealed artifacts.
6. **Score:** verifies the artifact digest and compiler identity, reruns gates,
   and writes `EVAL_PROMPT.md` for the pinned judge **`claude-opus-5`**. Feed that
   prompt to Opus 5 with the sealed builds (no render/video required). Register
   the filled assessment with `score <run-id> --assess` (or a second bare `score`
   once complete). See [EVAL.md](EVAL.md). The CLI does not call the model.

Workspaces are outside the repository so walking upward does not enter runs/ or
solutions. **This is context separation, not a security sandbox.** Same-user
agents may still access arbitrary absolute paths or sibling workspaces. For an
untrusted candidate use a separate container/user with only the candidate
workspace mounted, no repository/home mounts, and no network; have the operator
copy outputs back. The CLI does not provision that environment. Never claim an
isolated-security run from cwd alone.

Local runs and generated suites are gitignored; starter is tracked. Archive runs
explicitly outside Git, or review and force-add selected sealed records (exclude
absolute paths/secrets from public copies). Artifacts, inputs, rubric, revision,
compiler digest, disclosures and evaluator evidence should travel together.
Do not commit candidate workspaces. Hashes detect accidental changes, not a
malicious operator who can rewrite both files and hashes. Keep the recorded
checkout/dependencies for reproducibility; no automatic cleanup or run deletion.

Validation: `npm run test:bench`; project regression checks: `npm run build`.
The repository has no preexisting `npm test` script.
