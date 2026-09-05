# Debugging Workflow — Diagnostic Toolkit

Reference material for the `debugging-workflow` skill. See [SKILL.md](../SKILL.md).

Tools do not find causes; a method does. Reach for these once a hypothesis needs
an experiment.

## Choosing the Instrument

| Question                                  | Instrument                        |
| ----------------------------------------- | --------------------------------- |
| What is the state at this point?          | Debugger, conditional breakpoint  |
| Which path did execution take?            | Tracing, structured logs          |
| Where does the time go?                   | Sampling profiler, flame graph    |
| Where does the memory go?                 | Heap profiler, allocation tracker |
| Is this a data race?                      | Race detector, thread sanitiser   |
| Which commit introduced it?               | `git bisect run`                  |
| What did the process actually ask the OS? | `strace`, `dtruss`, `procmon`     |
| What crossed the network?                 | `tcpdump`, proxy, request log     |

## Debuggers

### Conditional and count breakpoints

The single biggest saver when a loop fails late. Break on the condition, not on
the line.

```python
# Python - drop in at the exact iteration
import pdb

for i, row in enumerate(rows):
    if row.id == 88213:
        pdb.set_trace()
```

```gdb
# GDB / LLDB
break invoice.c:214 if amount < 0
break process_row thread 3
watch total_cents            # break when the value changes
```

```javascript
// Node - run with --inspect-brk and attach, or in-source:
if (order.id === 'ord_88213') debugger;
```

Useful `pdb` commands beyond `n`/`c`: `w` (where), `u`/`d` (move up and down the
stack), `p expr`, `pp obj`, `l`, `until N`, `retval`.

### Post-mortem debugging

Enter the debugger on the exception with the stack intact, rather than
reproducing again.

```bash
python -m pdb -c continue script.py        # break at the crash
pytest --pdb -x                            # drop in on first failure
```

```python
import sys, traceback, pdb

def hook(exc_type, exc, tb):
    traceback.print_exception(exc_type, exc, tb)
    pdb.post_mortem(tb)

sys.excepthook = hook
```

### Time-travel and record/replay

When the failure is rare and expensive to reach, record once and replay
deterministically as many times as you like.

```bash
rr record ./server --config=prod.toml
rr replay                     # then: reverse-continue, reverse-step
```

`rr` (Linux, x86) is the strongest tool available for heisenbugs, because replay
is deterministic — including thread interleaving.

## Profilers

Always sample first, instrument second: instrumentation changes the timing you
are trying to measure.

```bash
# Python
py-spy record -o profile.svg --pid 4242         # no code change, live process
py-spy dump --pid 4242                          # instant stack of every thread
python -X importtime -c "import app" 2>&1 | sort -k2 -n | tail   # slow startup

# Node
node --cpu-prof --cpu-prof-dir=./prof server.js
node --prof server.js && node --prof-process isolate-*.log

# Go
go test -run TestX -cpuprofile cpu.out -memprofile mem.out ./...
go tool pprof -http=:8080 cpu.out
curl -o cpu.pprof 'http://localhost:6060/debug/pprof/profile?seconds=30'

# JVM
jcmd <pid> Thread.print                          # instant thread dump
java -XX:StartFlightRecording=duration=60s,filename=rec.jfr -jar app.jar

# Linux, any language with symbols
perf record -F 99 -g -p <pid> -- sleep 30 && perf script | stackcollapse-perf.pl | flamegraph.pl > out.svg
```

Read a flame graph by **width**, not height: width is time spent, height is only
stack depth. Plateaus at the top are where the CPU actually is.

## Memory

```bash
# Python
python -m tracemalloc script.py
pip install memray && memray run -o out.bin script.py && memray flamegraph out.bin

# Node - heap snapshots, compare two
node --inspect server.js     # Chrome DevTools > Memory > take snapshot, diff

# Go
curl -o heap.pprof http://localhost:6060/debug/pprof/heap
go tool pprof -http=:8080 heap.pprof     # then: -sample_index=inuse_space

# Native
valgrind --leak-check=full --show-leak-kinds=all ./binary
```

For a suspected leak, take two snapshots separated by a full workload cycle and
diff. The absolute size tells you little; the growth between comparable states
tells you everything.

## Concurrency

Race detectors find real bugs, including ones your test only exposed by luck.
Run them in CI, not only when investigating.

```bash
go test -race ./...
cargo test                                  # Rust: most races are compile errors
clang -fsanitize=thread -g race.c
java -jar app.jar -Djava.util.concurrent.ForkJoinPool.common.parallelism=1  # serialise to compare
```

```python
# Python: force contention to make an interleaving bug reproducible
import sys
sys.setswitchinterval(1e-6)
```

Deadlock triage: get every thread's stack at once (`jcmd Thread.print`,
`py-spy dump`, `SIGQUIT` to a Go binary, `thread apply all bt` in GDB) and look
for two threads each holding what the other waits on.

## System-Level Observation

```bash
strace -f -e trace=openat,read,write -p <pid>      # syscalls, Linux
strace -f -c -p <pid>                              # syscall time summary
lsof -p <pid>                                      # open files, sockets
ss -tnp state established                          # who are we connected to
tcpdump -i any -w capture.pcap 'port 5432'         # then read in Wireshark
```

`strace -c` answering "where is the time?" with a syscall histogram frequently
ends an investigation in one command — an unexpected number of `stat` calls, a
retried connect, a blocking read on a socket nobody knew about.

## Bisection Recipes

```bash
# Fully automated: exit 0 = good, 1 = bad, 125 = skip
git bisect start HEAD v3.2.0
git bisect run ./scripts/check-bug.sh

# Skip commits that cannot build
git bisect run sh -c 'make -s || exit 125; ./run-check'

# Bisect only within one path's history
git bisect start -- src/billing
```

Write the check script so it is **fast and unambiguous**. A check that takes ten
minutes over sixteen steps is a lost afternoon; one that sometimes reports the
wrong answer poisons the whole search.

For input bisection, `creduce` and `shrinkray` automate the shrink for source
files, and property-based testing libraries (Hypothesis, fast-check, proptest)
shrink counterexamples for you.

## Log Archaeology

```bash
# Follow one request across services
grep -rh "correlation_id=7f3a" /var/log/*/  | sort -k1,2

# Structured logs
jq -c 'select(.level=="error" and .service=="billing")' app.log | head -50
jq -r 'select(.duration_ms > 1000) | [.ts,.route,.duration_ms] | @tsv' app.log

# Frequency of error kinds - what changed today?
jq -r 'select(.level=="error") | .error_type' app.log | sort | uniq -c | sort -rn
```

Compare a window before the incident with a window during it. The signal is
usually a ratio that changed, not a message that is new.
