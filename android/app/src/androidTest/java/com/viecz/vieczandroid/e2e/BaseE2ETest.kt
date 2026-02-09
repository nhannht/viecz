package com.viecz.vieczandroid.e2e

import androidx.compose.ui.test.junit4.createAndroidComposeRule
import com.viecz.vieczandroid.MainActivity
import com.viecz.vieczandroid.data.local.TokenManager
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Rule
import org.junit.rules.RuleChain
import javax.inject.Inject

/**
 * Base class for E2E tests. Sets up MockWebServer → Hilt → ComposeTestRule chain.
 */
@HiltAndroidTest
abstract class BaseE2ETest {

    val mockServerRule = E2EMockWebServerRule()
    val hiltRule = HiltAndroidRule(this)
    val composeRule = createAndroidComposeRule<MainActivity>()

    @get:Rule
    val ruleChain: RuleChain = RuleChain
        .outerRule(mockServerRule)
        .around(hiltRule)
        .around(composeRule)

    @Inject
    lateinit var tokenManager: TokenManager

    @Before
    fun baseSetup() {
        hiltRule.inject()
    }

    /**
     * Pre-populate TokenManager with fake tokens so the app skips splash→login
     * and goes directly to home.
     */
    fun loginAsTestUser() {
        runBlocking {
            tokenManager.saveTokens(
                accessToken = "fake-access-token-12345",
                refreshToken = "fake-refresh-token-67890"
            )
            tokenManager.saveUserInfo(
                userId = 1L,
                email = "test@example.com",
                name = "Test User"
            )
        }
    }

    /**
     * Clear TokenManager so the app starts at the splash/login flow.
     */
    fun ensureLoggedOut() {
        runBlocking {
            tokenManager.clearTokens()
        }
    }
}
