package com.viecz.vieczandroid.e2e

import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import com.viecz.vieczandroid.MainActivity
import com.viecz.vieczandroid.data.local.TokenManager
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Rule
import org.junit.rules.RuleChain
import org.junit.rules.TestWatcher
import org.junit.runner.Description
import javax.inject.Inject

/**
 * Base class for E2E tests. Sets up MockWebServer → Hilt → TokenSetup → ComposeTestRule chain.
 *
 * Token setup runs BEFORE the activity launches so the splash screen sees the correct
 * login state. Subclasses set [shouldStartLoggedIn] to control this.
 */
@HiltAndroidTest
abstract class BaseE2ETest {

    /**
     * Override to true if the test needs the app to start at the home screen (logged in).
     * Override to false if the test needs to start at splash/login.
     */
    abstract val shouldStartLoggedIn: Boolean

    val mockServerRule = E2EMockWebServerRule()
    val hiltRule = HiltAndroidRule(this)

    /**
     * Sets up or clears tokens BEFORE the activity launches.
     * Uses a standalone TokenManager with the app context (shares the same DataStore singleton).
     */
    private val tokenSetupRule = object : TestWatcher() {
        override fun starting(description: Description) {
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            val tokenManager = TokenManager(context)
            runBlocking {
                if (shouldStartLoggedIn) {
                    tokenManager.saveTokens(
                        accessToken = "fake-access-token-12345",
                        refreshToken = "fake-refresh-token-67890"
                    )
                    tokenManager.saveUserInfo(
                        userId = 1L,
                        email = "test@example.com",
                        name = "Test User"
                    )
                } else {
                    tokenManager.clearTokens()
                }
            }
        }
    }

    val composeRule = createAndroidComposeRule<MainActivity>()

    @get:Rule
    val ruleChain: RuleChain = RuleChain
        .outerRule(mockServerRule)
        .around(hiltRule)
        .around(tokenSetupRule)
        .around(composeRule)

    @Inject
    lateinit var tokenManager: TokenManager

    @Before
    fun baseSetup() {
        hiltRule.inject()
    }
}
