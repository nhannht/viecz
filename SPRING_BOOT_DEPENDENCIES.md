# Spring Boot 4 Dependencies for Viecz Backend

**Project**: Viecz Backend Migration (Go → Spring Boot 4)
**Created**: February 6, 2026
**Spring Boot Version**: 4.0.2
**Java Version**: 21

---

## Complete build.gradle.kts

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

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // ===== CORE SPRING BOOT STARTERS =====

    // Web - REST API endpoints (replaces Gin)
    implementation("org.springframework.boot:spring-boot-starter-web")

    // Data JPA - Database ORM (replaces GORM)
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")

    // Security - Authentication & Authorization
    implementation("org.springframework.boot:spring-boot-starter-security")

    // WebSocket - Real-time chat (replaces Gorilla WebSocket)
    implementation("org.springframework.boot:spring-boot-starter-websocket")

    // Validation - Request validation
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Actuator - Health checks and monitoring (optional but recommended)
    implementation("org.springframework.boot:spring-boot-starter-actuator")


    // ===== DATABASE =====

    // PostgreSQL Driver
    runtimeOnly("org.postgresql:postgresql")

    // Flyway - Database migrations (replaces golang-migrate)
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")


    // ===== SECURITY & JWT =====

    // JWT Library (replaces golang-jwt/jwt)
    implementation("io.jsonwebtoken:jjwt-api:0.12.5")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.5")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.5")


    // ===== HTTP CLIENT (for PayOS integration) =====

    // WebClient - Non-blocking HTTP client
    implementation("org.springframework.boot:spring-boot-starter-webflux")


    // ===== UTILITIES =====

    // Lombok - Reduce boilerplate code (@Data, @Builder, etc.)
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // JSON Processing (Jackson is included in spring-boot-starter-web)
    // No additional dependency needed


    // ===== DEVELOPMENT TOOLS =====

    // DevTools - Hot reload during development
    developmentOnly("org.springframework.boot:spring-boot-devtools")

    // Configuration Processor - IDE autocomplete for application.yml
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")


    // ===== TESTING =====

    // Test Starter - JUnit 5, Mockito, AssertJ
    testImplementation("org.springframework.boot:spring-boot-starter-test")

    // Security Test - Test security configurations
    testImplementation("org.springframework.security:spring-security-test")

    // Testcontainers - Integration tests with PostgreSQL
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:postgresql")
    testImplementation("org.testcontainers:junit-jupiter")

    // REST Assured - API testing (optional but recommended)
    testImplementation("io.rest-assured:rest-assured:5.4.0")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

---

## Dependency Breakdown by Feature

### 1. REST API (replaces Gin)
```kotlin
implementation("org.springframework.boot:spring-boot-starter-web")
```
**Includes**:
- Embedded Tomcat server
- Spring MVC
- Jackson for JSON serialization
- Hibernate Validator

**Maps to Go**:
- `github.com/gin-gonic/gin` → Spring Web MVC

---

### 2. Database Layer (replaces GORM)
```kotlin
implementation("org.springframework.boot:spring-boot-starter-data-jpa")
runtimeOnly("org.postgresql:postgresql")
implementation("org.flywaydb:flyway-core")
implementation("org.flywaydb:flyway-database-postgresql")
```
**Includes**:
- Spring Data JPA
- Hibernate ORM
- HikariCP connection pool
- Flyway for migrations

**Maps to Go**:
- `gorm.io/gorm` → Spring Data JPA + Hibernate
- `gorm.io/driver/postgres` → PostgreSQL driver
- `github.com/golang-migrate/migrate` → Flyway

---

### 3. Security & JWT (replaces golang-jwt)
```kotlin
implementation("org.springframework.boot:spring-boot-starter-security")
implementation("io.jsonwebtoken:jjwt-api:0.12.5")
runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.5")
runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.5")
```
**Includes**:
- Spring Security 7
- BCrypt password encoder
- JJWT for token generation/validation

**Maps to Go**:
- `github.com/golang-jwt/jwt/v5` → io.jsonwebtoken
- `golang.org/x/crypto` (bcrypt) → Spring Security's BCrypt

---

### 4. WebSocket (replaces Gorilla WebSocket)
```kotlin
implementation("org.springframework.boot:spring-boot-starter-websocket")
```
**Includes**:
- Spring WebSocket support
- STOMP messaging protocol
- SockJS fallback

**Maps to Go**:
- `github.com/gorilla/websocket` → Spring WebSocket + STOMP
- Custom hub pattern → Spring's message broker

---

### 5. HTTP Client (for PayOS)
```kotlin
implementation("org.springframework.boot:spring-boot-starter-webflux")
```
**Includes**:
- WebClient (non-blocking HTTP client)
- Reactive streams support

