package com.viecz.vieczandroid.e2e

import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.performClick
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
 * Base class for E2E tests that run against a real Go test server.
 * Mirrors [BaseE2ETest] but replaces MockWebServer with [RealServerRule].
 *
 * RuleChain: RealServerRule -> Hilt -> TokenSetup -> ComposeTestRule
 */
@HiltAndroidTest
abstract class RealServerBaseE2ETest {

    abstract val shouldStartLoggedIn: Boolean

    val realServerRule = RealServerRule()
    val hiltRule = HiltAndroidRule(this)

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
        .outerRule(realServerRule)
        .around(hiltRule)
        .around(tokenSetupRule)
        .around(composeRule)

    @Inject
    lateinit var tokenManager: TokenManager

    @Before
    fun baseSetup() {
        hiltRule.inject()
    }

    /** Dismiss any visible snackbar by tapping its dismiss (X) button. */
    fun dismissSnackbarIfPresent() {
        try {
            val nodes = composeRule.onAllNodes(hasContentDescription("Dismiss"))
                .fetchSemanticsNodes()
            if (nodes.isNotEmpty()) {
                composeRule.onAllNodes(hasContentDescription("Dismiss"))[0].performClick()
                composeRule.waitForIdle()
            }
        } catch (_: Exception) {
            // No snackbar visible — nothing to dismiss
        }
    }
}
