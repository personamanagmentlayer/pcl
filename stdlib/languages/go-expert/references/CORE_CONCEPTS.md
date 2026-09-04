# Go Expert — Core Expertise

Reference material for the `go-expert` skill. See [SKILL.md](../SKILL.md).

## Core Expertise

### Modern Go (Go 1.22+)

**Generics:**

```go
// Generic function
func Map[T any, U any](slice []T, fn func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = fn(v)
    }
    return result
}

// Usage
numbers := []int{1, 2, 3, 4, 5}
doubled := Map(numbers, func(n int) int { return n * 2 })

// Generic types
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true
}

// Type constraints
func Sum[T interface{ int | int64 | float64 }](values []T) T {
    var sum T
    for _, v := range values {
        sum += v
    }
    return sum
}
```

**Enhanced for Loop (Go 1.22):**

```go
// Integer range
for i := range 10 {
    fmt.Println(i) // 0 to 9
}

// Clear and concise iteration
for i, v := range []int{1, 2, 3} {
    fmt.Printf("Index: %d, Value: %d\n", i, v)
}
```

**Structured Logging (slog):**

```go
import "log/slog"

func main() {
    // JSON logger
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

    logger.Info("user logged in",
        "user_id", 123,
        "username", "alice",
        "ip", "192.168.1.1")

    // With context
    logger.With("request_id", "abc123").
        Error("database connection failed",
            "error", err,
            "database", "postgres")
}
```

### Concurrency

**Goroutines and Channels:**

```go
// Worker pool pattern
func workerPool(jobs <-chan int, results chan<- int, workers int) {
    var wg sync.WaitGroup

    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                results <- processJob(job)
            }
        }()
    }

    wg.Wait()
    close(results)
}

// Usage
jobs := make(chan int, 100)
results := make(chan int, 100)

go workerPool(jobs, results, 5)

// Send jobs
for i := 0; i < 100; i++ {
    jobs <- i
}
close(jobs)

// Collect results
for result := range results {
    fmt.Println(result)
}
```

**Context for Cancellation:**

```go
func processWithTimeout(ctx context.Context, data []string) error {
    // Create timeout context
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    resultCh := make(chan error, 1)

    go func() {
        // Simulate long-running operation
        time.Sleep(3 * time.Second)
        resultCh <- nil
    }()

    select {
    case <-ctx.Done():
        return ctx.Err() // Timeout or cancellation
    case err := <-resultCh:
        return err
    }
}

// HTTP request with context
func fetchData(ctx context.Context, url string) (*http.Response, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, err
    }

    client := &http.Client{Timeout: 10 * time.Second}
    return client.Do(req)
}
```

**Select Statement:**

```go
func handleMultipleChannels(ch1, ch2 <-chan int, done <-chan struct{}) {
    for {
        select {
        case val := <-ch1:
            fmt.Println("Received from ch1:", val)
        case val := <-ch2:
            fmt.Println("Received from ch2:", val)
        case <-done:
            fmt.Println("Done signal received")
            return
        case <-time.After(5 * time.Second):
            fmt.Println("Timeout: no activity")
            return
        }
    }
}
```

**Sync Primitives:**

```go
// Mutex for safe concurrent access
type SafeCounter struct {
    mu    sync.RWMutex
    value int
}

func (c *SafeCounter) Inc() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.value++
}

func (c *SafeCounter) Value() int {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.value
}

// Once for one-time initialization
var (
    instance *Database
    once     sync.Once
)

func GetDatabase() *Database {
    once.Do(func() {
        instance = &Database{
            conn: connectToDatabase(),
        }
    })
    return instance
}

// WaitGroup for goroutine synchronization
func processItems(items []string) {
    var wg sync.WaitGroup

    for _, item := range items {
        wg.Add(1)
        go func(item string) {
            defer wg.Done()
            process(item)
        }(item)
    }

    wg.Wait() // Wait for all goroutines
}
```

### HTTP Server

**Standard Library HTTP Server:**

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "time"
)

type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

type Server struct {
    users map[int]User
    mu    sync.RWMutex
}

func NewServer() *Server {
    return &Server{
        users: make(map[int]User),
    }
}

func (s *Server) handleGetUser(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    idStr := r.URL.Query().Get("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        http.Error(w, "Invalid ID", http.StatusBadRequest)
        return
    }

    s.mu.RLock()
    user, exists := s.users[id]
    s.mu.RUnlock()

    if !exists {
        http.Error(w, "User not found", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func (s *Server) handleCreateUser(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var user User
    if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    s.mu.Lock()
    user.ID = len(s.users) + 1
    s.users[user.ID] = user
    s.mu.Unlock()

    w.Header().Set("Content-Type", "application/json")
    w.WriteStatus(http.StatusCreated)
    json.NewEncoder(w).Encode(user)
}

func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        next.ServeHTTP(w, r)

        log.Printf(
            "%s %s %s",
            r.Method,
            r.RequestURI,
            time.Since(start),
        )
    })
}

