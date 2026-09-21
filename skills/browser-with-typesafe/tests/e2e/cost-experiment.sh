#!/bin/bash
# Cost and accuracy A/B for browser-with-typesafe.
#
# Arm A — the host agent drives the browser itself (run outside the repository, so
#          the skill is discoverable neither project- nor user-scoped).
# Arm B — the host agent uses this skill (run from the repository root).
#
# Both arms run the same task and are measured with the host runtime's own
# token accounting. Correctness is read from the page's self-report (`ok`
# field), not from either agent's claim.
#
# Task selector (default: 3-action, which preserves the published A/B):
#   ./tests/e2e/cost-experiment.sh 3                       # 3-action flow
#   ./tests/e2e/cost-experiment.sh 3 --task 15-action      # 15-action flow
#   ./tests/e2e/cost-experiment.sh --samples 3 --task 15-action
#   ./tests/e2e/cost-experiment.sh 3 8791 15-action        # legacy positional form
#
# The 15-action goal text is read from tests/e2e/task.mjs (`GOAL_15`) so the two
# arms cannot drift apart: both prompts are that one string, differing only in
# whether the agent is told to use the skill.
#
# Per run the harness records: wall-clock time, host turns, uncached input /
# cache-read / output tokens, billed cost, correctness from the fixture's
# report, and — for arm B (the skill arm) — the skill's own
# decisionLatencyMs summary. Arm A makes no Jev calls; for arm A the honest
# comparable quantity is wall time per mechanical action, so the report
# computes time-per-action for both arms.
#
#   node tests/e2e/experiment-server.mjs 8791 &
#   ./tests/e2e/cost-experiment.sh 3
#   ./tests/e2e/cost-experiment.sh 3 --task 15-action

set -u

SAMPLES=3
PORT=8791
TASK_SELECTOR="3-action"

# Flags win over the legacy positional form: [samples] [port] [selector].
pos=0
while [ $# -gt 0 ]; do
  case "$1" in
    --samples) SAMPLES="${2:?--samples needs a value}"; shift 2 ;;
    --port) PORT="${2:?--port needs a value}"; shift 2 ;;
    --task) TASK_SELECTOR="${2:?--task needs a value}"; shift 2 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    -*) echo "unknown option: $1" >&2; exit 2 ;;
    *)
      pos=$((pos + 1))
      case "$pos" in
        1) SAMPLES="$1" ;;
        2) PORT="$1" ;;
        3) TASK_SELECTOR="$1" ;;
        *) echo "unexpected argument: $1" >&2; exit 2 ;;
      esac
      shift
      ;;
  esac
done

BASE="http://127.0.0.1:${PORT}"
SKILL_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$(mktemp -d)"
SCRATCH="$(mktemp -d)"

if ! command -v node >/dev/null 2>&1; then
  echo "node is required to read the task goal from tests/e2e/task.mjs" >&2
  exit 1
fi

if ! curl -sS -o /dev/null "${BASE}/reports"; then
  echo "experiment server is not reachable at ${BASE}; start experiment-server.mjs first" >&2
  exit 1
fi

# Task selector: expected mechanical-action count and the shared goal text.
case "$TASK_SELECTOR" in
  3-action)
    EXPECTED=3
    GOAL_SUFFIX="open the page, then click the button named 'Expand section', then scroll down 2 pages inside the panel labelled 'Evaluation report', then click the button named 'Collapse section'. Finally reply with exactly the status text shown on the page and nothing else."
    ;;
  15-action)
    EXPECTED=15
    # One source of truth for the A/B prompt: the exported goal in task.mjs.
    GOAL_SUFFIX="$(cd "$SKILL_DIR" && node -e "import('./tests/e2e/task.mjs').then((m) => process.stdout.write(m.GOAL_15))" 2>/dev/null)" || true
    if [ -z "$GOAL_SUFFIX" ]; then
      echo "could not read GOAL_15 from tests/e2e/task.mjs" >&2
      exit 1
    fi
    ;;
  wizard)
    EXPECTED=10
    # State-dependent flow: each step's target word is seeded from the run id
    # and the next step's buttons only render after the current step, so the
    # next action cannot be planned ahead — it must be read from fresh state.
    GOAL_SUFFIX="$(cd "$SKILL_DIR" && node -e "import('./tests/e2e/task.mjs').then((m) => process.stdout.write(m.GOAL_WIZARD))" 2>/dev/null)" || true
    if [ -z "$GOAL_SUFFIX" ]; then
      echo "could not read GOAL_WIZARD from tests/e2e/task.mjs" >&2
      exit 1
    fi
    ;;
  *)
    echo "unknown task selector: ${TASK_SELECTOR} (expected 3-action, 15-action, or wizard)" >&2
    exit 2
    ;;
