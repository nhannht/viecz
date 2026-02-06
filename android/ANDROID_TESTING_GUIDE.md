# Android Testing Guide for Viecz

## Table of Contents
1. [Overview](#overview)
2. [Testing Pyramid](#testing-pyramid)
3. [Test Dependencies](#test-dependencies)
4. [Unit Testing](#unit-testing)
5. [Instrumented Testing](#instrumented-testing)
6. [Testing Compose UI](#testing-compose-ui)
7. [Best Practices](#best-practices)
8. [Running Tests](#running-tests)

---

## Overview

Android testing consists of two main types:

| Type | Location | Runs On | Speed | Use Case |
|------|----------|---------|-------|----------|
| **Unit Tests** | `app/src/test/` | JVM | Fast | Business logic, ViewModels, Repositories |
| **Instrumented Tests** | `app/src/androidTest/` | Device/Emulator | Slow | UI, Database, Android APIs |

---

## Testing Pyramid

```
         ╱╲
        ╱  ╲        10% - End-to-End (Manual/Automated)
       ╱────╲
      ╱      ╲      20% - Integration (Instrumented Tests)
     ╱────────╲
    ╱          ╲    70% - Unit Tests (Fast, Isolated)
   ╱────────────╲
```

**Goal**: Write more unit tests, fewer integration tests, minimal E2E tests.

---

## Test Dependencies

### Added to `gradle/libs.versions.toml`:

```toml
[versions]
mockk = "1.13.13"
coroutines-test = "1.10.1"
turbine = "1.2.0"
kotlin-test = "2.0.21"

[libraries]
mockk = { group = "io.mockk", name = "mockk", version.ref = "mockk" }
mockk-android = { group = "io.mockk", name = "mockk-android", version.ref = "mockk" }
coroutines-test = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-test", version.ref = "coroutines-test" }
turbine = { group = "app.cash.turbine", name = "turbine", version.ref = "turbine" }
kotlin-test = { group = "org.jetbrains.kotlin", name = "kotlin-test", version.ref = "kotlin-test" }
```

### Added to `app/build.gradle.kts`:

```kotlin
dependencies {
    // Unit tests (JVM)
    testImplementation(libs.junit)
    testImplementation(libs.kotlin.test)
    testImplementation(libs.mockk)
    testImplementation(libs.coroutines.test)
    testImplementation(libs.turbine)

    // Instrumented tests (Android)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.mockk.android)
    androidTestImplementation(libs.compose.ui.test.junit4)
}
```

**Tools:**
- **MockK**: Mocking library for Kotlin (better than Mockito for Kotlin)
- **Coroutines Test**: Testing coroutines and flows
- **Turbine**: Testing Kotlin Flows easily
- **Kotlin Test**: Kotlin-specific assertions

---

## Unit Testing

### 1. Testing ViewModel

**File**: `app/src/test/java/com/viecz/vieczandroid/ui/viewmodels/AuthViewModelTest.kt`

```kotlin
@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {
    private val testDispatcher = StandardTestDispatcher()
    private lateinit var mockRepository: AuthRepository
    private lateinit var viewModel: AuthViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        mockRepository = mockk()
        viewModel = AuthViewModel(mockApplication, mockRepository) // DI required
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `login with valid credentials should emit Success state`() = runTest {
        // Given
        val testUser = User(id = 1, email = "test@example.com", name = "Test")
        coEvery { mockRepository.login(any(), any()) } returns Result.success(testUser)

        // When
        viewModel.login("test@example.com", "Password123")
        advanceUntilIdle() // Process all coroutines

        // Then
        viewModel.authState.test {
            val state = awaitItem()
            assertIs<AuthState.Success>(state)
            assertEquals(testUser, (state as AuthState.Success).user)
        }
    }
}
```

**Key Points**:
- Use `StandardTestDispatcher()` for deterministic coroutine testing
- Use `Dispatchers.setMain()` to replace main dispatcher
- Use `advanceUntilIdle()` to process all pending coroutines
- Use Turbine's `test {}` for Flow assertions

### 2. Testing Repository

**File**: `app/src/test/java/com/viecz/vieczandroid/data/repository/AuthRepositoryTest.kt`

```kotlin
class AuthRepositoryTest {
    private lateinit var mockAuthApi: AuthApi
    private lateinit var mockTokenManager: TokenManager
    private lateinit var repository: AuthRepository

    @Before
    fun setup() {
        mockAuthApi = mockk()
        mockTokenManager = mockk(relaxed = true)
        repository = AuthRepository(mockAuthApi, mockTokenManager)
    }

    @Test
    fun `register should save tokens on success`() = runTest {
        // Given
        val tokenResponse = TokenResponse(
            accessToken = "token",
            refreshToken = "refresh",
            user = testUser
        )
        coEvery { mockAuthApi.register(any()) } returns tokenResponse
        coEvery { mockTokenManager.saveTokens(any(), any()) } just Runs

        // When
        val result = repository.register("email", "pass", "name")

        // Then
        assertTrue(result.isSuccess)
        coVerify { mockTokenManager.saveTokens("token", "refresh") }
    }
}
```

**Key Points**:
- Mock external dependencies (API, local storage)
- Test both success and failure paths
- Verify side effects with `coVerify {}`
- Use `runTest` for suspend functions

### 3. Testing StateFlow

```kotlin
@Test
fun `stateFlow should emit values in order`() = runTest {
    val flow = MutableStateFlow(1)

    flow.test {
        assertEquals(1, awaitItem()) // Initial value

        flow.value = 2
        assertEquals(2, awaitItem())

        flow.value = 3
        assertEquals(3, awaitItem())

        cancelAndIgnoreRemainingEvents()
    }
}
```

**Key Points**:
- Use Turbine's `test {}` for Flow testing
- Use `awaitItem()` to wait for emissions
- Use `cancelAndIgnoreRemainingEvents()` to clean up

---

## Instrumented Testing

### 1. Testing Compose UI

**File**: `app/src/androidTest/java/com/viecz/vieczandroid/ui/LoginScreenTest.kt`

```kotlin
@RunWith(AndroidJUnit4::class)
class LoginScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun loginScreen_displayAllElements() {
        // Given
        composeTestRule.setContent {
            LoginScreen(
                onLoginClick = {},
                onNavigateToRegister = {}
            )
        }

        // Then
        composeTestRule.onNodeWithText("Email").assertIsDisplayed()
        composeTestRule.onNodeWithText("Password").assertIsDisplayed()
        composeTestRule.onNodeWithText("Login").assertIsDisplayed()
    }

    @Test
    fun loginScreen_clickLoginWithEmptyFields_showsError() {
        // Given
        var loginClicked = false
        composeTestRule.setContent {
            LoginScreen(
                onLoginClick = { loginClicked = true },
                onNavigateToRegister = {}
            )
        }

        // When
        composeTestRule.onNodeWithText("Login").performClick()

        // Then
        composeTestRule.onNodeWithText("Email is required").assertIsDisplayed()
    }

    @Test
    fun loginScreen_enterCredentialsAndClickLogin_callsCallback() {
        // Given
        var emailEntered = ""
        var passwordEntered = ""

        composeTestRule.setContent {
            LoginScreen(
                onLoginClick = { email, password ->
                    emailEntered = email
                    passwordEntered = password
                },
                onNavigateToRegister = {}
            )
        }

        // When
        composeTestRule.onNodeWithText("Email")
            .performTextInput("test@example.com")
        composeTestRule.onNodeWithText("Password")
            .performTextInput("Password123")
        composeTestRule.onNodeWithText("Login")
            .performClick()

        // Then
        assertEquals("test@example.com", emailEntered)
        assertEquals("Password123", passwordEntered)
    }
}
```

**Key Compose Test Functions**:
- `onNodeWithText()` - Find by text
- `onNodeWithContentDescription()` - Find by content description
- `onNodeWithTag()` - Find by testTag (use `Modifier.testTag()`)
- `performClick()` - Simulate click
- `performTextInput()` - Enter text
- `assertIsDisplayed()` - Assert visible
- `assertIsEnabled()` - Assert enabled
- `assertTextEquals()` - Assert text content

### 2. Testing with TestTag

```kotlin
// In your Composable:
Button(
    onClick = onClick,
    modifier = Modifier.testTag("login_button")
) {
    Text("Login")
}

// In your test:
composeTestRule.onNodeWithTag("login_button").performClick()
```

**Best Practice**: Use `testTag` for important UI elements.

---

## Best Practices

### 1. **Arrange-Act-Assert Pattern**

```kotlin
@Test
fun testExample() {
    // Arrange - Setup test data and mocks
    val mockRepo = mockk<Repository>()
    coEvery { mockRepo.getData() } returns testData

    // Act - Execute the function under test
    val result = mockRepo.getData()

    // Assert - Verify the result
    assertEquals(testData, result)
}
```

### 2. **Test Naming Convention**

```kotlin
// Pattern: functionName_stateUnderTest_expectedBehavior

@Test
fun login_withValidCredentials_shouldReturnSuccess()

@Test
fun register_withDuplicateEmail_shouldReturnError()

@Test
fun loadTasks_whenRepositoryFails_shouldEmitErrorState()
```

### 3. **Given-When-Then Comments**

```kotlin
@Test
fun testPayment() {
    // Given - Initial state
    val amount = 100

    // When - Action performed
    val result = processPayment(amount)

    // Then - Expected outcome
    assertTrue(result.isSuccess)
}
```

### 4. **Test Data Builders**

```kotlin
// Create reusable test data
object TestData {
    fun createUser(
        id: Long = 1,
        email: String = "test@example.com",
        name: String = "Test User"
    ) = User(
        id = id,
        email = email,
        name = name,
        avatarUrl = null,
        phone = null,
        isTasker = false,
        rating = 0.0
    )

    fun createTask(
        id: Long = 1,
        title: String = "Test Task"
    ) = Task(/* ... */)
}

// Usage in tests
@Test
fun testUser() {
    val user = TestData.createUser(email = "custom@example.com")
    // ...
}
```

### 5. **Mocking Best Practices**

```kotlin
// ✅ Good - Mock external dependencies
val mockApi = mockk<AuthApi>()
coEvery { mockApi.login(any()) } returns testResponse

// ✅ Good - Use relaxed mocks for classes you don't care about
val mockContext = mockk<Context>(relaxed = true)

// ❌ Bad - Don't mock the class under test
val mockViewModel = mockk<AuthViewModel>() // Test the real one!

// ✅ Good - Verify important interactions
coVerify(exactly = 1) { mockApi.login(any()) }

// ✅ Good - Use coEvery for suspend functions
coEvery { mockRepo.getData() } returns data

// ✅ Good - Use every for regular functions
every { mockManager.isLoggedIn() } returns true
```

### 6. **Testing Coroutines**

```kotlin
@OptIn(ExperimentalCoroutinesApi::class)
class CoroutineTest {
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun testCoroutine() = runTest {
        // Your test code
        advanceUntilIdle() // Process all coroutines
    }
}
```

### 7. **Testing Error Cases**

```kotlin
@Test
fun `repository should handle network errors gracefully`() = runTest {
    // Given
    coEvery { mockApi.getData() } throws IOException("Network error")

    // When
    val result = repository.getData()

    // Then
    assertTrue(result.isFailure)
    assertIs<IOException>(result.exceptionOrNull())
}
```

---

## Running Tests

### From Android Studio
- Right-click test file → Run
- Right-click test class → Run
- Click green arrow next to test function
- View → Tool Windows → Run to see results

### From Terminal

```bash
# Run all unit tests
./gradlew test

# Run unit tests with report
./gradlew test --info

# Run specific test class
./gradlew test --tests "com.viecz.vieczandroid.ui.viewmodels.AuthViewModelTest"

# Run all instrumented tests (requires connected device)
./gradlew connectedAndroidTest

# Run specific instrumented test
./gradlew connectedAndroidTest --tests "com.viecz.vieczandroid.ui.LoginScreenTest"

# Generate test coverage report
./gradlew testDebugUnitTest jacocoTestReport
```

### View Test Reports

After running tests, open:
```
app/build/reports/tests/testDebugUnitTest/index.html
```

### View Coverage Report

After generating coverage:
```
app/build/reports/jacoco/jacocoTestReport/html/index.html
```

---

## Common Issues & Solutions

### Issue: "lateinit property has not been initialized"

**Solution**: Initialize mocks in `@Before` method.

```kotlin
@Before
fun setup() {
    mockRepository = mockk()
    viewModel = MyViewModel(mockRepository)
}
```

### Issue: "Module with the Main dispatcher had failed to initialize"

**Solution**: Set Main dispatcher in tests.

```kotlin
@Before
fun setup() {
    Dispatchers.setMain(StandardTestDispatcher())
}

@After
fun tearDown() {
    Dispatchers.resetMain()
}
```

### Issue: "Cannot mock final class"

**Solution**: MockK can mock final classes by default. If you see this error, ensure you're using MockK, not Mockito.

```kotlin
// ✅ MockK (supports final classes)
val mock = mockk<MyClass>()

// ❌ Mockito (doesn't support final classes in Kotlin)
val mock = mock(MyClass::class.java)
```

### Issue: Tests pass individually but fail when run together

**Solution**: Clear mocks and state between tests.

```kotlin
@After
fun tearDown() {
    clearAllMocks()
    Dispatchers.resetMain()
}
```

---

## Next Steps

1. **Refactor ViewModels for Dependency Injection**
   - Currently, `AuthViewModel` creates dependencies internally
   - Refactor to inject `AuthRepository` via constructor
   - This makes ViewModels testable

2. **Add More Test Coverage**
   - Target 70%+ unit test coverage
   - Focus on business logic (ViewModels, Repositories)
   - Add UI tests for critical flows (login, task creation)

3. **Set Up Continuous Integration**
   - Run tests automatically on every commit
   - Block merges if tests fail
   - Generate coverage reports

4. **Consider Using Hilt for DI**
   - Simplifies dependency injection
   - Has built-in testing support
   - Makes ViewModels easily testable

---

## Resources

- [Android Testing Fundamentals](https://developer.android.com/training/testing/fundamentals)
- [MockK Documentation](https://mockk.io/)
- [Compose Testing Cheat Sheet](https://developer.android.com/develop/ui/compose/testing/testing-cheatsheet)
- [Kotlin Coroutines Test](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-test/)
- [Turbine (Flow Testing)](https://github.com/cashapp/turbine)