func main() {
    server := NewServer()

    mux := http.NewServeMux()
    mux.HandleFunc("/users", server.handleGetUser)
    mux.HandleFunc("/users/create", server.handleCreateUser)

    handler := loggingMiddleware(mux)

    srv := &http.Server{
        Addr:         ":8080",
        Handler:      handler,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    log.Println("Server starting on :8080")
    if err := srv.ListenAndServe(); err != nil {
        log.Fatal(err)
    }
}
```

### Error Handling

**Idiomatic Error Handling:**

```go
import "errors"

// Custom error types
type ValidationError struct {
    Field string
    Msg   string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation error on %s: %s", e.Field, e.Msg)
}

// Error wrapping (Go 1.13+)
func processFile(path string) error {
    file, err := os.Open(path)
    if err != nil {
        return fmt.Errorf("failed to open file: %w", err)
    }
    defer file.Close()

    data, err := io.ReadAll(file)
    if err != nil {
        return fmt.Errorf("failed to read file: %w", err)
    }

    if err := validate(data); err != nil {
        return fmt.Errorf("validation failed: %w", err)
    }

    return nil
}

// Error checking
func main() {
    if err := processFile("data.txt"); err != nil {
        if errors.Is(err, os.ErrNotExist) {
            log.Println("File does not exist")
        } else {
            log.Printf("Error: %v", err)
        }
    }
}

// Error type checking
var validationErr *ValidationError
if errors.As(err, &validationErr) {
    log.Printf("Validation failed on field: %s", validationErr.Field)
}

// Sentinel errors
var (
    ErrNotFound     = errors.New("not found")
    ErrUnauthorized = errors.New("unauthorized")
    ErrInvalidInput = errors.New("invalid input")
)

func getUser(id int) (*User, error) {
    if id < 0 {
        return nil, ErrInvalidInput
    }

    user, exists := users[id]
    if !exists {
        return nil, ErrNotFound
    }

    return user, nil
}
```

### Testing

**Table-Driven Tests:**

```go
func TestSum(t *testing.T) {
    tests := []struct {
        name     string
        input    []int
        expected int
    }{
        {"empty slice", []int{}, 0},
        {"single element", []int{5}, 5},
        {"multiple elements", []int{1, 2, 3}, 6},
        {"negative numbers", []int{-1, -2, -3}, -6},
        {"mixed numbers", []int{-1, 0, 1}, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Sum(tt.input)
            if result != tt.expected {
                t.Errorf("Sum(%v) = %d; want %d", tt.input, result, tt.expected)
            }
        })
    }
}
```

**Mocking and Interfaces:**

```go
// Interface for dependency
type UserRepository interface {
    GetUser(id int) (*User, error)
    SaveUser(user *User) error
}

// Service using interface
type UserService struct {
    repo UserRepository
}

func (s *UserService) UpdateUser(id int, name string) error {
    user, err := s.repo.GetUser(id)
    if err != nil {
        return err
    }

    user.Name = name
    return s.repo.SaveUser(user)
}

// Mock for testing
type MockUserRepository struct {
    users map[int]*User
}

func (m *MockUserRepository) GetUser(id int) (*User, error) {
    user, exists := m.users[id]
    if !exists {
        return nil, ErrNotFound
    }
    return user, nil
}

func (m *MockUserRepository) SaveUser(user *User) error {
    m.users[user.ID] = user
    return nil
}

// Test using mock
func TestUserService_UpdateUser(t *testing.T) {
    repo := &MockUserRepository{
        users: map[int]*User{
            1: {ID: 1, Name: "Alice"},
        },
    }

    service := &UserService{repo: repo}

    err := service.UpdateUser(1, "Bob")
    if err != nil {
        t.Fatalf("UpdateUser failed: %v", err)
    }

    user, _ := repo.GetUser(1)
    if user.Name != "Bob" {
        t.Errorf("Name = %s; want Bob", user.Name)
    }
}
```

**Benchmarking:**

```go
func BenchmarkSum(b *testing.B) {
    numbers := []int{1, 2, 3, 4, 5}

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        Sum(numbers)
    }
}

func BenchmarkMapWithPreallocation(b *testing.B) {
    numbers := make([]int, 1000)
    for i := range numbers {
        numbers[i] = i
    }

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        result := make([]int, len(numbers)) // Preallocate
        for j, v := range numbers {
            result[j] = v * 2
        }
    }
}
```
