# Nim Expert — Code Examples

Reference material for the `nim-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Installation and Setup

```bash
# Install Nim using choosenim (recommended)
curl https://nim-lang.org/choosenim/init.sh -sSf | sh

# Or download from https://nim-lang.org/install.html

# Verify installation
nim --version
nimble --version

# Create new package
nimble init

# Install dependencies
nimble install asyncdispatch
nimble install nimpy

# Compile and run
nim c -r main.nim

# Optimized release build
nim c -d:release --opt:speed main.nim

# Run tests
nimble test
```

### Basic Syntax and Features

```nim
import std/[strutils, sequtils, tables, options]

# Type definitions
type
  Person = object
    name: string
    age: int
    email: Option[string]

  Animal = ref object of RootObj
    name: string

  Dog = ref object of Animal
    breed: string

# Procedures
proc greet(name: string): string =
  result = "Hello, " & name & "!"

# Method call syntax (UFCS)
proc toUpper(s: string): string =
  s.toUpperAscii()

# Generic procedure
proc swap[T](a, b: var T) =
  let temp = a
  a = b
  b = temp

# Multiple return values (tuples)
proc divMod(a, b: int): (int, int) =
  (a div b, a mod b)

# Iterator
iterator countTo(n: int): int =
  var i = 0
  while i <= n:
    yield i
    inc i

proc main() =
  # Variables
  var mutableValue = 42
  let immutableValue = 100
  const compileTimeValue = 1000

  # String manipulation with UFCS
  let message = "hello world".toUpper().strip()
  echo message

  # Sequence operations
  let numbers = @[1, 2, 3, 4, 5]
  let doubled = numbers.map(x => x * 2)
  let evens = numbers.filter(x => x mod 2 == 0)

  # Table (hash map)
  var scores = initTable[string, int]()
  scores["Alice"] = 100
  scores["Bob"] = 95

  # Option types
  let person = Person(
    name: "Alice",
    age: 30,
    email: some("alice@example.com")
  )

  if person.email.isSome:
    echo "Email: ", person.email.get()

  # Pattern matching
  case mutableValue
  of 0..10: echo "Small"
  of 11..100: echo "Medium"
  else: echo "Large"

when isMainModule:
  main()
```

### Macros and Metaprogramming

```nim
import macros, strutils

# Template for code generation
template benchmark(name: string, code: untyped) =
  let t0 = cpuTime()
  code
  let elapsed = cpuTime() - t0
  echo name, " took ", elapsed, " seconds"

# Macro for AST manipulation
macro debug(n: varargs[typed]): untyped =
  result = newStmtList()
  for arg in n:
    result.add newCall("echo", newLit(arg.repr & " = "), arg)

# Custom DSL with macro
macro html(body: untyped): string =
  proc toHtml(n: NimNode): string =
    case n.kind
    of nnkIdent:
      "<" & $n & ">"
    of nnkCall:
      let tag = $n[0]
      var attrs = ""
      var content = ""
      for i in 1..<n.len:
        if n[i].kind == nnkExprEqExpr:
          attrs.add " " & $n[i][0] & "=\"" & $n[i][1] & "\""
        else:
          content.add toHtml(n[i])
      "<" & tag & attrs & ">" & content & "</" & tag & ">"
    of nnkStmtList:
      var res = ""
      for child in n:
        res.add toHtml(child)
      res
    else:
      ""

  result = newLit(toHtml(body))

# Compile-time computation
proc fib(n: int): int {.compileTime.} =
  if n <= 1: n
  else: fib(n - 1) + fib(n - 2)

const fib10 = fib(10)  # Computed at compile time

# Type class (generic constraint)
type
  Addable = concept a
    a + a is type(a)

proc sum[T: Addable](values: seq[T]): T =
  result = T.default
  for v in values:
    result = result + v

proc main() =
  # Use template
  benchmark "Loop":
    var total = 0
    for i in 1..1000000:
      total += i

  # Use debug macro
  let x = 42
  let y = "hello"
  debug(x, y)

  # Use HTML DSL
  let page = html:
    div(class="container"):
      h1: "Welcome"
      p: "Hello World"
  echo page

  # Compile-time value
  echo "Fibonacci(10) = ", fib10

  # Generic with type class
  let numbers = @[1, 2, 3, 4, 5]
  echo "Sum: ", sum(numbers)

when isMainModule:
  main()
```

### Async/Await Programming

```nim
import asyncdispatch, httpclient, json, strutils

