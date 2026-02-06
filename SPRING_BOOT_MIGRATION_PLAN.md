# Spring Boot Migration Plan: Go → Spring Boot 4 + Java + Gradle Kotlin DSL

**Created**: February 6, 2026
**Status**: Plan Phase
**Target Stack**: Spring Boot 4.0.2, Spring Framework 7.0.3, Java 21 LTS, Gradle 8.x with Kotlin DSL, PostgreSQL, Jakarta EE 11

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Target Architecture](#target-architecture)
4. [Migration Strategy](#migration-strategy)
5. [Detailed Component Mapping](#detailed-component-mapping)
6. [Phase-by-Phase Implementation](#phase-by-phase-implementation)
7. [Testing Strategy](#testing-strategy)
8. [Risks and Mitigation](#risks-and-mitigation)
9. [Timeline Estimate](#timeline-estimate)

---

## Executive Summary

### Objective
Migrate the Viecz backend from **Go + Gin + GORM** to **Spring Boot 4 + Spring Framework 7 + Java 21 + Gradle Kotlin DSL** while maintaining all existing functionality and API contracts.

### Key Metrics
- **62 Go source files** to migrate
- **12 main packages**: auth, config, database, handlers, logger, middleware, models, repository, services, websocket
- **10 models**: User, Task, TaskApplication, Category, Transaction, Wallet, WalletTransaction, Conversation, Message, Payment
- **8 handlers**: Auth, User, Task, Category, Payment, Wallet, WebSocket, Message
- **4 major features**: Authentication (JWT), Task Marketplace, Escrow Payment System, Real-time WebSocket Chat

### Technology Mapping

| Go Stack | Spring Boot Stack |
|----------|------------------|
| Go 1.25.5 | Java 21 LTS |
| Gin Web Framework | Spring Web MVC |
| GORM | Spring Data JPA + Hibernate |
| golang-jwt/jwt | Spring Security + JWT |
| Gorilla WebSocket | Spring WebSocket + STOMP |
| godotenv | Spring Boot @ConfigurationProperties |
| zerolog | SLF4J + Logback |
| Gradle (none) | Gradle 8.x with Kotlin DSL |

### Spring Boot 4 & Spring Framework 7 New Features

**Spring Boot 4.0.2** (released January 2026) and **Spring Framework 7.0.3** bring significant improvements:

**Key Features:**
- **Jakarta EE 11**: Jakarta Servlet 6.1, Jakarta WebSocket 2.2, Jakarta Validation 3.1, Jakarta Persistence 3.2
- **Declarative Interface Clients**: Simplified HTTP client interfaces
- **API Versioning**: Built-in support for REST API versioning
- **Consolidated Spring Security**: Enhanced security configuration
- **BeanRegistrar**: New configuration model for programmatic bean registration
- **Enhanced Virtual Threads Support**: First-class support for Java 21+ virtual threads
- **Improved Observability**: Better metrics and tracing integration

**Java 21 LTS Features We Can Leverage:**

Java 21 LTS (released September 2023, supported until 2029) is strongly recommended for Spring Boot 4:

- **Virtual Threads**: Dramatically improved performance for WebSocket connections and async operations (fully supported in Spring Boot 4!)
- **Record Patterns**: Cleaner data extraction from DTOs and nested data
- **Pattern Matching for switch**: More readable request routing and data handling
- **Sequenced Collections**: Better control over collection ordering (useful for message history)
- **String Templates (Preview)**: Cleaner string formatting for SQL queries and logging
- **Structured Concurrency (Preview)**: Better handling of concurrent operations

---

## Current Architecture Analysis

### Package Structure (Go)
```
server/
├── cmd/server/main.go          # Application entry point
├── internal/
│   ├── auth/                   # JWT authentication & middleware
│   ├── config/                 # Environment configuration
│   ├── database/               # GORM + migrations
│   ├── handlers/               # HTTP handlers (controllers)
│   ├── logger/                 # Zerolog wrapper
│   ├── middleware/             # CORS middleware
│   ├── models/                 # Data models (GORM entities)
│   ├── repository/             # Data access layer
│   ├── services/               # Business logic
│   └── websocket/              # WebSocket hub & client
├── go.mod
└── go.sum
```

### Key Dependencies (Go)
```go
github.com/gin-gonic/gin v1.11.0
github.com/golang-jwt/jwt/v5 v5.3.1
github.com/gorilla/websocket v1.5.3
github.com/payOSHQ/payos-lib-golang/v2 v2.0.1
gorm.io/gorm v1.31.1
gorm.io/driver/postgres v1.6.0
```

### Features Implemented
1. **Authentication** (JWT-based)
   - Register, Login, Token Refresh
   - Middleware for protected routes
   - Bcrypt password hashing

2. **Task Marketplace**
   - CRUD operations for tasks
   - Task applications workflow
   - Category management
   - User profiles (requester/tasker roles)

3. **Escrow Payment System**
   - Mock wallet with balance tracking
   - PayOS integration for real payments
   - Transaction history
   - Platform fee (10%)
   - Payment states: escrow → release → refund

4. **Real-time WebSocket Chat**
   - STOMP-like messaging over raw WebSocket
   - Hub pattern for connection management
   - Room-based broadcasting (conversations)
   - Typing indicators, read receipts
   - Message persistence

---

## Target Architecture

### Project Structure (Spring Boot)

**Project Location**: `~/nhannht-projects/viecz/serverSpring/`
**Package Name**: `com.viecz.server`

```
serverSpring/
├── build.gradle.kts              # Gradle Kotlin DSL build file
├── settings.gradle.kts           # Gradle settings
├── gradle/
│   └── wrapper/                  # Gradle wrapper files
├── src/
│   ├── main/
│   │   ├── java/com/viecz/server/
│   │   │   ├── VieczServerApplication.java   # @SpringBootApplication
│   │   │   ├── config/                        # Configuration classes
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   ├── WebSocketConfig.java
│   │   │   │   ├── CorsConfig.java
│   │   │   │   └── JpaConfig.java
│   │   │   ├── controller/                    # REST controllers
│   │   │   │   ├── AuthController.java
│   │   │   │   ├── TaskController.java
│   │   │   │   ├── UserController.java
│   │   │   │   ├── PaymentController.java
│   │   │   │   ├── WalletController.java
│   │   │   │   ├── CategoryController.java
│   │   │   │   └── MessageController.java
│   │   │   ├── model/                         # JPA entities
│   │   │   │   ├── User.java
│   │   │   │   ├── Task.java
│   │   │   │   ├── TaskApplication.java
│   │   │   │   ├── Category.java
│   │   │   │   ├── Transaction.java
│   │   │   │   ├── Wallet.java
│   │   │   │   ├── WalletTransaction.java
│   │   │   │   ├── Conversation.java
│   │   │   │   └── Message.java
│   │   │   ├── dto/                           # Data Transfer Objects
│   │   │   │   ├── request/
│   │   │   │   └── response/
│   │   │   ├── repository/                    # Spring Data JPA repositories
│   │   │   │   ├── UserRepository.java
│   │   │   │   ├── TaskRepository.java
│   │   │   │   ├── etc...
│   │   │   ├── service/                       # Business logic
│   │   │   │   ├── AuthService.java
│   │   │   │   ├── UserService.java
│   │   │   │   ├── TaskService.java
│   │   │   │   ├── PaymentService.java
│   │   │   │   ├── WalletService.java
│   │   │   │   ├── MessageService.java
│   │   │   │   └── PayOSService.java
│   │   │   ├── security/                      # Security components
│   │   │   │   ├── JwtTokenProvider.java
│   │   │   │   ├── JwtAuthenticationFilter.java
│   │   │   │   └── UserPrincipal.java
│   │   │   ├── websocket/                     # WebSocket handlers
│   │   │   │   ├── ChatWebSocketHandler.java
│   │   │   │   └── WebSocketEventListener.java
│   │   │   ├── exception/                     # Exception handling
│   │   │   │   ├── GlobalExceptionHandler.java
│   │   │   │   └── custom exceptions...
│   │   │   └── util/                          # Utilities
│   │   │       └── PasswordEncoder.java
│   │   └── resources/
│   │       ├── application.yml                # Main config
│   │       ├── application-dev.yml            # Dev profile
│   │       ├── application-prod.yml           # Prod profile
│   │       └── db/migration/                  # Flyway migrations
│   │           ├── V1__initial_schema.sql
│   │           ├── V2__add_indexes.sql
│   │           └── V3__add_conversations_and_messages.sql
│   └── test/
│       └── java/com/viecz/server/
│           ├── controller/                    # Controller tests
│           ├── service/                       # Service tests
│           ├── repository/                    # Repository tests
│           └── integration/                   # Integration tests
└── README.md
```

### Target Dependencies (Spring Boot 4)

Complete `build.gradle.kts` configuration:

```kotlin
// build.gradle.kts
plugins {
    java
    id("org.springframework.boot") version "4.0.2"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.viecz"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot Starters
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-websocket")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Database
    implementation("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core")

    // JWT
    implementation("io.jsonwebtoken:jjwt-api:0.12.5")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.5")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.5")

    // Utilities
    implementation("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // PayOS (if available for Java)
    // implementation("com.payos:payos-java-sdk:x.x.x")

    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.testcontainers:postgresql")
}
```

`settings.gradle.kts`:

```kotlin
// settings.gradle.kts
rootProject.name = "viecz-server"
```

---

## Migration Strategy

### Approach: **Parallel Implementation with API Contract Preservation**

We'll create the new Spring Boot application alongside the existing Go backend, ensuring API compatibility at each step. This allows for:
- ✅ Zero downtime during migration
- ✅ Gradual rollout and testing
- ✅ Easy rollback if issues arise
- ✅ Side-by-side comparison of behavior

### Key Principles
1. **API Contract First**: All REST endpoints must match exactly
2. **Database Schema Preservation**: Reuse existing PostgreSQL schema
3. **Incremental Migration**: Migrate feature by feature, not all at once
4. **Test Coverage**: Each migrated component must have equivalent or better test coverage
5. **Documentation**: Update all docs to reflect Spring Boot patterns

---

## Detailed Component Mapping

### 1. Authentication & Security

#### Go Implementation
```go
// internal/auth/jwt.go
func GenerateAccessToken(userID uint, secret string) (string, error) {
    claims := jwt.MapClaims{
        "user_id": userID,
        "exp":     time.Now().Add(24 * time.Hour).Unix(),
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secret))
}

// internal/auth/middleware.go
func AuthRequired(jwtSecret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        // ... token validation
        c.Set("user_id", claims.UserID)
        c.Next()
    }
}
```

#### Spring Boot Equivalent
```java
// security/JwtTokenProvider.java
@Component
public class JwtTokenProvider {
    @Value("${app.jwt.secret}")
    private String jwtSecret;

    public String generateAccessToken(Long userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + 86400000); // 24 hours

        return Jwts.builder()
            .setSubject(userId.toString())
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(SignatureAlgorithm.HS256, jwtSecret)
            .compact();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
            .setSigningKey(jwtSecret)
            .parseClaimsJws(token)
            .getBody();
        return Long.parseLong(claims.getSubject());
    }
}

// security/JwtAuthenticationFilter.java
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Autowired
    private JwtTokenProvider tokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) {
        String jwt = getJwtFromRequest(request);
        if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
            Long userId = tokenProvider.getUserIdFromToken(jwt);
            UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(userId, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        filterChain.doFilter(request, response);
    }
}

// config/SecurityConfig.java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**", "/api/v1/categories").permitAll()
                .requestMatchers("/api/v1/ws").permitAll() // JWT in query param
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

### 2. Data Layer (GORM → Spring Data JPA)

#### Go Implementation
```go
// internal/models/user.go
type User struct {
    ID        uint      `gorm:"primaryKey"`
    CreatedAt time.Time
    UpdatedAt time.Time
    Email     string    `gorm:"uniqueIndex;not null"`
    Password  string    `gorm:"not null"`
    Name      string    `gorm:"not null"`
    IsTasker  bool      `gorm:"default:false"`
}

// internal/repository/user_gorm.go
type UserGormRepository struct {
    db *gorm.DB
}

func (r *UserGormRepository) Create(ctx context.Context, user *models.User) error {
    return r.db.WithContext(ctx).Create(user).Error
}

func (r *UserGormRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
    var user models.User
    err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
    return &user, err
}
```

#### Spring Boot Equivalent
```java
// model/User.java
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Column(name = "is_tasker")
    private Boolean isTasker = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

// repository/UserRepository.java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}

// service/UserService.java
@Service
@Transactional
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public User createUser(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }
}
```

### 3. WebSocket (Gorilla WebSocket → Spring WebSocket + STOMP)

#### Go Implementation (Hub Pattern)
```go
// internal/websocket/hub.go
type Hub struct {
    clients       map[uint]*Client
    conversations map[uint]map[*Client]bool
    Broadcast     chan *BroadcastMessage
    Register      chan *Client
    Unregister    chan *Client
    mu            sync.RWMutex
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.Register:
            h.clients[client.userID] = client
        case client := <-h.Unregister:
            delete(h.clients, client.userID)
        case message := <-h.Broadcast:
            h.broadcastToConversation(message.ConversationID, message.Data)
        }
    }
}
```

#### Spring Boot Equivalent (STOMP)
```java
// config/WebSocketConfig.java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*")
            .withSockJS();
    }
}

// controller/ChatController.java
@Controller
public class ChatController {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MessageService messageService;

    @MessageMapping("/chat/{conversationId}")
    @SendTo("/topic/conversation/{conversationId}")
    public WebSocketMessage handleChatMessage(
        @DestinationVariable Long conversationId,
        @Payload WebSocketMessage message,
        @AuthenticationPrincipal UserPrincipal user
    ) {
        // Persist message
        Message savedMessage = messageService.saveMessage(conversationId, user.getId(), message.getContent());

        // Return message to broadcast
        return WebSocketMessage.builder()
            .type("message")
            .conversationId(conversationId)
            .messageId(savedMessage.getId())
            .senderId(user.getId())
            .content(savedMessage.getContent())
            .createdAt(savedMessage.getCreatedAt())
            .build();
    }

    @MessageMapping("/typing/{conversationId}")
    public void handleTypingIndicator(
        @DestinationVariable Long conversationId,
        @AuthenticationPrincipal UserPrincipal user
    ) {
        messagingTemplate.convertAndSend(
            "/topic/conversation/" + conversationId + "/typing",
            Map.of("userId", user.getId(), "type", "typing")
        );
    }
}

// websocket/WebSocketEventListener.java
@Component
public class WebSocketEventListener {
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        log.info("WebSocket connection established");
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        log.info("WebSocket connection closed");
    }
}
```

### 4. Configuration Management

#### Go Implementation
```go
// internal/config/config.go
type Config struct {
    Port              string
    DBHost            string
    DBPort            string
    JWTSecret         string
    PayOSClientID     string
    // ... more fields
}

func Load() (*Config, error) {
    godotenv.Load()
    return &Config{
        Port:      os.Getenv("PORT"),
        DBHost:    os.Getenv("DB_HOST"),
        JWTSecret: os.Getenv("JWT_SECRET"),
    }, nil
}
```

#### Spring Boot Equivalent
```java
// config/ApplicationProperties.java
@Configuration
@ConfigurationProperties(prefix = "app")
@Data
public class ApplicationProperties {
    private String jwtSecret;
    private Long jwtExpirationMs;
    private String clientUrl;

    private PayOS payos = new PayOS();

    @Data
    public static class PayOS {
        private String clientId;
        private String apiKey;
        private String checksumKey;
    }
}

// application.yml
// Using YAML format for:
// - Better readability with hierarchical structure
// - No repeated prefixes (spring.datasource.*, spring.jpa.*)
// - Native support for lists and complex nested properties
// - Consistency with DevOps tools (Docker, Kubernetes)
// - Multiple profile support in single file or separate files

app:
  jwt:
    secret: ${JWT_SECRET}
    expiration-ms: 86400000
  client-url: ${CLIENT_URL:http://localhost:3000}
  payos:
    client-id: ${PAYOS_CLIENT_ID}
    api-key: ${PAYOS_API_KEY}
    checksum-key: ${PAYOS_CHECKSUM_KEY}

spring:
  application:
    name: viecz-server

  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:viecz}
    username: ${DB_USER:postgres}
    password: ${DB_PASSWORD:postgres}
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: validate  # Use Flyway for migrations
    show-sql: ${SHOW_SQL:false}
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true

  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
```

---

## Phase-by-Phase Implementation

### Phase 0: Project Setup (2-3 days)
**Goal**: Initialize Spring Boot project with Gradle Kotlin DSL

**Project Configuration**:
- **Location**: `~/nhannht-projects/viecz/serverSpring/`
- **Package**: `com.viecz.server`
- **Group**: `com.viecz`
- **Artifact**: `server`
- **Name**: `viecz-server`
- **Config Format**: YAML (`.yml`) for better readability and hierarchical structure

**Tasks**:
1. ✅ Create project structure at `~/nhannht-projects/viecz/serverSpring/`
2. ✅ Set up `build.gradle.kts` with all dependencies
3. ✅ Configure `settings.gradle.kts` with `rootProject.name = "viecz-server"`
4. ✅ Set up YAML configuration files:
   - `application.yml` (main configuration)
   - `application-dev.yml` (development profile)
   - `application-prod.yml` (production profile)
5. ✅ Configure Gradle wrapper
6. ✅ Set up logging (SLF4J + Logback)
7. ✅ Create `.gitignore` for Spring Boot
8. ✅ Set up database connection
9. ✅ Verify project builds and runs

**Deliverables**:
- Runnable Spring Boot application with health check endpoint
- Database connection verified
- All dependencies resolved

**References**:
- [Bootiful Builds — Best Practices for Building Spring Boot Apps with Gradle](https://erichaag.dev/posts/bootiful-builds-best-practices-spring-boot-gradle/)
- [Spring Boot Kotlin Guide](https://spring.io/guides/tutorials/spring-boot-kotlin/)
- [Gradle Kotlin DSL Primer](https://docs.gradle.org/current/userguide/kotlin_dsl.html)

---

### Phase 1: Core Models & Database Layer (3-4 days)
**Goal**: Migrate all GORM models to JPA entities and repositories

**Tasks**:
1. ✅ Create all JPA entity classes (10 models)
   - Add proper JPA annotations (`@Entity`, `@Table`, `@Column`, etc.)
   - Define relationships (`@OneToMany`, `@ManyToOne`, etc.)
   - Add validation annotations (`@NotNull`, `@Size`, etc.)

2. ✅ Create Spring Data JPA repositories
   - Extend `JpaRepository<Entity, ID>`
   - Add custom query methods where needed
   - Add `@Query` annotations for complex queries

3. ✅ Migrate database migrations from golang-migrate to Flyway
   - Convert existing SQL migrations to Flyway format (`V1__`, `V2__`, etc.)
   - Test migrations against existing database

4. ✅ Write repository integration tests
   - Use `@DataJpaTest` for repository tests
   - Use Testcontainers for PostgreSQL

**Deliverables**:
- All 10 JPA entities
- All Spring Data repositories
- Flyway migrations matching existing schema
- Repository tests with 80%+ coverage

---

### Phase 2: Authentication & Security (4-5 days)
**Goal**: Implement JWT authentication with Spring Security

**Tasks**:
1. ✅ Create JWT token provider
   - Token generation
   - Token validation
   - Token parsing

2. ✅ Implement JWT authentication filter
   - Extract JWT from `Authorization` header
   - Validate token and set security context

3. ✅ Configure Spring Security
   - Define security filter chain
   - Configure public/protected endpoints
   - Disable CSRF for stateless API

4. ✅ Implement Auth service & controller
   - Register endpoint
   - Login endpoint
   - Refresh token endpoint
   - Password hashing with BCrypt

5. ✅ Add CORS configuration
   - Match existing Go CORS settings

6. ✅ Write security tests
   - Test JWT generation/validation
   - Test protected endpoints require auth
   - Test public endpoints are accessible

**Deliverables**:
- Working JWT authentication
- All auth endpoints (`/api/v1/auth/register`, `/login`, `/refresh`)
- Security configuration
- Auth integration tests

**References**:
- [Spring Security OAuth2 Configuration](https://docs.spring.io/spring-boot/reference/web/spring-security.html)
- [JWT Best Practices 2026](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

### Phase 3: Core Business Logic (User, Category, Task) (5-6 days)
**Goal**: Migrate core services and REST controllers

**Tasks**:
1. ✅ Implement User service & controller
   - Get user profile
   - Update profile
   - Become tasker
   - Get my profile

2. ✅ Implement Category service & controller
   - List categories (public endpoint)

3. ✅ Implement Task service & controller
   - Create task
   - List tasks (with filters)
   - Get task details
   - Update task
   - Delete task
   - Apply for task
   - Get task applications
   - Accept application
   - Complete task

4. ✅ Create DTOs for request/response
   - Separate DTOs from entities
   - Add validation annotations

5. ✅ Implement global exception handler
   - `@RestControllerAdvice`
   - Handle common exceptions (404, 400, 401, etc.)
   - Return consistent error format

6. ✅ Write controller tests
   - Use `@WebMvcTest` for controller tests
   - Mock services
   - Test all endpoints

**Deliverables**:
- User, Category, Task controllers
- All services with business logic
- DTOs for all endpoints
- Global exception handler
- Controller tests with 80%+ coverage

---

### Phase 4: Payment System (4-5 days)
**Goal**: Migrate escrow payment system and PayOS integration

**Tasks**:
1. ✅ Implement Wallet service
   - Get wallet
   - Deposit (mock mode)
   - Hold in escrow
   - Release from escrow
   - Refund from escrow
   - Get transaction history

2. ✅ Implement PayOS service
   - Create payment link (Java SDK or REST API)
   - Verify webhook signature

3. ✅ Implement Payment orchestration service
   - Create escrow payment (mock + real mode)
   - Release payment
   - Refund payment
   - Platform fee calculation (10%)

4. ✅ Implement Payment controllers
   - Wallet endpoints
   - Payment endpoints
   - Webhook handler
   - Return handler (deep link from PayOS)

5. ✅ Write payment integration tests
   - Test escrow flow
   - Test payment release
   - Test refund flow
   - Mock PayOS API calls

**Deliverables**:
- Complete escrow payment system
- PayOS integration (real + mock modes)
- Wallet management
- Payment controllers
- Payment integration tests

---

### Phase 5: WebSocket Chat (5-6 days)
**Goal**: Migrate WebSocket chat to Spring WebSocket + STOMP

**Tasks**:
1. ✅ Configure Spring WebSocket
   - Enable STOMP message broker
   - Register WebSocket endpoints
   - Configure SockJS fallback

2. ✅ Implement WebSocket authentication
   - JWT in STOMP connect frame or handshake
   - Custom channel interceptor for auth

3. ✅ Implement Message service
   - Save message to database
   - Get conversation messages
   - Create conversation
   - Get user conversations

4. ✅ Implement Chat controller
   - Handle incoming chat messages
   - Broadcast to conversation participants
   - Handle typing indicators
   - Handle read receipts

5. ✅ Implement WebSocket event listeners
   - Connection/disconnection events
   - Session management

6. ✅ Write WebSocket tests
   - Test STOMP message handling
   - Test broadcasting
   - Test authentication

**Deliverables**:
- Working WebSocket chat with STOMP
- Message persistence
- Conversation management
- Real-time broadcasting
- WebSocket integration tests

**References**:
- [Spring WebSocket STOMP Guide](https://spring.io/guides/gs/messaging-stomp-websocket/)
- [Building Real-Time Apps with WebSocket STOMP](https://oneuptime.com/blog/post/2026-01-25-real-time-apps-websocket-stomp-spring/view)
- [Spring Framework STOMP Documentation](https://docs.spring.io/spring-framework/reference/web/websocket/stomp.html)

---

### Phase 6: Testing & Quality Assurance (3-4 days)
**Goal**: Comprehensive testing and bug fixes

**Tasks**:
1. ✅ End-to-end API tests
   - Test all REST endpoints
   - Test complete user flows (register → create task → apply → accept → complete → payment release)

2. ✅ WebSocket integration tests
   - Test chat message flow
   - Test typing indicators
   - Test read receipts

3. ✅ Load testing
   - Test WebSocket connection handling (1000+ concurrent connections)
   - Test database connection pooling

4. ✅ Security audit
   - Test JWT expiration
   - Test authorization on protected endpoints
   - Test CORS configuration

5. ✅ Fix bugs and edge cases

6. ✅ Code review and refactoring

**Deliverables**:
- E2E test suite
- Load test results
- Security audit report
- Bug fixes
- Refactored code

---

### Phase 7: Documentation & Deployment (2-3 days)
**Goal**: Update documentation and prepare for deployment

**Tasks**:
1. ✅ Update README.md
   - Spring Boot setup instructions
   - Gradle build commands
   - Environment variables

2. ✅ API documentation
   - Consider Swagger/OpenAPI integration
   - Document all endpoints

3. ✅ Deployment guide
   - Docker containerization (optional)
   - Production configuration
   - Database migration strategy

4. ✅ Update CLAUDE.md
   - Spring Boot development guidelines
   - Gradle commands
   - Testing strategies

5. ✅ Create migration runbook
   - Step-by-step migration process
   - Rollback procedures
   - Monitoring checklist

**Deliverables**:
- Complete documentation
- Deployment guide
- Migration runbook
- Updated CLAUDE.md

---

## Testing Strategy

### Unit Tests
- **Tool**: JUnit 5 + Mockito
- **Coverage Target**: 80%+
- **Focus**: Service layer, business logic, utility methods

### Integration Tests
- **Tool**: Spring Boot Test + Testcontainers
- **Coverage**: Repository layer, database interactions
- **Database**: PostgreSQL via Testcontainers

### Controller Tests
- **Tool**: MockMvc + `@WebMvcTest`
- **Coverage**: All REST endpoints
- **Mocking**: Services mocked, test request/response handling

### WebSocket Tests
- **Tool**: Spring WebSocket Test
- **Coverage**: STOMP message handling, broadcasting

### End-to-End Tests
- **Tool**: RestAssured or Spring Test
- **Coverage**: Complete user flows

### Load Tests
- **Tool**: JMeter or Gatling
- **Coverage**: WebSocket connections, concurrent requests

---

## Risks and Mitigation

### Risk 1: PayOS SDK Availability
**Risk**: PayOS Go SDK may not have a Java equivalent

**Mitigation**:
- Implement PayOS integration via REST API directly
- Reuse webhook signature verification logic
- Test thoroughly with PayOS sandbox

### Risk 2: WebSocket Pattern Differences
**Risk**: Go hub pattern vs Spring STOMP differences in behavior

**Mitigation**:
- Carefully test room-based broadcasting
- Ensure message ordering is preserved
- Test connection lifecycle events
- Consider using Spring Session for WebSocket session management

### Risk 3: Performance Differences
**Risk**: Spring Boot may have different performance characteristics than Go

**Mitigation**:
- Run load tests early
- Optimize JPA queries (use `@EntityGraph` to avoid N+1 queries)
- Configure Hikari connection pool properly
- Use caching where appropriate (Spring Cache)

### Risk 4: Database Schema Changes
**Risk**: JPA/Hibernate may generate slightly different schema

**Mitigation**:
- Use `ddl-auto: validate` to prevent accidental schema changes
- Manually review Flyway migrations
- Test against existing Go-created database
- Keep nullable/not null constraints consistent

### Risk 5: JWT Token Compatibility
**Risk**: JWT tokens generated by Go may not be readable by Java, or vice versa

**Mitigation**:
- Use same JWT library settings (HS256, same secret, same claims structure)
- Test token interoperability
- Consider token version field for migration period

---

## Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0: Project Setup | 2-3 days | 3 days |
| Phase 1: Models & Database | 3-4 days | 7 days |
| Phase 2: Authentication | 4-5 days | 12 days |
| Phase 3: Core Business Logic | 5-6 days | 18 days |
| Phase 4: Payment System | 4-5 days | 23 days |
| Phase 5: WebSocket Chat | 5-6 days | 29 days |
| Phase 6: Testing & QA | 3-4 days | 33 days |
| Phase 7: Documentation | 2-3 days | 36 days |

**Total Estimate**: **5-6 weeks** (assuming full-time work)

**Contingency**: Add 20% buffer = **~7 weeks total**

---

## Next Steps

1. **Review this plan** and provide feedback
2. **Approve migration** or suggest changes
3. **Start Phase 0** (Project Setup)
4. **Set up GitHub branch** for Spring Boot migration
5. **Begin implementation** following phase-by-phase plan

---

## Sources

This migration plan was created using up-to-date documentation and best practices from:

**Spring Boot 4 & Spring Framework 7:**
- [Spring Boot 4.0.0 Release Announcement](https://spring.io/blog/2025/11/20/spring-boot-4-0-0-available-now/)
- [Spring Boot 4 & Spring Framework 7 – What's New | Baeldung](https://www.baeldung.com/spring-boot-4-spring-framework-7)
- [Spring Framework 7 and Spring Boot 4 Features - InfoQ](https://www.infoq.com/news/2025/11/spring-7-spring-boot-4/)
- [Spring Boot 4.0 & Spring Framework 7: The Evolution Continues](https://medium.com/spring-boot-world/spring-boot-4-0-spring-framework-7-the-evolution-continues-4e3d4344d5d9)
- [Context7 Spring Boot 4.0 Documentation](https://github.com/spring-projects/spring-boot/blob/v4.0.0/)

**Gradle & Configuration:**
- [Spring Boot Gradle Kotlin DSL Best Practices](https://erichaag.dev/posts/bootiful-builds-best-practices-spring-boot-gradle/)
- [Gradle Kotlin DSL Documentation](https://docs.gradle.org/current/userguide/kotlin_dsl.html)
- [Spring Boot with Kotlin Tutorial](https://spring.io/guides/tutorials/spring-boot-kotlin/)

**WebSocket & Security:**
- [Spring WebSocket STOMP Guide](https://spring.io/guides/gs/messaging-stomp-websocket/)
- [Building Real-Time Apps with WebSocket STOMP in Spring (2026)](https://oneuptime.com/blog/post/2026-01-25-real-time-apps-websocket-stomp-spring/view)
- [Spring Framework STOMP Documentation](https://docs.spring.io/spring-framework/reference/web/websocket/stomp.html)
- [Spring Security OAuth2 Documentation](https://docs.spring.io/spring-boot/reference/web/spring-security.html)

---

**End of Migration Plan**
