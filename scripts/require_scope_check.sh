#!/bin/bash
# Make the auto-pr-scope check (.github/workflows/auto-pr-scope.yml) required
# on main, next to the checks already required (Vercel):
#   scripts/require_scope_check.sh [--dry-run]
# Prints main's branch protection JSON before and after. The check is pinned
# to the GitHub Actions app (app_id 15368), so no other app's status can
# satisfy it. Keeps every other protection setting and the existing checks;
# does nothing when auto-pr-scope is already required. Run it after the PR
# that adds the workflow has merged and the check has run once, with a gh
# login that is an admin of the repo. --dry-run shows the request body
# without sending it. Needs gh and python3.
set -euo pipefail
repo=${SITE_REPO:-andrewluxem/inboxteardown}
branch=main
check=auto-pr-scope
actions_app_id=15368
dry=0
[ "${1:-}" = --dry-run ] && dry=1
api="repos/$repo/branches/$branch/protection"

pretty() { python3 -I -m json.tool; }

echo "== $repo $branch protection, before"
before=$(gh api "$api")
printf '%s\n' "$before" | pretty

# the PATCH body, "present" when the check is already required, or "none"
# when the branch requires no status checks at all
body=$(BEFORE=$before CHECK=$check APP=$actions_app_id python3 -I -c '
import json, os
p = json.loads(os.environ["BEFORE"])
rsc = p.get("required_status_checks")
if not rsc:
    print("none")
elif any(c["context"] == os.environ["CHECK"] for c in rsc.get("checks") or []):
    print("present")
else:
    checks = [{"context": c["context"], "app_id": c.get("app_id")}
              for c in rsc.get("checks") or []]
    checks.append({"context": os.environ["CHECK"],
                   "app_id": int(os.environ["APP"])})
    print(json.dumps({"strict": rsc.get("strict", False), "checks": checks}))
')
case "$body" in
  present) echo "$check is already required; nothing to do"; exit 0 ;;
  none) echo "$branch has no required status checks to add to; not changing anything" >&2
        exit 1 ;;
esac
echo "== PATCH $api/required_status_checks"
printf '%s\n' "$body" | pretty
if [ "$dry" = 1 ]; then
  echo "dry run: not sent"
  exit 0
fi
printf '%s' "$body" | gh api -X PATCH "$api/required_status_checks" \
  --input - >/dev/null

echo "== $repo $branch protection, after"
gh api "$api" | pretty
