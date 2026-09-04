# Spring Boot Expert — Testing

Reference material for the `spring-boot-expert` skill. See [SKILL.md](../SKILL.md).

## Testing

```java
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void shouldCreateUser() throws Exception {
        UserCreateDto dto = new UserCreateDto("test@example.com", "password123");

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    void shouldGetUser() throws Exception {
        User user = createTestUser();

        mockMvc.perform(get("/api/users/{id}", user.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(user.getEmail()));
    }

    @Test
    void shouldReturnNotFoundForInvalidId() throws Exception {
        mockMvc.perform(get("/api/users/999"))
                .andExpect(status().isNotFound());
    }

    private User createTestUser() {
        User user = new User();
        user.setEmail("test@example.com");
        user.setPassword("hashed-password");
        return userRepository.save(user);
    }
}

// Service unit test
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private UserService userService;

    @Test
    void shouldCreateUser() {
        UserCreateDto dto = new UserCreateDto("test@example.com", "password123");
        User user = new User();
        UserDto expected = new UserDto(1L, "test@example.com", LocalDateTime.now());

        when(userRepository.existsByEmail(dto.email())).thenReturn(false);
        when(passwordEncoder.encode(dto.password())).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(userMapper.toDto(user)).thenReturn(expected);

        UserDto result = userService.create(dto);

        assertNotNull(result);
        assertEquals(expected.email(), result.email());
        verify(userRepository).save(any(User.class));
    }
}
```