**Maps to Go**:
- Standard `http.Client` → WebClient or RestClient

---

### 6. Validation
```kotlin
implementation("org.springframework.boot:spring-boot-starter-validation")
```
**Includes**:
- Hibernate Validator
- Jakarta Bean Validation API
- Annotations: `@NotNull`, `@Size`, `@Email`, etc.

**Maps to Go**:
- Manual validation → Jakarta Bean Validation annotations

---

### 7. Utilities
```kotlin
compileOnly("org.projectlombok:lombok")
annotationProcessor("org.projectlombok:lombok")
```
**Provides**:
- `@Data` - Generates getters, setters, equals, hashCode, toString
- `@Builder` - Builder pattern
- `@NoArgsConstructor`, `@AllArgsConstructor`
- `@Slf4j` - Logger injection

**Why use Lombok**:
- Reduces boilerplate code
- Cleaner entity and DTO classes
- Standard in Java Spring projects

---

### 8. Testing
```kotlin
testImplementation("org.springframework.boot:spring-boot-starter-test")
testImplementation("org.springframework.security:spring-security-test")
testImplementation("org.springframework.boot:spring-boot-testcontainers")
testImplementation("org.testcontainers:postgresql")
testImplementation("io.rest-assured:rest-assured:5.4.0")
```
**Includes**:
- JUnit 5 (test framework)
- Mockito (mocking)
- AssertJ (fluent assertions)
- Spring Security Test (security testing)
- Testcontainers (PostgreSQL in Docker)
- REST Assured (API testing)

**Maps to Go**:
- Go's `testing` package → JUnit 5
- `github.com/testcontainers/testcontainers-go` → Testcontainers for Java

---

### 9. Monitoring (Optional)
```kotlin
implementation("org.springframework.boot:spring-boot-starter-actuator")
```
**Provides**:
- `/actuator/health` - Health check endpoint
- `/actuator/metrics` - Application metrics
- `/actuator/info` - Application info

**Use case**: Production monitoring, Kubernetes health probes

---

### 10. Development Tools
```kotlin
developmentOnly("org.springframework.boot:spring-boot-devtools")
annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
```
**Provides**:
- Hot reload during development (DevTools)
- IDE autocomplete for `application.yml` properties
- Faster development iteration

---

## Optional Dependencies

### PayOS SDK (if available)
```kotlin
// Check if PayOS provides a Java SDK
// implementation("com.payos:payos-java-sdk:x.x.x")
// Otherwise, use WebClient to call PayOS REST API
```

### Caching (if needed)
```kotlin
implementation("org.springframework.boot:spring-boot-starter-cache")
implementation("com.github.ben-manes.caffeine:caffeine")
```

### API Documentation (Swagger/OpenAPI)
```kotlin
implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.3.0")
```
Provides automatic API documentation at `/swagger-ui.html`

---

## Dependency Count Summary

| Category | Count |
|----------|-------|
| Spring Boot Starters | 6 |
| Database | 3 |
| Security | 3 |
| HTTP Client | 1 |
| Utilities | 1 |
| Development | 2 |
| Testing | 5 |
| **Total** | **21** |

---

## Version Management

All Spring Boot dependencies are managed by the **Spring Boot BOM** (Bill of Materials):

```kotlin
id("io.spring.dependency-management") version "1.1.7"
```

This ensures:
- Compatible versions across all Spring dependencies
- No need to specify versions for most dependencies
- Automatic dependency updates with Spring Boot version

**Manually versioned**:
- `io.jsonwebtoken:jjwt-*:0.12.5` (JWT library)
- `io.rest-assured:rest-assured:5.4.0` (API testing)
- `org.springdoc:springdoc-openapi-*:2.3.0` (if using Swagger)

---

## Sources

- [Spring Boot 4.0.0 WebSockets Guide](https://medium.com/@wdkeyser/spring-boot-4-0-0-websockets-33801ad191db)
- [Spring Boot WebSockets Documentation](https://docs.spring.io/spring-boot/reference/messaging/websockets.html)
- [JWT Authentication in Spring Boot 2025](https://medium.com/@pendemmukulsai/implementing-jwt-authentication-in-spring-boot-2025-03a565333814)
- [Spring Boot + PostgreSQL Example](https://mkyong.com/spring-boot/spring-boot-spring-data-jpa-postgresql/)
- [Context7 Spring Boot Starter Dependencies](https://context7.com/spring-projects/spring-boot/)

---

**Next Step**: Copy the `build.gradle.kts` section to your project and run `./gradlew build` to download all dependencies.