# Basic async procedure
proc fetchUrl(url: string): Future[string] {.async.} =
  let client = newAsyncHttpClient()
  try:
    result = await client.getContent(url)
  finally:
    client.close()

# Async with error handling
proc fetchJson(url: string): Future[JsonNode] {.async.} =
  try:
    let content = await fetchUrl(url)
    result = parseJson(content)
  except HttpRequestError:
    echo "HTTP request failed"
    raise
  except JsonParsingError:
    echo "JSON parsing failed"
    raise

# Parallel async operations
proc fetchMultiple(urls: seq[string]): Future[seq[string]] {.async.} =
  var futures = newSeq[Future[string]]()
  for url in urls:
    futures.add(fetchUrl(url))

  result = await all(futures)

# Async server
import asynchttpserver

proc handleRequest(req: Request): Future[void] {.async.} =
  let response = "Hello, World!"
  await req.respond(Http200, response)

proc startServer() {.async.} =
  let server = newAsyncHttpServer()
  echo "Server starting on port 8080"
  await server.serve(Port(8080), handleRequest)

# Async with timeout
proc fetchWithTimeout(url: string, timeoutMs: int): Future[string] {.async.} =
  let fetchFuture = fetchUrl(url)
  let timeoutFuture = sleepAsync(timeoutMs)

  await fetchFuture or timeoutFuture

  if fetchFuture.finished:
    result = fetchFuture.read()
  else:
    raise newException(TimeoutError, "Request timed out")

proc main() {.async.} =
  # Fetch single URL
  let content = await fetchUrl("https://api.github.com")
  echo "Fetched ", content.len, " bytes"

  # Fetch multiple URLs in parallel
  let urls = @[
    "https://api.github.com/users/nim-lang",
    "https://api.github.com/repos/nim-lang/Nim"
  ]
  let results = await fetchMultiple(urls)
  echo "Fetched ", results.len, " URLs"

  # Fetch with timeout
  try:
    let data = await fetchWithTimeout("https://api.github.com", 5000)
    echo "Success: ", data.len, " bytes"
  except TimeoutError:
    echo "Request timed out"

when isMainModule:
  waitFor main()
```

### Python Interoperability

```nim
import nimpy

# Call Python from Nim
proc usePython() =
  let py = pyBuiltinsModule()

  # Use Python built-ins
  let pyList = py.list(@[1, 2, 3, 4, 5])
  echo "Python list: ", pyList

  # Import Python modules
  let os = pyImport("os")
  let cwd = os.getcwd()
  echo "Current directory: ", cwd

  # Use NumPy
  let np = pyImport("numpy")
  let arr = np.array(@[@[1, 2], @[3, 4]])
  echo "NumPy array:\n", arr

  # Call Python functions
  let math = pyImport("math")
  let result = math.sqrt(16)
  echo "sqrt(16) = ", result

  # Python dictionary
  let requests = pyImport("requests")
  let response = requests.get("https://api.github.com")
  echo "Status code: ", response.status_code

# Export Nim functions to Python
proc fibonacci(n: int): int {.exportpy.} =
  if n <= 1: n
  else: fibonacci(n - 1) + fibonacci(n - 2)

proc processData(data: seq[int]): seq[int] {.exportpy.} =
  data.map(x => x * 2)

proc main() =
  usePython()

when isMainModule:
  main()
```

### C Interoperability

```nim
# Import C functions
proc printf(format: cstring): cint {.importc, varargs, header: "<stdio.h>".}
proc malloc(size: csize_t): pointer {.importc, header: "<stdlib.h>".}
proc free(p: pointer) {.importc, header: "<stdlib.h>".}

# C struct
type
  CPoint {.importc: "struct point", header: "point.h".} = object
    x, y: cint

# Export Nim function to C
proc nimAdd(a, b: cint): cint {.exportc.} =
  a + b

# Wrapper for C library
proc useCFunctions() =
  # Call C printf
  printf("Hello from C!\n")

  # C memory management
  let ptr = malloc(100)
  # Use ptr...
  free(ptr)

  # Use C struct
  var point: CPoint
  point.x = 10
  point.y = 20

# FFI with dynlib
proc openLibrary(): pointer =
  {.emit: """
  #include <dlfcn.h>
  void* lib = dlopen("libexample.so", RTLD_LAZY);
  return lib;
  """.}

proc main() =
  useCFunctions()

when isMainModule:
  main()
```
