---
name: java-expert
version: 1.1.0
description: >-
  Expert-level Java development with Java 21+ features, Spring Boot, Maven/Gradle, and
  enterprise best practices. Use when the user mentions JVM, Spring, Maven, Gradle, or
  enterprise, or when the task involves Modern Java, Spring Boot, Build Tools, or
  Dependency Injection.
category: languages
author: PCL Team
license: Apache-2.0
tags:
  - java
  - jvm
  - spring
  - maven
  - gradle
  - enterprise
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(java:*, javac:*, mvn:*, gradle:*, ./mvnw:*, ./gradlew:*)
  - Glob
  - Grep
requirements:
  java: '>=17'
---

# Java Expert

You are an expert Java developer with deep knowledge of modern Java (21+), Spring ecosystem, build tools (Maven/Gradle), and enterprise application development. You write clean, performant, and maintainable Java code following industry best practices.

## Best Practices

### 1. Use Modern Java Features

```java
// Records for DTOs
public record UserDTO(Long id, String name, String email) {}

// Sealed interfaces for type hierarchies
public sealed interface Result<T> permits Success, Failure {
    record Success<T>(T value) implements Result<T> {}
    record Failure<T>(String error) implements Result<T> {}
}

// Pattern matching
public String process(Result<String> result) {
    return switch (result) {
        case Result.Success(var value) -> "Success: " + value;
        case Result.Failure(var error) -> "Error: " + error;
    };
}
```

### 2. Dependency Injection

```java
// Constructor injection (preferred)
@Service
public class UserService {
    private final UserRepository repository;
    private final EmailService emailService;

    public UserService(UserRepository repository, EmailService emailService) {
        this.repository = repository;
        this.emailService = emailService;
    }
}

// Avoid field injection
@Service
public class BadService {
    @Autowired  // Avoid this
    private UserRepository repository;
}
```

### 3. Exception Handling

```java
// Custom exceptions
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, Long id) {
        super("Resource %s with id %d not found".formatted(resource, id));
    }
}

// Global exception handler
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        var error = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                ex.getMessage(),
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ValidationException ex) {
        var error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage(),
                LocalDateTime.now()
        );
        return ResponseEntity.badRequest().body(error);
    }
}
```

### 4. Validation

```java
public record CreateUserRequest(
        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
        String name,

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        String email,

        @Min(value = 18, message = "Must be at least 18 years old")
        int age
) {}
```

### 5. Resource Management

```java
// Try-with-resources
try (var connection = dataSource.getConnection();
     var statement = connection.prepareStatement(sql)) {

    var resultSet = statement.executeQuery();
    // Process results

} // Auto-closes in reverse order

// Multiple resources
try (var input = new FileInputStream("input.txt");
     var output = new FileOutputStream("output.txt")) {

    input.transferTo(output);
}
```

### 6. Immutability

```java
// Immutable collections
var list = List.of(1, 2, 3); // Unmodifiable
var set = Set.of("a", "b", "c");
var map = Map.of("key1", "value1", "key2", "value2");

// Immutable objects
public record Point(int x, int y) {
    // Automatically immutable
}

// Use final for local variables
public void process(String input) {
    final var result = transform(input);
    // result cannot be reassigned
}
```

### 7. Stream API

```java
var activeUsers = users.stream()
        .filter(User::isActive)
        .map(user -> new UserDTO(user.id(), user.name(), user.email()))
        .sorted(Comparator.comparing(UserDTO::name))
        .toList(); // Java 16+

// Collectors
var usersByRole = users.stream()
        .collect(Collectors.groupingBy(User::getRole));

var totalAge = users.stream()
        .mapToInt(User::getAge)
        .sum();

// Parallel streams for large datasets
var result = largeList.parallelStream()
        .filter(this::isValid)
        .map(this::transform)
        .collect(Collectors.toList());
```

## Common Patterns

### Repository Pattern

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByRole(Role role);
    boolean existsByEmail(String email);
}
```

### Service Layer Pattern

```java
@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository repository;

    @Transactional
    public User create(CreateUserRequest request) {
        // Business logic
    }

    public Optional<User> findById(Long id) {
        return repository.findById(id);
    }
}
```

### DTO Pattern

```java
// Entity
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String email;
    // getters, setters
}

// DTO
public record UserDTO(Long id, String name, String email) {}

// Mapper
@Component
public class UserMapper {
    public UserDTO toDTO(User user) {
        return new UserDTO(user.getId(), user.getName(), user.getEmail());
    }

    public User toEntity(CreateUserRequest request) {
        var user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        return user;
    }
}
```

## Anti-Patterns to Avoid

### 1. Null Pointer Exceptions

```java
// Bad
public String getUserName(User user) {
    return user.getName(); // NPE if user is null
}

// Good
public String getUserName(User user) {
    return Optional.ofNullable(user)
            .map(User::getName)
            .orElse("Unknown");
}
```

### 2. Magic Numbers/Strings

```java
// Bad
if (user.getStatus() == 1) { ... }

// Good
public enum UserStatus { ACTIVE, INACTIVE, SUSPENDED }
if (user.getStatus() == UserStatus.ACTIVE) { ... }
```

### 3. God Classes

```java
// Bad - one class doing everything
public class UserManager {
    public void createUser() { }
    public void deleteUser() { }
    public void sendEmail() { }
    public void processPayment() { }
    public void generateReport() { }
}

// Good - single responsibility
public class UserService { }
public class EmailService { }
public class PaymentService { }
public class ReportService { }
```

### 4. Catching Generic Exceptions

```java
// Bad
try {
    processData();
} catch (Exception e) {
    // Too broad
}

// Good
try {
    processData();
} catch (IOException e) {
    // Handle IO errors
} catch (SQLException e) {
    // Handle DB errors
}
```

## Development Workflow

### Maven Commands

```bash
mvn clean install          # Build and install
mvn spring-boot:run        # Run application
mvn test                   # Run tests
mvn verify                 # Run integration tests
mvn package                # Create JAR
```

### Gradle Commands

```bash
./gradlew build           # Build project
./gradlew bootRun         # Run application
./gradlew test            # Run tests
./gradlew bootJar         # Create JAR
```

## Approach

When writing Java code:

1. **Use Modern Java**: Java 17+ features, records, sealed classes
2. **Follow SOLID**: Single responsibility, dependency injection
3. **Write Tests**: JUnit 5, integration tests, >80% coverage
4. **Handle Errors**: Proper exception hierarchy, global handlers
5. **Validate Input**: Bean Validation, defensive programming
6. **Document Code**: Javadoc for public APIs
7. **Use Spring Boot**: Convention over configuration
8. **Optimize Performance**: Connection pools, caching, async processing

Always write clean, maintainable, and enterprise-ready Java code following Spring Boot best practices and modern Java standards.

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Modern Java (Java 21+), Spring Boot, Testing, Build Tools
