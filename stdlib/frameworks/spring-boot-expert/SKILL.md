---
name: spring-boot-expert
version: 1.1.0
description: >-
  Expert-level Spring Boot, Spring Framework, REST APIs, and microservices development. Use
  when the user mentions Java, Spring framework, REST APIs, or microservices, or when the
  task involves Spring Boot Fundamentals.
category: frameworks
tags: [spring-boot, java, spring-framework, rest-api, microservices]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(mvn:*, gradle:*, java:*)
---

# Spring Boot Expert

Expert guidance for Spring Boot development, Spring Framework, building REST APIs, and microservices architecture.

## Core Concepts

### Spring Boot Fundamentals

- Auto-configuration
- Dependency injection
- Spring Boot Starters
- Application properties
- Profiles and configuration
- Spring Boot Actuator

### Spring Framework

- Spring Core (IoC, DI)
- Spring Data JPA
- Spring Security
- Spring Web MVC
- Spring AOP
- Spring Transaction Management

### Microservices

- Service discovery
- API Gateway
- Circuit breakers
- Distributed tracing
- Configuration management

## Spring Boot Application

```java
// Main application class
@SpringBootApplication
@EnableJpaAuditing
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

// Entity with JPA
@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL)
    private List<Post> posts = new ArrayList<>();

    // Getters and setters
}

@Entity
@Table(name = "posts")
public class Post {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User author;

    @CreatedDate
    private LocalDateTime createdAt;

    // Getters and setters
}
```

## REST API Controller

```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<UserDto>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<UserDto> users = userService.findAll(pageable);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UserDto> createUser(
            @Valid @RequestBody UserCreateDto userDto
    ) {
        UserDto created = userService.create(userDto);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDto> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateDto userDto
    ) {
        return userService.update(id, userDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (userService.delete(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}

// DTOs with validation
public record UserDto(
        Long id,
        String email,
        LocalDateTime createdAt
) {}

public record UserCreateDto(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8) String password
) {}

public record UserUpdateDto(
        @Email String email
) {}
```

## Service Layer

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    public Page<UserDto> findAll(Pageable pageable) {
        return userRepository.findAll(pageable)
                .map(userMapper::toDto);
    }

    public Optional<UserDto> findById(Long id) {
        return userRepository.findById(id)
                .map(userMapper::toDto);
    }

    public Optional<UserDto> findByEmail(String email) {
        return userRepository.findByEmail(email)
                .map(userMapper::toDto);
    }

    @Transactional
    public UserDto create(UserCreateDto dto) {
        if (userRepository.existsByEmail(dto.email())) {
            throw new DuplicateEmailException("Email already exists");
        }

        User user = new User();
        user.setEmail(dto.email());
        user.setPassword(passwordEncoder.encode(dto.password()));

        User saved = userRepository.save(user);
        return userMapper.toDto(saved);
    }

    @Transactional
    public Optional<UserDto> update(Long id, UserUpdateDto dto) {
        return userRepository.findById(id)
                .map(user -> {
                    if (dto.email() != null) {
                        user.setEmail(dto.email());
                    }
                    return userMapper.toDto(user);
                });
    }

    @Transactional
    public boolean delete(Long id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return true;
        }
        return false;
    }
}

// Repository
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.createdAt > :date")
    List<User> findRecentUsers(@Param("date") LocalDateTime date);
}

// Mapper with MapStruct
@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDto toDto(User user);
    User toEntity(UserCreateDto dto);
}
```

## Exception Handling

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        ErrorResponse error = new ErrorResponse(
                "NOT_FOUND",
                ex.getMessage(),
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEmail(DuplicateEmailException ex) {
        ErrorResponse error = new ErrorResponse(
                "DUPLICATE_EMAIL",
                ex.getMessage(),
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidation(
            MethodArgumentNotValidException ex
    ) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
        );

        ValidationErrorResponse response = new ValidationErrorResponse(
                "VALIDATION_ERROR",
                "Request validation failed",
                errors,
                LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        ErrorResponse error = new ErrorResponse(
                "INTERNAL_ERROR",
                "An unexpected error occurred",
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}

public record ErrorResponse(
        String code,
        String message,
        LocalDateTime timestamp
) {}

public record ValidationErrorResponse(
        String code,
        String message,
        Map<String, String> errors,
        LocalDateTime timestamp
) {}
```

## Configuration

```yaml
# application.yml
spring:
  application:
    name: user-service

  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:postgres}
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.PostgreSQLDialect

  flyway:
    enabled: true
    baseline-on-migrate: true

server:
  port: 8080
  error:
    include-message: always
    include-binding-errors: always

jwt:
  secret: ${JWT_SECRET:your-secret-key-here}
  expiration: 3600000 # 1 hour

logging:
  level:
    root: INFO
    com.example: DEBUG
```

## Best Practices

- Use constructor injection
- Separate concerns (Controller/Service/Repository)
- Implement proper exception handling
- Use DTOs for API layer
- Write comprehensive tests
- Use database migrations (Flyway/Liquibase)
- Implement security properly
- Use profiles for different environments
- Enable Spring Boot Actuator for monitoring
- Use connection pooling
- Implement caching where appropriate
- Follow RESTful conventions

## Anti-Patterns

❌ Field injection
❌ Business logic in controllers
❌ No exception handling
❌ Exposing entities directly
❌ Hardcoded configuration
❌ No transaction management
❌ Missing validation

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Spring Security with JWT](references/SPRING_SECURITY_WITH_JWT.md)
- [Testing](references/TESTING.md)

## Resources

- Spring Boot Documentation: https://spring.io/projects/spring-boot
- Spring Framework: https://spring.io/projects/spring-framework
- Spring Data JPA: https://spring.io/projects/spring-data-jpa
- Spring Security: https://spring.io/projects/spring-security
- Baeldung: https://www.baeldung.com/