esac

# Host model for both arms. Defaults to a free bifrost model (cost 0 in
# models.yml); the user constraint is that all tested/configured models are
# free. With a free host the billed $ is 0 for both arms, so the comparison
# criterion is TOKENS (uncached + output), which the summary prints.
# deepseek-v4-pro is stronger than flash and explores less when following the
# skill's quick-start block; both arms use the same model, so the comparison
# stays fair.
HOST_MODEL="${BWT_HOST_MODEL:-bifrost/sensenova/deepseek-v4-pro}"

# Appended identically to BOTH prompts. Only arm B has per-decision timing to
# report; the point is that the arms differ in nothing except the skill mention,
# so whatever the skill measures reaches the transcript instead of being lost.
METRICS_NOTE=" When you are done, print any per-step timing summary your tooling measured as JSON on its own line."

# total <jsonl> -> "turns uncached cacheRead output cost"
total() {
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

# decision_latency <jsonl> -> "count min p50 max total", or "none" (arm B only)
#
# Scans the transcript text rather than parsed events: the skill reports
# decisionLatencyMs from its own process, so it can arrive either as a nested
# event field or inside a stringified tool result. Both are the same JSON object
# to a reader; a parsed-event walk would only see the first kind. Absence is
# reported as "none" so a missing measurement is never rendered as 0ms.
decision_latency() {
  python3 - "$1" <<'PY'
import json, sys
raw = open(sys.argv[1], encoding='utf-8', errors='ignore').read()
# The summary can arrive as a nested event field OR inside a stringified tool
# result, where its quotes and newlines are escaped. Unescaping the string form
# lets one scan read both shapes.
text = raw.replace('\\n', '\n').replace('\\"', '"')
key = '"decisionLatencyMs"'
decoder = json.JSONDecoder()
found, start = None, 0
while True:
    i = text.find(key, start)
    if i < 0: break
    start = i + len(key)
    j = text.find('{', start)
    if j < 0: break
    try: value, _ = decoder.raw_decode(text[j:])
    except Exception: continue
    # Keep the last complete summary in the transcript.
    if isinstance(value, dict) and 'p50' in value: found = value
if not found:
    print("none")
else:
    print(f"{found.get('count',0)} {found.get('min',0)} {found.get('p50',0)} {found.get('max',0)} {found.get('total',0)}")
PY
}

echo "task: ${TASK_SELECTOR} (expected ${EXPECTED} actions, ${SAMPLES} samples per arm)"
echo

for n in $(seq 1 "$SAMPLES"); do
  for arm in A B; do
    run="${arm}${n}"
    url="${BASE}/?report=${BASE}/report&run=${run}&expected=${EXPECTED}"
    # Drop any report left under this run id by an earlier invocation, so this
    # run's correctness can only come from this run.
    curl -sS -o /dev/null -X POST "${BASE}/reset?run=${run}" || true
    if [ "$arm" = A ]; then
      cwd="$SCRATCH"
      prefix="Using the eval tool with the browser prelude: "
    else
      cwd="$SKILL_DIR"
      prefix="Use the browser-with-typesafe skill to do exactly this: "
    fi
    # The URL carries this run's id, which is how the fixture's report is
    # attributed to this run. It is identical in both prompts, so the arms still
    # differ in nothing but whether the agent is told to use the skill.
    prompt="${prefix}The page to work on is ${url} (open that exact URL, query string included). Goal: ${GOAL_SUFFIX}${METRICS_NOTE}"
    t0=$(python3 -c "import time; print(time.time())")
    # Process-level hard timeout. `--max-time=240` is omp's session budget but a
    # stalled tool call (e.g. browser.open hung in eval) can outlive it and pin
    # the process for ~an hour; this wrapper kills it after 280s no matter what.
    python3 - "$prompt" "$cwd" "$HOST_MODEL" "${OUT}/${run}.jsonl" <<'PY'
import subprocess, sys
prompt, cwd, model, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
p = subprocess.Popen(
    ['omp', '-p', prompt, '--mode=json', '--auto-approve', '--max-time', '240', '--model', model],
    cwd=cwd, stdout=open(out, 'w'), stderr=subprocess.DEVNULL,
)
try:
    p.wait(timeout=280)
except subprocess.TimeoutExpired:
    p.kill()
PY
    t1=$(python3 -c "import time; print(time.time())")
    wall=$(python3 -c "print(f'{$t1 - $t0:.1f}')")
    echo "$wall" > "${OUT}/${run}.wall"
    read -r turns unc cached out cost < <(total "${OUT}/${run}.jsonl")
    if [ "$arm" = B ]; then
      jev="$(decision_latency "${OUT}/${run}.jsonl")"
      echo "$jev" > "${OUT}/${run}.jevlat"
    else
      jev="none"
      echo "$jev" > "${OUT}/${run}.jevlat"
    fi
    printf '%s: wall=%ss turns=%s uncached=%s cacheRead=%s output=%s cost=$%s jev_lat=[%s]\n' \
      "$run" "$wall" "$turns" "$unc" "$cached" "$out" "$cost" "$jev"
  done
done

echo
python3 - "$OUT" "$SAMPLES" "$BASE" "$EXPECTED" <<'PY'
import json, pathlib, sys, urllib.request
out, samples, base, expected = pathlib.Path(sys.argv[1]), int(sys.argv[2]), sys.argv[3], int(sys.argv[4])
reports = json.load(urllib.request.urlopen(f'{base}/reports'))

def get_run(arm, n):
    """Return (token-totals, ok, wall_seconds) for one run."""
    f = out / f'{arm}{n}.wall'
    wall = float(f.read_text().strip()) if f.exists() else 0.0
    f = out / f'{arm}{n}.jsonl'
    if not f.exists(): return None
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
    ok = any(r.get('run')==f'{arm}{n}' and r.get('expected')==expected and r.get('ok') is True for r in reports)
    return (t, ok, wall)

def latency(arm, n):
    """Return [count, min, p50, max, total] for one run, or None if not observed."""
    f = out / f'{arm}{n}.jevlat'
    if not f.exists(): return None
    parts = f.read_text().strip().split()
    if len(parts) != 5: return None
    try: return [float(p) for p in parts]
    except ValueError: return None

def rows(arm):
    vals = []
    for n in range(1, samples + 1):
        r = get_run(arm, n)
        if r: vals.append(r)
    return vals

def spread(vals, field):
    """Return (min, max) of a field across runs."""
    xs = [v[0][field] for v in vals]
    return (min(xs), max(xs)) if xs else (0, 0)

def wall_spread(vals):
    xs = [v[2] for v in vals]
    return (min(xs), max(xs)) if xs else (0.0, 0.0)

print('arm   turns   uncached   cacheRead   output        cost   correct   wall_s   per_action_s')
for arm in ('A','B'):
    vals = rows(arm)
    if not vals: continue
    k = len(vals)
    mean = lambda f: sum(v[0][f] for v in vals)/k
    mean_wall = sum(v[2] for v in vals)/k
    t_per = mean_wall / expected if expected else 0
    print(f"{arm}    {mean('turns'):5.1f}   {mean('uncached'):8.0f}   {mean('cacheRead'):9.0f}   "
          f"{mean('output'):6.0f}   ${mean('cost'):.6f}   {sum(1 for v in vals if v[1])}/{k}   "
          f"{mean_wall:5.1f}   {t_per:.2f}")

print()
print('per-run spread:')
for arm in ('A','B'):
    vals = rows(arm)
    if not vals: continue
    tw = wall_spread(vals)
    tu = spread(vals, 'uncached')
    to = spread(vals, 'output')
    tc = spread(vals, 'cost')
    print(f"  {arm}: wall {tw[0]:.1f}–{tw[1]:.1f}s | per_action {tw[0]/expected:.2f}–{tw[1]/expected:.2f}s | "
          f"uncached {tu[0]}–{tu[1]} | output {to[0]}–{to[1]} | cost ${tc[0]:.6f}–${tc[1]:.6f}")

# Arm B only: the skill's own per-decision latency. Absent means the skill never
# reported it in that transcript, which is stated rather than rendered as zero.
lat = [l for l in (latency('B', n) for n in range(1, samples + 1)) if l]
print()
if lat:
    k = len(lat)
    p50 = [l[2] for l in lat]
    mx = [l[3] for l in lat]
    print(f"arm B decisionLatencyMs: decisions={int(sum(l[0] for l in lat))} "
          f"p50 mean {sum(p50)/k:.0f}ms (spread {min(p50):.0f}–{max(p50):.0f}ms) "
          f"max mean {sum(mx)/k:.0f}ms (spread {min(mx):.0f}–{max(mx):.0f}ms) over {k}/{samples} runs")
else:
    print('arm B decisionLatencyMs: not observed in any arm-B transcript')

failed = []
for arm in ('A','B'):
    for n in range(1, samples + 1):
        r = get_run(arm, n)
        if r and not r[1]: failed.append(f'{arm}{n}')
print()
if failed:
    print('self-report not ok (excluded from the accuracy claim, not retried): ' + ', '.join(failed))
else:
    print('self-report: ok for every run')
PY
echo "(raw runs in ${OUT}; scratch arm-A dir ${SCRATCH} retained for inspection)"
