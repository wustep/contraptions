#!/usr/bin/env bash
# Vercel's Ignored Build Step (vercel.json `ignoreCommand`).
# Exit 0 = skip this build, exit 1 = build.
#
# Skips only when every file changed since the branch's last successful
# deployment is a doc or note: any *.md, or anything under ideas/, docs/ or
# notes/. Whenever the range can't be read for certain (first deploy on a
# branch, previous commit missing from Vercel's shallow clone, empty diff from
# a redeploy, git error), it builds.
set -u

build() { echo "vercel-ignore-build: building ($1)"; exit 1; }
skip()  { echo "vercel-ignore-build: skipping, docs/notes only ($1)"; exit 0; }

head=$(git rev-parse --verify -q HEAD^{commit}) || build "no HEAD"

prev="${VERCEL_GIT_PREVIOUS_SHA:-}"
# No previous deployment on this branch: HEAD^ alone could hide code commits
# pushed together with a docs commit, so build.
[ -n "$prev" ] || build "no previous deployment on this branch"
git cat-file -e "${prev}^{commit}" 2>/dev/null || build "previous sha ${prev:0:7} not in clone"

changed=$(git -c core.quotepath=off diff --name-only "$prev" "$head" 2>/dev/null) || build "git diff failed"
[ -n "$changed" ] || build "no changes since ${prev:0:7} (redeploy)"

while IFS= read -r f; do
  case "$f" in
    *.md|ideas/*|docs/*|notes/*) ;;
    *) build "$f changed since ${prev:0:7}" ;;
  esac
done <<< "$changed"

skip "$(printf '%s\n' "$changed" | wc -l | tr -d ' ') file(s) since ${prev:0:7}"
