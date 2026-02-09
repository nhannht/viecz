package com.viecz.vieczandroid.e2e

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@E2ETest
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class WalletFlowE2ETest : BaseE2ETest() {

    @Before
    fun setup() {
        loginAsTestUser()
    }

    @Test
    fun homeToWalletShowsBalanceAndTransactions() {
        // Wait for home
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Viecz - Task Marketplace"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Navigate to wallet
        composeRule.onNodeWithContentDescription("Wallet").performClick()

        // Wait for wallet screen
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("My Wallet"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("My Wallet").assertIsDisplayed()

        // Wait for wallet data to load (transactions)
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Initial deposit"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Verify transaction descriptions are visible
        composeRule.onNodeWithText("Initial deposit").assertIsDisplayed()
    }
}
