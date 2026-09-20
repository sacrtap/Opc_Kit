#!/bin/bash
# Cost and accuracy A/B for browser-with-typesafe.
#
# Arm A — the host agent drives the browser itself (run outside the repository, so
#          the skill is discoverable neither project- nor user-scoped).
# Arm B — the host agent uses this skill (run from the repository root).
#
# Both arms run the same 3-action task and are measured with the host runtime's own
# token accounting. Correctness is read from the page's self-report, not from either
# agent's claim.
#
#   node tests/e2e/experiment-server.mjs 8791 &
#   ./tests/e2e/cost-experiment.sh 3
#
# Usage: cost-experiment.sh [samples] [port]

set -u
SAMPLES="${1:-3}"
PORT="${2:-8791}"
BASE="http://127.0.0.1:${PORT}"
SKILL_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$(mktemp -d)"
SCRATCH="$(mktemp -d)"

if ! curl -sS -o /dev/null "${BASE}/reports"; then
  echo "experiment server is not reachable at ${BASE}; start experiment-server.mjs first" >&2
  exit 1
fi

total() { # <jsonl> -> "turns uncached cacheRead output cost"
  python3 - "$1" <<'PY'
import json, sys
t = {'turns': 0, 'uncached': 0, 'cacheRead': 0, 'output': 0, 'cost': 0.0}
for line in open(sys.argv[1], encoding='utf-8', errors='ignore'):
    try: ev = json.loads(line)
    except Exception: continue
    if ev.get('type') != 'message_end' or ev['message'].get('role') != 'assistant': continue
    u = ev['message'].get('usage') or {}
    if not u.get('totalTokens'): continue
    t['turns'] += 1
    t['uncached'] += u.get('input', 0); t['cacheRead'] += u.get('cacheRead', 0)
    t['output'] += u.get('output', 0)
    c = u.get('cost')
    if isinstance(c, dict): t['cost'] += sum(v for v in c.values() if isinstance(v, (int, float)))
print(f"{t['turns']} {t['uncached']} {t['cacheRead']} {t['output']} {t['cost']:.6f}")
PY
}

for n in $(seq 1 "$SAMPLES"); do
  for arm in A B; do
    run="${arm}${n}"
    url="${BASE}/?report=${BASE}/report&run=${run}"
    if [ "$arm" = A ]; then
      cwd="$SCRATCH"
      prompt="Using the eval tool with the browser prelude: open '${url}', then click the button named 'Expand section', then scroll down 2 pages inside the panel labelled 'Evaluation report', then click the button named 'Collapse section'. Finally reply with exactly the status text shown on the page and nothing else."
    else
      cwd="$SKILL_DIR"
      prompt="Use the browser-with-typesafe skill to do exactly this: open '${url}', then expand the section, scroll down 2 pages inside the panel labelled 'Evaluation report', then collapse it again. Finally reply with exactly the status text shown on the page and nothing else."
    fi
    ( cd "$cwd" && omp -p "$prompt" --mode=json --auto-approve --max-time 240 > "${OUT}/${run}.jsonl" 2>/dev/null )
    read -r turns unc cached out cost < <(total "${OUT}/${run}.jsonl")
    printf '%s: turns=%s uncached=%s cacheRead=%s output=%s cost=$%s\n' "$run" "$turns" "$unc" "$cached" "$out" "$cost"
  done
done

echo
python3 - "$OUT" "$SAMPLES" "$BASE" <<'PY'
import json, pathlib, sys, urllib.request
out, samples, base = pathlib.Path(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
reports = json.load(urllib.request.urlopen(f'{base}/reports'))
def rows(arm):
    vals = []
    for n in range(1, samples + 1):
        f = out / f'{arm}{n}.jsonl'
        if not f.exists(): continue
        t = {'turns':0,'uncached':0,'cacheRead':0,'output':0,'cost':0.0}
        for line in f.read_text(errors='ignore').splitlines():
            try: ev = json.loads(line)
            except Exception: continue
            if ev.get('type')!='message_end' or ev['message'].get('role')!='assistant': continue
            u = ev['message'].get('usage') or {}
            if not u.get('totalTokens'): continue
            t['turns']+=1; t['uncached']+=u.get('input',0); t['cacheRead']+=u.get('cacheRead',0)
            t['output']+=u.get('output',0)
            c=u.get('cost')
            if isinstance(c,dict): t['cost']+=sum(v for v in c.values() if isinstance(v,(int,float)))
        ok = any(r['run']==f'{arm}{n}' and r['status']=='collapsed' and r['scrolls']>=1
                 and r['expandVisible'] and not r['collapseVisible'] and not r['panelVisible'] for r in reports)
        vals.append((t, ok))
    return vals
print('arm   turns   uncached   cacheRead   output        cost   correct')
for arm in ('A','B'):
    vals = rows(arm)
    if not vals: continue
    k = len(vals)
    mean = lambda f: sum(v[0][f] for v in vals)/k
    print(f"{arm}    {mean('turns'):5.1f}   {mean('uncached'):8.0f}   {mean('cacheRead'):9.0f}   "
          f"{mean('output'):6.0f}   ${mean('cost'):.6f}   {sum(1 for v in vals if v[1])}/{k}")
PY
echo "(raw runs in ${OUT}; scratch arm-A dir ${SCRATCH} retained for inspection)"
