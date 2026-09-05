# Debugging Workflow — Production Debugging

Reference material for the `debugging-workflow` skill. See [SKILL.md](../SKILL.md).

Production debugging differs in three ways: you cannot re-run the failure, the
system is serving users while you investigate, and the data is real. Every
technique below is chosen to respect those constraints.

## Order of Operations During an Incident

Stabilise first, diagnose second. A rollback that restores service costs one
data point; a diagnosis session during an outage costs users.

1. **Mitigate** — roll back, disable the flag, shed load, fail over.
2. **Preserve evidence** before it rotates away: logs, a heap dump, a thread
   dump, the deployed artefact version, the flag state.
3. **Diagnose** with the system stable.
4. **Fix** with a regression test.
5. **Write the post-mortem**, blameless, focused on what made the failure
   possible and what made it hard to see.

The instinct to diagnose first is the most expensive one in this list. Capture
and roll back.

## Correlation Before Anything

Without a request identifier crossing every service and log line, production
debugging is guesswork. If it is missing, adding it is the highest-value fix
available.

```python
import contextvars, logging, uuid

correlation_id = contextvars.ContextVar("correlation_id", default=None)

class CorrelationFilter(logging.Filter):
    def filter(self, record):
        record.correlation_id = correlation_id.get() or "-"
        return True

async def middleware(request, handler):
    cid = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    correlation_id.set(cid)
    response = await handler(request)
    response.headers["X-Correlation-ID"] = cid
    return response
```

Propagate it on every outbound call, and put it in error responses so a user
report arrives with the key already attached.

## Structured Logs That Answer Questions

Log events with fields, not sentences. A sentence can be read; a field can be
aggregated.

```python
logger.info(
    "payment.settled",
    extra={
        "correlation_id": correlation_id.get(),
        "tenant_id": tenant.id,
        "amount_minor": amount.minor,
        "currency": amount.currency,
        "provider": "stripe",
        "latency_ms": elapsed_ms,
        "outcome": "success",
    },
)
```

Rules that survive contact with an incident:

- **One event per decision**, named `noun.verb` in the past tense.
- **Never log secrets or card data.** Redact at the logger, not at each call
  site, so a new call site cannot leak.
- **Log the inputs to a decision and the decision**, not the intermediate steps.
- **Include the identifiers you will want to group by**: tenant, route, version,
  region.
- **Sample the high-volume events** and record the sampling rate in the event, so
  counts remain reconcilable.

## Distributed Tracing

For a failure that spans services, a trace answers "where did the time go and
where did it stop" in one view.

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("settle_payment") as span:
    span.set_attribute("tenant.id", tenant.id)
    span.set_attribute("payment.provider", "stripe")
    try:
        result = provider.settle(intent_id)
    except ProviderError as exc:
        span.record_exception(exc)
        span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
        raise
```

Sample intelligently: head-based sampling at a few percent for normal traffic,
**tail-based** sampling to keep 100 % of traces that contain an error or exceed a
latency threshold. Keeping only the boring traces is the common misconfiguration.

## Debugging Without Reproduction

When it happens in production and nowhere else, the difference is the bug.
Enumerate systematically:

| Dimension     | Typical culprits                                              |
| ------------- | ------------------------------------------------------------- |
| Data          | Volume, nulls, unicode, legacy rows, tenant-specific shapes   |
| Concurrency   | Real parallelism, connection pool exhaustion, lock contention |
| Time          | Timezones, DST, clock skew, month and year boundaries         |
| Configuration | Flags, env vars, secrets, limits, timeouts                    |
| Topology      | Multiple instances, sticky sessions, cache per pod, failover  |
| Scale         | Buffer sizes, GC pressure, file descriptors, pagination       |
| Version       | Dependency drift between the image and the lockfile           |

Test one dimension at a time against a copy. Never against production.

### Getting a safe data sample

```sql
-- Shape without content: what does the offending row look like?
SELECT column_name, data_type, is_nullable
FROM information_schema.columns WHERE table_name = 'invoices';

-- Distribution, not values
SELECT status, count(*), min(created_at), max(created_at)
FROM invoices WHERE tenant_id = $1 GROUP BY status;

-- A single row, redacted, for a reproduction fixture
SELECT id, status, currency, amount_minor, created_at
FROM invoices WHERE id = $1;
```

Pull the _shape_ of the data, not customer content. If real content is required,
follow the process for handling production data — approval, minimisation, a time
limit, and deletion afterwards.

## Live Inspection, Safely

Attaching to a live process is possible but never free. Know the cost before you
do it.

```bash
py-spy dump --pid 4242            # read-only stacks, negligible pause
py-spy record --pid 4242 -d 30    # sampling profile, low overhead

jcmd <pid> Thread.print           # cheap
jcmd <pid> GC.heap_dump /tmp/h    # STOPS the JVM for seconds to minutes

curl 'http://localhost:6060/debug/pprof/goroutine?debug=2'   # cheap
curl 'http://localhost:6060/debug/pprof/profile?seconds=30'  # ~few % CPU
```

Rules: take the instance out of the load balancer first when the operation
pauses the process; never attach an interactive debugger to a live serving
instance, because a breakpoint stops a thread that is holding a lock; prefer a
canary instance reproducing the condition.

## Core Dumps and Heap Dumps

```bash
ulimit -c unlimited
echo '/tmp/core.%e.%p' > /proc/sys/kernel/core_pattern

gcore <pid>                       # dump without killing
gdb ./binary /tmp/core.app.4242
(gdb) thread apply all bt full
```

Dumps contain everything in memory — credentials, tokens, customer records.
Treat a dump with the same controls as the database it came from: encrypted at
rest, access logged, deleted on a schedule.

## Feature Flags as a Diagnostic

A flag lets you bisect in production without a deploy.

```python
if flags.enabled("billing.new_vat_engine", tenant=tenant.id):
    return new_engine.calculate(invoice)
return legacy_engine.calculate(invoice)
```

Enable for one internal tenant, then a percentage, watching the metric that
represents the symptom. If it moves, you have your cause with no rollback
needed. Remove the flag once the question is answered — stale flags become the
next incident.

## Post-Mortem Content That Matters

Write it blameless, and make the interesting section the detection gap:

- **Timeline** — first occurrence, first alert, first human aware, mitigation,
  resolution. The gap between the first two is usually the real finding.
- **Impact** — users, requests, money, data, stated plainly.
- **Cause** — the decision, not the line of code.
- **Why it was not caught** — the missing test, type, alert or review step.
- **Actions** — each owned and dated, distinguishing prevention from detection.

An action item without an owner is a wish. One that only says "be more careful"
is not an action.
