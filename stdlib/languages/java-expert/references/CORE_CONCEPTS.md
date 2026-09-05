# Java Expert — Core Expertise

Reference material for the `java-expert` skill. See [SKILL.md](../SKILL.md).

## Core Expertise

### Modern Java (Java 21+)

**Records (Data Classes):**

```java
// Immutable data carrier
public record User(String name, int age, String email) {
    // Compact constructor for validation
    public User {
        if (age < 0) {
            throw new IllegalArgumentException("Age cannot be negative");
        }
    }

    // Custom methods
    public boolean isAdult() {
        return age >= 18;
    }
}

// Usage
var user = new User("Alice", 30, "alice@example.com");
System.out.println(user.name()); // Alice
```

**Sealed Classes:**

```java
public sealed interface Shape
    permits Circle, Rectangle, Triangle {
    double area();
}

public final class Circle implements Shape {
    private final double radius;

    public Circle(double radius) {
        this.radius = radius;
    }

    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
}

public final class Rectangle implements Shape {
    private final double width, height;

    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }

    @Override
    public double area() {
        return width * height;
    }
}

public non-sealed class Triangle implements Shape {
    private final double base, height;

    public Triangle(double base, double height) {
        this.base = base;
        this.height = height;
    }

    @Override
    public double area() {
        return 0.5 * base * height;
    }
}
```

**Pattern Matching:**

```java
// Pattern matching for instanceof
public String describe(Object obj) {
    if (obj instanceof String s) {
        return "String of length " + s.length();
    } else if (obj instanceof Integer i) {
        return "Integer with value " + i;
    }
    return "Unknown type";
}

// Switch expressions with pattern matching
public double calculateArea(Shape shape) {
    return switch (shape) {
        case Circle c -> Math.PI * Math.pow(c.radius(), 2);
        case Rectangle r -> r.width() * r.height();
        case Triangle t -> 0.5 * t.base() * t.height();
    };
}

// Guarded patterns
public String categorize(Object obj) {
    return switch (obj) {
        case String s when s.length() > 10 -> "Long string";
        case String s -> "Short string";
        case Integer i when i > 100 -> "Large number";
        case Integer i -> "Small number";
        case null -> "Null value";
        default -> "Unknown";
    };
}
```

**Virtual Threads (Project Loom):**

```java
import java.util.concurrent.Executors;

public class VirtualThreadExample {
    public static void main(String[] args) {
        // Virtual thread executor
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            // Submit 10,000 tasks efficiently
            for (int i = 0; i < 10_000; i++) {
                int taskId = i;
                executor.submit(() -> {
                    System.out.println("Task " + taskId + " running on " +
                        Thread.currentThread());
                    Thread.sleep(1000);
                    return null;
                });
            }
        } // Auto-shutdown
    }

    // Structured concurrency
    public User fetchUserData(long userId) throws Exception {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            var userTask = scope.fork(() -> fetchUser(userId));
            var ordersTask = scope.fork(() -> fetchOrders(userId));

            scope.join();
            scope.throwIfFailed();

            return new User(userTask.get(), ordersTask.get());
        }
    }
}
```

**Text Blocks:**

```java
String json = """
    {
        "name": "Alice",
        "age": 30,
        "email": "alice@example.com"
    }
    """;

String sql = """
    SELECT u.id, u.name, COUNT(o.id) as order_count
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.active = true
    GROUP BY u.id, u.name
    ORDER BY order_count DESC
    """;
```

### Spring Boot

**Modern Spring Boot Application:**

