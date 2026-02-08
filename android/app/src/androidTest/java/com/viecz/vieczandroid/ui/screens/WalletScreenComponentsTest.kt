package com.viecz.vieczandroid.ui.screens

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.viecz.vieczandroid.data.models.Wallet
import com.viecz.vieczandroid.data.models.WalletTransaction
import com.viecz.vieczandroid.data.models.WalletTransactionType
import com.viecz.vieczandroid.ui.theme.VieczTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.test.assertEquals

@RunWith(AndroidJUnit4::class)
class WalletScreenComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private fun createTestWallet() = Wallet(
        id = 1,
        userId = 1,
        balance = 500000,
        escrowBalance = 100000,
        totalDeposited = 1500000,
        totalWithdrawn = 200000,
        totalEarned = 1000000,
        totalSpent = 400000,
        createdAt = "2024-01-01T00:00:00Z",
        updatedAt = "2024-01-01T00:00:00Z"
    )

    private fun createTestTransaction(
        description: String = "Test transaction",
        type: WalletTransactionType = WalletTransactionType.DEPOSIT,
        amount: Long = 100000
    ) = WalletTransaction(
        id = 1,
        walletId = 1,
        transactionId = null,
        taskId = null,
        type = type,
        amount = amount,
        balanceBefore = 500000,
        balanceAfter = 600000,
        escrowBefore = 0,
        escrowAfter = 0,
        description = description,
        referenceUserId = null,
        createdAt = "2024-01-01T00:00:00Z"
    )

    // --- WalletBalanceCard tests ---

    @Test
    fun walletBalanceCardDisplaysAvailableBalance() {
        composeTestRule.setContent {
            VieczTheme { WalletBalanceCard(wallet = createTestWallet()) }
        }
        composeTestRule.onNodeWithText("Available Balance").assertIsDisplayed()
    }

    @Test
    fun walletBalanceCardDisplaysEscrow() {
        composeTestRule.setContent {
            VieczTheme { WalletBalanceCard(wallet = createTestWallet()) }
        }
        composeTestRule.onNodeWithText("In Escrow").assertIsDisplayed()
    }

    @Test
    fun walletBalanceCardDisplaysTotalEarned() {
        composeTestRule.setContent {
            VieczTheme { WalletBalanceCard(wallet = createTestWallet()) }
        }
        composeTestRule.onNodeWithText("Total Earned").assertIsDisplayed()
    }

    @Test
    fun walletBalanceCardDisplaysTotalSpent() {
        composeTestRule.setContent {
            VieczTheme { WalletBalanceCard(wallet = createTestWallet()) }
        }
        composeTestRule.onNodeWithText("Total Spent").assertIsDisplayed()
    }

    // --- TransactionItem tests ---

    @Test
    fun transactionItemDisplaysDescription() {
        composeTestRule.setContent {
            VieczTheme {
                TransactionItem(transaction = createTestTransaction(description = "Manual deposit"))
            }
        }
        composeTestRule.onNodeWithText("Manual deposit").assertIsDisplayed()
    }

    @Test
    fun transactionItemDisplaysTransactionType() {
        composeTestRule.setContent {
            VieczTheme {
                TransactionItem(transaction = createTestTransaction(type = WalletTransactionType.DEPOSIT))
            }
        }
        composeTestRule.onNodeWithText("Deposit").assertIsDisplayed()
    }

    // --- ErrorCard tests ---

    @Test
    fun errorCardDisplaysErrorTitle() {
        composeTestRule.setContent {
            VieczTheme { ErrorCard(message = "Network error", onRetry = {}) }
        }
        composeTestRule.onNodeWithText("Error").assertIsDisplayed()
    }

    @Test
    fun errorCardDisplaysErrorMessage() {
        composeTestRule.setContent {
            VieczTheme { ErrorCard(message = "Network error", onRetry = {}) }
        }
        composeTestRule.onNodeWithText("Network error").assertIsDisplayed()
    }

    @Test
    fun errorCardDisplaysRetryButton() {
        composeTestRule.setContent {
            VieczTheme { ErrorCard(message = "Network error", onRetry = {}) }
        }
        composeTestRule.onNodeWithText("Retry").assertIsDisplayed()
    }

    @Test
    fun errorCardRetryCallsCallback() {
        var retryCalled = false
        composeTestRule.setContent {
            VieczTheme { ErrorCard(message = "Error", onRetry = { retryCalled = true }) }
        }
        composeTestRule.onNodeWithText("Retry").performClick()
        kotlin.test.assertTrue(retryCalled)
    }

    // --- formatTransactionType tests ---

    @Test
    fun formatTransactionTypeDeposit() {
        assertEquals("Deposit", formatTransactionType(WalletTransactionType.DEPOSIT))
    }

    @Test
    fun formatTransactionTypeWithdrawal() {
        assertEquals("Withdrawal", formatTransactionType(WalletTransactionType.WITHDRAWAL))
    }

    @Test
    fun formatTransactionTypeEscrowHold() {
        assertEquals("Escrow Hold", formatTransactionType(WalletTransactionType.ESCROW_HOLD))
    }

    @Test
    fun formatTransactionTypeEscrowRelease() {
        assertEquals("Escrow Release", formatTransactionType(WalletTransactionType.ESCROW_RELEASE))
    }

    @Test
    fun formatTransactionTypeRefund() {
        assertEquals("Refund", formatTransactionType(WalletTransactionType.ESCROW_REFUND))
    }

    @Test
    fun formatTransactionTypePaymentReceived() {
        assertEquals("Payment Received", formatTransactionType(WalletTransactionType.PAYMENT_RECEIVED))
    }

    @Test
    fun formatTransactionTypePlatformFee() {
        assertEquals("Platform Fee", formatTransactionType(WalletTransactionType.PLATFORM_FEE))
    }
}
