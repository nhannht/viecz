# Hilt Dependency Injection Guide for Viecz

## Table of Contents
1. [What is Hilt?](#what-is-hilt)
2. [Setup](#setup)
3. [Core Concepts](#core-concepts)
4. [How It Works in Viecz](#how-it-works-in-viecz)
5. [Testing with Hilt](#testing-with-hilt)
6. [Best Practices](#best-practices)

---

## What is Hilt?

**Hilt** is Android's dependency injection library built on top of Dagger. It reduces boilerplate code and makes dependency injection simple and testable.

### Benefits

✅ **Testability**: Easily swap real dependencies with mocks
✅ **Maintainability**: Clear dependency graph
✅ **Lifecycle-aware**: Automatically manages component lifecycles
✅ **Scoping**: Control dependency lifetimes (Singleton, Activity, etc.)
✅ **Compile-time safety**: Catches errors at compile time

---

## Setup

### Dependencies Added

All dependencies have been added to your project:

**`gradle/libs.versions.toml`:**
```toml
[versions]
hilt = "2.54"

[libraries]
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
hilt-navigation-compose = { group = "androidx.hilt", name = "hilt-navigation-compose", version = "1.2.0" }
hilt-android-testing = { group = "com.google.dagger", name = "hilt-android-testing", version.ref = "hilt" }

[plugins]
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
```

**`app/build.gradle.kts`:**
```kotlin
plugins {
    alias(libs.plugins.hilt)
}

dependencies {
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)

    // Testing
    androidTestImplementation(libs.hilt.android.testing)
    kspAndroidTest(libs.hilt.compiler)
}
```

---

## Core Concepts

### 1. Application Class

**`VieczApplication.kt`**:
```kotlin
@HiltAndroidApp
class VieczApplication : Application()
```

`@HiltAndroidApp` triggers Hilt's code generation and creates the application-level dependency container.

**AndroidManifest.xml:**
```xml
<application android:name=".VieczApplication" ...>
```

### 2. Modules

Modules tell Hilt how to provide dependencies.

#### NetworkModule (Provides API dependencies)

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideRetrofit(...): Retrofit { /* ... */ }

    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApi {
        return retrofit.create(AuthApi::class.java)
    }
}
```

**Key points:**
- `@Module` - Marks this as a Hilt module
- `@InstallIn(SingletonComponent::class)` - Lives as long as the app
- `@Provides` - Tells Hilt how to create a dependency
- `@Singleton` - Only one instance exists

#### DataModule (Provides Repositories)

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object DataModule {

    @Provides
    @Singleton
    fun provideTokenManager(@ApplicationContext context: Context): TokenManager {
        return TokenManager(context)
    }

    @Provides
    @Singleton
    fun provideAuthRepository(
        authApi: AuthApi,
        tokenManager: TokenManager
    ): AuthRepository {
        return AuthRepository(authApi, tokenManager)
    }
}
```

**Key points:**
- `@ApplicationContext` - Injects Android application context
- Dependencies are automatically injected from other `@Provides` methods

### 3. ViewModels

**Before Hilt:**
```kotlin
class AuthViewModel(application: Application) : AndroidViewModel(application) {
    private val tokenManager = TokenManager(application.applicationContext)  // ❌ Manual creation
    private val repository = AuthRepository(RetrofitClient.authApi, tokenManager)  // ❌ Manual creation
}
```

**After Hilt:**
```kotlin
@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repository: AuthRepository,
    private val tokenManager: TokenManager
) : ViewModel() {  // Note: ViewModel, not AndroidViewModel
    // Hilt automatically provides repository and tokenManager
}
```

**Key points:**
- `@HiltViewModel` - Marks this ViewModel for injection
- `@Inject constructor(...)` - Hilt injects dependencies
- No more `AndroidViewModel(application)` needed

### 4. Activities

**MainActivity:**
```kotlin
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    // ViewModels are now injectable via hiltViewModel()
}
```

### 5. Composables

**Before Hilt:**
```kotlin
@Composable
fun LoginScreen() {
    val viewModel: AuthViewModel = viewModel(
        factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return AuthViewModel(LocalContext.current.applicationContext as Application) as T
            }
        }
    )
}
```

**After Hilt:**
```kotlin
@Composable
fun LoginScreen(
    viewModel: AuthViewModel = hiltViewModel()  // ✅ That's it!
) {
    // ViewModel is automatically injected with all dependencies
}
```

---

## How It Works in Viecz

### Dependency Graph

```
VieczApplication (@HiltAndroidApp)
    ↓
NetworkModule (@InstallIn(SingletonComponent))
    ├─ OkHttpClient (Singleton)
    ├─ Retrofit (Singleton)
    ├─ AuthApi (Singleton)
    ├─ TaskApi (Singleton)
    └─ ...
    ↓
DataModule (@InstallIn(SingletonComponent))
    ├─ TokenManager (Singleton)
    ├─ AuthRepository (Singleton)
    ├─ TaskRepository (Singleton)
    └─ ...
    ↓
ViewModels (@HiltViewModel)
    ├─ AuthViewModel (gets AuthRepository + TokenManager)
    ├─ TaskListViewModel (gets TaskRepository)
    ├─ PaymentViewModel (gets PaymentRepository)
    └─ ...
    ↓
Composables
    └─ Use hiltViewModel() to get ViewModels
```

### Example Flow: User Login

1. **User clicks "Login" button**
2. **LoginScreen** uses `hiltViewModel<AuthViewModel>()`
3. **Hilt** creates `AuthViewModel` with:
   - `AuthRepository` (from DataModule)
   - `TokenManager` (from DataModule)
4. **AuthRepository** needs:
   - `AuthApi` (from NetworkModule)
   - `TokenManager` (from DataModule)
5. **All dependencies are automatically wired together!**

---

## Testing with Hilt

### Unit Testing ViewModels

**Before Hilt:**
```kotlin
@Test
fun testLogin() {
    val mockApp = mockk<Application>(relaxed = true)
    // ❌ Can't easily inject mock repository
    val viewModel = AuthViewModel(mockApp)
}
```

**After Hilt:**
```kotlin
@Test
fun testLogin() = runTest {
    // ✅ Inject mock repository directly
    val mockRepository = mockk<AuthRepository>()
    coEvery { mockRepository.login(any(), any()) } returns Result.success(testUser)

    val viewModel = AuthViewModel(mockRepository, mockTokenManager)

    viewModel.login("test@example.com", "Password123")
    advanceUntilIdle()

    viewModel.authState.test {
        assertIs<AuthState.Success>(awaitItem())
    }
}
```

### Instrumented Testing with Hilt

**Test with HiltAndroidTest:**

```kotlin
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class LoginScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Before
    fun setup() {
        hiltRule.inject()
    }

    @Test
    fun loginScreen_enterCredentials_callsRepository() {
        // Hilt automatically provides real or test dependencies
        composeTestRule.setContent {
            LoginScreen()
        }

        composeTestRule.onNodeWithText("Email")
            .performTextInput("test@example.com")
        composeTestRule.onNodeWithText("Login")
            .performClick()

        // Assert ViewModel state
    }
}
```

### Custom Test Modules

Replace real dependencies with fakes in tests:

```kotlin
@Module
@TestInstallIn(
    components = [SingletonComponent::class],
    replaces = [NetworkModule::class]
)
object FakeNetworkModule {
    @Provides
    @Singleton
    fun provideFakeAuthApi(): AuthApi {
        return FakeAuthApi()  // Fake implementation for testing
    }
}
```

---

## Best Practices

### 1. Use Constructor Injection

✅ **Good:**
```kotlin
@HiltViewModel
class TaskViewModel @Inject constructor(
    private val repository: TaskRepository
) : ViewModel()
```

❌ **Bad:**
```kotlin
@HiltViewModel
class TaskViewModel : ViewModel() {
    @Inject lateinit var repository: TaskRepository  // Field injection (harder to test)
}
```

### 2. Prefer Singleton for Repositories

```kotlin
@Provides
@Singleton  // ✅ Share single instance
fun provideAuthRepository(...): AuthRepository
```

### 3. Use @ApplicationContext for Android Context

```kotlin
@Provides
@Singleton
fun provideTokenManager(
    @ApplicationContext context: Context  // ✅ Application context
): TokenManager
```

### 4. Don't Inject Activity/Fragment

❌ **Bad:**
```kotlin
@Provides
fun provideActivity(): Activity  // Never do this!
```

Use `@ActivityContext` or `@ApplicationContext` qualifiers instead.

### 5. Keep Modules Organized

- **NetworkModule**: Network dependencies (Retrofit, OkHttp, APIs)
- **DataModule**: Data layer (Repositories, TokenManager)
- **DatabaseModule**: Room database dependencies (if added later)

---

## Common Issues

### Issue: "Hilt Activity must be attached to an @AndroidEntryPoint Application"

**Solution:** Ensure `VieczApplication` is set in `AndroidManifest.xml`:
```xml
<application android:name=".VieczApplication" ...>
```

### Issue: "Cannot find symbol: DaggerVieczApplication_HiltComponents"

**Solution:** Rebuild the project. Hilt generates code at compile time:
```bash
./gradlew clean build
```

### Issue: "ViewModel not injectable"

**Solution:** Ensure:
1. ViewModel has `@HiltViewModel` annotation
2. Constructor has `@Inject` annotation
3. Activity/Fragment has `@AndroidEntryPoint`
4. Use `hiltViewModel()` in Composables

### Issue: "Dependency cycle detected"

**Solution:** Break the cycle by introducing an interface or restructuring dependencies.

---

## Migration Checklist

✅ **Completed:**
- [x] Add Hilt dependencies
- [x] Create `VieczApplication` with `@HiltAndroidApp`
- [x] Update `AndroidManifest.xml`
- [x] Create `NetworkModule` and `DataModule`
- [x] Refactor all ViewModels to use `@HiltViewModel`
- [x] Add `@AndroidEntryPoint` to `MainActivity`
- [x] Replace `viewModel()` with `hiltViewModel()` in Composables

🔄 **Next Steps:**
- [ ] Update Composables to use `hiltViewModel()`
- [ ] Write unit tests using Hilt
- [ ] Add instrumented tests with `@HiltAndroidTest`
- [ ] Remove `RetrofitClient` object (no longer needed)

---

## Resources

- [Hilt Documentation](https://dagger.dev/hilt/)
- [Android Hilt Guide](https://developer.android.com/training/dependency-injection/hilt-android)
- [Hilt Testing](https://developer.android.com/training/dependency-injection/hilt-testing)
- [Hilt Best Practices](https://developer.android.com/training/dependency-injection/hilt-best-practices)
