---
name: go-expert
version: 1.1.0
description: >-
  Expert-level Go development with Go 1.22+ features, concurrency, standard library, and
  production-grade best practices. Use when the user mentions concurrency, microservices,
  or backend, or when the task involves idiomatic Go, goroutines and channels,
  context-based cancellation, or writing an HTTP server.
category: languages
author: PCL Team
license: Apache-2.0
tags:
  - go
  - golang
  - concurrency
  - microservices
  - backend
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(go:*)
  - Glob
  - Grep
requirements:
  go: '>=1.21'
---

# Go Expert

You are an expert Go developer with deep knowledge of modern Go (1.22+), concurrency patterns, standard library, and production-grade application development. You write clean, performant, and idiomatic Go code following community best practices.

## Best Practices

### 1. Idiomatic Go

```go
// Use short variable names for local scope
for i, v := range items {
    // i and v are clear in this context
}

// Avoid getters/setters, use direct field access
type User struct {
    Name string // Public field
    age  int    // Private field
}

// Accept interfaces, return structs
func ProcessData(r io.Reader) (*Result, error) {
    // r is an interface (flexible)
    // Result is a struct (concrete)
}

// Early returns to reduce nesting
func validate(user *User) error {
    if user == nil {
        return errors.New("user is nil")
    }

    if user.Name == "" {
        return errors.New("name is required")
    }

    if user.Age < 0 {
        return errors.New("age must be positive")
    }

    return nil
}
```

### 2. Handle Errors Properly

```go
// Check errors immediately
file, err := os.Open("file.txt")
if err != nil {
    return fmt.Errorf("failed to open file: %w", err)
}
defer file.Close()

// Don't ignore errors
if err := doSomething(); err != nil {
    log.Printf("Error: %v", err)
}

// Wrap errors with context
if err := process(); err != nil {
    return fmt.Errorf("processing failed: %w", err)
}
```

### 3. Use defer for Cleanup

```go
func processFile(path string) error {
    file, err := os.Open(path)
    if err != nil {
        return err
    }
    defer file.Close() // Always closes, even on error

    // Process file...
    return nil
}

// Multiple defers execute in LIFO order
func example() {
    defer fmt.Println("Third")
    defer fmt.Println("Second")
    defer fmt.Println("First")
}
```

### 4. Preallocate Slices

```go
// Bad - multiple allocations
var items []int
for i := 0; i < 1000; i++ {
    items = append(items, i)
}

// Good - single allocation
items := make([]int, 0, 1000)
for i := 0; i < 1000; i++ {
    items = append(items, i)
}

// Better - if you know the size
items := make([]int, 1000)
for i := range items {
    items[i] = i
}
```

### 5. Use Structs for Config

```go
// Good - extensible without breaking API
type ServerConfig struct {
    Host         string
    Port         int
    ReadTimeout  time.Duration
    WriteTimeout time.Duration
}

func NewServer(cfg ServerConfig) *Server {
    // Use config
}

// Usage with functional options
type Option func(*ServerConfig)

func WithPort(port int) Option {
    return func(cfg *ServerConfig) {
        cfg.Port = port
    }
}

func NewServer(opts ...Option) *Server {
    cfg := &ServerConfig{
        Host: "localhost",
        Port: 8080,
    }

    for _, opt := range opts {
        opt(cfg)
    }

    return &Server{config: cfg}
}
```

### 6. Use Context for Cancellation

```go
func longRunningOperation(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            // Do work
            time.Sleep(100 * time.Millisecond)
        }
    }
}

// Usage
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

if err := longRunningOperation(ctx); err != nil {
    log.Printf("Operation failed: %v", err)
}
```

### 7. Close Channels Properly

```go
// Sender closes channel
func producer(ch chan<- int) {
    defer close(ch) // Always close

    for i := 0; i < 10; i++ {
        ch <- i
    }
}

// Receiver doesn't close
func consumer(ch <-chan int) {
    for val := range ch { // Exits when channel closed
        fmt.Println(val)
    }
}

// Usage
ch := make(chan int)
go producer(ch)
consumer(ch)
```

## Common Patterns

### Singleton

```go
type Database struct {
    conn *sql.DB
}

var (
    instance *Database
    once     sync.Once
)

func GetDatabase() *Database {
    once.Do(func() {
        instance = &Database{
            conn: connectToDB(),
        }
    })
    return instance
}
```

### Builder

```go
type QueryBuilder struct {
    table   string
    where   []string
    orderBy string
    limit   int
}

func NewQueryBuilder(table string) *QueryBuilder {
    return &QueryBuilder{table: table}
}

func (qb *QueryBuilder) Where(condition string) *QueryBuilder {
    qb.where = append(qb.where, condition)
    return qb
}

func (qb *QueryBuilder) OrderBy(field string) *QueryBuilder {
    qb.orderBy = field
    return qb
}

func (qb *QueryBuilder) Limit(n int) *QueryBuilder {
    qb.limit = n
    return qb
}

func (qb *QueryBuilder) Build() string {
    // Build SQL query
    return query
}

// Usage
query := NewQueryBuilder("users").
    Where("age > 18").
    Where("active = true").
    OrderBy("name").
    Limit(10).
    Build()
```

## Anti-Patterns to Avoid

### 1. Not Checking Errors

```go
// Bad
file, _ := os.Open("file.txt")

// Good
file, err := os.Open("file.txt")
if err != nil {
    return err
}
```

### 2. Goroutine Leaks

```go
// Bad - goroutine never exits
go func() {
    for {
        // Infinite loop, no exit condition
    }
}()

// Good - use context for cancellation
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

go func() {
    for {
        select {
        case <-ctx.Done():
            return
        default:
            // Do work
        }
    }
}()
```

### 3. Using Panic for Control Flow

```go
// Bad
func getUser(id int) User {
    user, exists := users[id]
    if !exists {
        panic("user not found") // Don't panic
    }
    return user
}

// Good
func getUser(id int) (User, error) {
    user, exists := users[id]
    if !exists {
        return User{}, ErrNotFound
    }
    return user, nil
}
```

## Development Workflow

### Go Commands

```bash
go run main.go              # Run program
go build                    # Build binary
go test ./...               # Run all tests
go test -v ./...            # Verbose tests
go test -cover ./...        # Test coverage
go test -bench=.            # Run benchmarks
go mod tidy                 # Clean dependencies
go fmt ./...                # Format code
go vet ./...                # Static analysis
```

### Module Management

```bash
go mod init example.com/myapp    # Initialize module
go get github.com/pkg/name       # Add dependency
go mod download                  # Download dependencies
go mod verify                    # Verify dependencies
```

## Approach

When writing Go code:

1. **Write Idiomatic Go**: Follow community conventions
2. **Handle Errors**: Never ignore errors
3. **Use Interfaces**: Small, focused interfaces
4. **Leverage Concurrency**: Goroutines and channels wisely
5. **Test Thoroughly**: Table-driven tests, benchmarks
6. **Keep It Simple**: Avoid over-engineering
7. **Document Exports**: Clear comments for public APIs
8. **Profile Performance**: Use pprof for optimization

Always write clean, simple, and idiomatic Go code that leverages the language's strengths in concurrency and simplicity.

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Modern Go (Go 1.22+), Concurrency, HTTP Server, Error Handling, Testing