```java
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

// RESTful Controller
@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public Page<UserDTO> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return userService.findAll(PageRequest.of(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUser(@PathVariable Long id) {
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDTO createUser(@Valid @RequestBody CreateUserRequest request) {
        return userService.create(request);
    }

    @PutMapping("/{id}")
    public UserDTO updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        return userService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        userService.delete(id);
    }
}

// Service Layer
@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository repository;
    private final UserMapper mapper;

    public UserService(UserRepository repository, UserMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    public Page<UserDTO> findAll(Pageable pageable) {
        return repository.findAll(pageable)
                .map(mapper::toDTO);
    }

    public Optional<UserDTO> findById(Long id) {
        return repository.findById(id)
                .map(mapper::toDTO);
    }

    @Transactional
    public UserDTO create(CreateUserRequest request) {
        var user = mapper.toEntity(request);
        var saved = repository.save(user);
        return mapper.toDTO(saved);
    }

    @Transactional
    public UserDTO update(Long id, UpdateUserRequest request) {
        var user = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        mapper.updateEntity(user, request);
        var saved = repository.save(user);
        return mapper.toDTO(saved);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("User", id);
        }
        repository.deleteById(id);
    }
}

// Repository
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.active = true AND u.createdAt > :date")
    List<User> findRecentActiveUsers(@Param("date") LocalDateTime date);

    @Query(value = """
        SELECT u.* FROM users u
        WHERE u.name ILIKE :search
        OR u.email ILIKE :search
        """, nativeQuery = true)
    List<User> searchUsers(@Param("search") String search);
}
```

**Configuration:**

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("users", "products");
    }
}

@Configuration
@EnableScheduling
public class SchedulingConfig {

    @Scheduled(cron = "0 0 2 * * *") // Daily at 2 AM
    public void cleanupTask() {
        // Cleanup logic
    }

    @Scheduled(fixedDelay = 300000) // Every 5 minutes
    public void healthCheck() {
        // Health check logic
    }
}

// Application properties (application.yml)
/*
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: ${DB_USER}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.PostgreSQLDialect
  cache:
    type: caffeine
    caffeine:
      spec: maximumSize=1000,expireAfterWrite=600s
*/
```

### Testing

**JUnit 5:**

```java
@SpringBootTest
@ActiveProfiles("test")
class UserServiceTest {

    @Autowired
    private UserService userService;

    @MockBean
    private UserRepository userRepository;

    @Test
    @DisplayName("Should create user successfully")
    void shouldCreateUser() {
        // Given
        var request = new CreateUserRequest("Alice", "alice@example.com");
        var user = new User(1L, "Alice", "alice@example.com");

        when(userRepository.save(any(User.class))).thenReturn(user);

        // When
        var result = userService.create(request);

        // Then
        assertThat(result)
                .isNotNull()
                .satisfies(dto -> {
                    assertThat(dto.name()).isEqualTo("Alice");
                    assertThat(dto.email()).isEqualTo("alice@example.com");
                });

        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw exception when user not found")
    void shouldThrowWhenUserNotFound() {
        // Given
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        // When/Then
        assertThatThrownBy(() -> userService.findById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User")
                .hasMessageContaining("999");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "  ", "a@", "@example.com"})
    @DisplayName("Should reject invalid emails")
    void shouldRejectInvalidEmails(String email) {
        var request = new CreateUserRequest("Test", email);

        assertThatThrownBy(() -> userService.create(request))
                .isInstanceOf(ValidationException.class);
    }

    @Nested
    @DisplayName("User search tests")
    class SearchTests {

        @Test
        void shouldFindUsersByName() {
            // Test implementation
        }

        @Test
        void shouldFindUsersByEmail() {
            // Test implementation
        }
    }
}
```

**Integration Testing:**

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase
class UserControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void shouldCreateAndRetrieveUser() {
        // Create
        var request = new CreateUserRequest("Alice", "alice@example.com");
        var response = restTemplate.postForEntity(
                "/api/users",
                request,
                UserDTO.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();

        var userId = response.getBody().id();

        // Retrieve
        var getResponse = restTemplate.getForEntity(
                "/api/users/" + userId,
                UserDTO.class
        );

        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getResponse.getBody())
                .satisfies(user -> {
                    assertThat(user.name()).isEqualTo("Alice");
                    assertThat(user.email()).isEqualTo("alice@example.com");
                });
    }
}
```

### Build Tools

**Maven (pom.xml):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>myapp</artifactId>
    <version>1.0.0-SNAPSHOT</version>

    <properties>
        <java.version>21</java.version>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
        </dependency>

        <!-- Testing -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

**Gradle (build.gradle.kts):**

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
}

group = "com.example"
version = "1.0.0-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_21
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.test {
    useJUnitPlatform()
}
```
