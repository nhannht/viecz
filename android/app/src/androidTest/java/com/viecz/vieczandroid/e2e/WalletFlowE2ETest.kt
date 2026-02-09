package com.viecz.vieczandroid.e2e

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Test
import org.junit.runner.RunWith

@E2ETest
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class WalletFlowE2ETest : BaseE2ETest() {

    override val shouldStartLoggedIn = true

    @Test
    fun homeToWalletShowsBalanceAndTransactions() {
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Viecz - Task Marketplace"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithContentDescription("Wallet").performClick()

        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("My Wallet"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("My Wallet").assertIsDisplayed()

        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Initial deposit"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Initial deposit").assertIsDisplayed()
    }
}
