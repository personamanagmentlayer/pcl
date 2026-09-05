# Browser Automation — Playwright Recipes

Reference material for the `browser-automation-expert` skill. See [SKILL.md](../SKILL.md).

Python sync API throughout; the async and Node APIs mirror it closely.

## Waiting Correctly

```python
page.wait_for_selector("[data-testid=results]", state="visible", timeout=15_000)
page.wait_for_load_state("networkidle")            # no request for 500 ms
page.wait_for_function("() => window.__APP_READY__ === true")
page.wait_for_url("**/dashboard")

with page.expect_response(lambda r: "/api/search" in r.url and r.ok) as info:
    page.click("#search")
data = info.value.json()                           # the response, not the DOM
```

`expect_response` is the most reliable of these: it waits for the actual data
rather than for a proxy signal, and it hands you the payload.

Avoid `networkidle` on pages with polling or analytics beacons — it never
settles. Wait for the specific element or response instead.

## Infinite Scroll

```python
def scroll_until_stable(page, item_selector: str, max_rounds: int = 50) -> int:
    previous = 0
    for _ in range(max_rounds):
        page.mouse.wheel(0, 20_000)
        try:
            page.wait_for_function(
                "(sel, n) => document.querySelectorAll(sel).length > n",
                arg=[item_selector, previous],
                timeout=5_000,
            )
        except TimeoutError:
            break                                   # no new items: the end
        previous = page.locator(item_selector).count()
    return previous
```

Bound the rounds. An infinite scroll that genuinely never ends will otherwise run
until the process dies, and memory grows with the DOM.

## Pagination

```python
def paginate(page, next_selector: str, max_pages: int = 100):
    for page_number in range(max_pages):
        yield page.content()
        next_link = page.locator(next_selector)
        if next_link.count() == 0 or not next_link.first.is_enabled():
            return
        with page.expect_navigation(wait_until="domcontentloaded"):
            next_link.first.click()
```

Prefer URL-driven pagination when the site exposes it (`?page=2`) — it is
resumable and parallelisable, whereas clicking through is neither.

## Downloads

```python
with page.expect_download(timeout=60_000) as info:
    page.click("#export-csv")
download = info.value
download.save_as(f"/data/exports/{download.suggested_filename}")
```

Sanitise `suggested_filename` before joining it to a path — it is attacker
controlled and may contain traversal sequences.

## Uploads

```python
page.set_input_files("input[type=file]", "/tmp/document.pdf")
page.set_input_files("input[type=file]", [])       # clear the selection

# Uploads triggered by a button rather than a visible input
with page.expect_file_chooser() as info:
    page.click("#attach")
info.value.set_files("/tmp/document.pdf")
```

## Frames and Shadow DOM

```python
frame = page.frame_locator("iframe[title='Payment form']")
frame.locator("#card-number").fill("4242424242424242")

# Playwright pierces open shadow roots automatically
page.locator("custom-widget >> button.submit").click()

# Closed shadow roots require in-page evaluation
page.evaluate("""() => {
  const host = document.querySelector('custom-widget');
  host.shadowRoot.querySelector('button.submit').click();
}""")
```

Third-party payment iframes usually block automation deliberately. Use the
provider's test mode and their documented test harness rather than fighting it.

## Screenshots and PDFs

```python
page.screenshot(path="page.png", full_page=True)
page.locator("#chart").screenshot(path="chart.png")

page.emulate_media(media="print")
page.pdf(
    path="page.pdf",
    format="A4",
    print_background=True,
    margin={"top": "20mm", "bottom": "20mm", "left": "18mm", "right": "18mm"},
)
```

`page.pdf()` is Chromium-only and requires headless mode.

For visually stable screenshots, freeze the sources of noise:

```python
page.add_style_tag(content="*, *::before, *::after { animation: none !important; transition: none !important; }")
page.evaluate("() => document.querySelectorAll('video').forEach(v => v.pause())")
```

## Blocking and Rewriting Requests

```python
BLOCKED = {"image", "font", "media"}
BLOCKED_HOSTS = ("googletagmanager.com", "doubleclick.net", "hotjar.com")

def router(route):
    request = route.request
    if request.resource_type in BLOCKED or any(h in request.url for h in BLOCKED_HOSTS):
        return route.abort()
    route.continue_()

context.route("**/*", router)
```

Blocking analytics and media typically halves page load time and removes a class
of flakiness caused by third-party outages.

Serving a fixture instead of a live response, useful for reproducing a bug:

```python
context.route("**/api/search*", lambda route: route.fulfill(
    status=200, content_type="application/json", body=json.dumps(FIXTURE)
))
```

## Sessions, Proxies and Contexts

```python
context = browser.new_context(
    storage_state="state.json",
    proxy={"server": "http://proxy.internal:3128"},
    ignore_https_errors=False,                     # keep verification on
    extra_http_headers={"Accept-Language": "en-GB,en;q=0.9"},
    timezone_id="Europe/Paris",
    locale="en-GB",
)
```

One context per logical session. Contexts are cheap and isolated; a new
_browser_ per page is not, and is the usual cause of runaway memory.

## Containerised Deployment

```dockerfile
FROM mcr.microsoft.com/playwright/python:v1.49.0-noble

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
USER pwuser
CMD ["python", "-m", "scraper"]
```

```yaml
services:
  scraper:
    build: .
    ipc: host # prevents Chromium crashing on shared memory limits
    shm_size: 1gb
    mem_limit: 2g
    security_opt: ['seccomp=seccomp_profile.json']
    read_only: true
    tmpfs: ['/tmp']
```

Pin the image to the Playwright version in your lockfile: a browser newer than
the client library fails in obscure ways.

## Resource Discipline

```python
from contextlib import contextmanager

@contextmanager
def browser_session(**context_kwargs):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--disable-dev-shm-usage"])
        context = browser.new_context(**context_kwargs)
        context.set_default_timeout(20_000)
        try:
            yield context
        finally:
            context.close()
            browser.close()
```

Always close in a `finally`. An exception that skips cleanup leaks a Chromium
process; a few hundred of those take down the host.

For long crawls, recycle the context every few hundred pages — memory grows with
accumulated history and caches regardless of how carefully you close pages.

## Debugging

```bash
PWDEBUG=1 python scraper.py              # inspector, step through, pick selectors
playwright codegen https://example.com   # record interactions into code
```

```python
context.tracing.start(screenshots=True, snapshots=True, sources=True)
try:
    run()
finally:
    context.tracing.stop(path="trace.zip")   # open at trace.playwright.dev
```

The trace viewer gives a DOM snapshot at every action, which is the fastest way
to find out why a selector matched nothing on a page you can no longer reproduce.
