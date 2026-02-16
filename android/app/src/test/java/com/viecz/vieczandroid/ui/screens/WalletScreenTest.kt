package com.viecz.vieczandroid.ui.screens

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.hasScrollToNodeAction
import com.viecz.vieczandroid.data.models.WalletTransactionType
import com.viecz.vieczandroid.data.repository.WalletRepository
import com.viecz.vieczandroid.testutil.CoroutineTestRule
import com.viecz.vieczandroid.testutil.TestData
import com.viecz.vieczandroid.ui.viewmodels.WalletViewModel
import io.mockk.clearAllMocks
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class WalletScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockRepo: WalletRepository
    private lateinit var viewModel: WalletViewModel

    @Before
    fun setup() {
        mockRepo = mockk()
        coEvery { mockRepo.getWallet() } returns Result.success(TestData.createWallet())
        coEvery { mockRepo.getTransactionHistory() } returns Result.success(
            listOf(
                TestData.createWalletTransaction(description = "Deposit from bank", type = WalletTransactionType.DEPOSIT),
                TestData.createWalletTransaction(id = 2, description = "Payment for task", type = WalletTransactionType.ESCROW_HOLD, amount = -50000L)
            )
        )
        viewModel = WalletViewModel(mockRepo)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `WalletScreen displays app bar title`() {
        composeTestRule.setContent {
            MaterialTheme {
                WalletScreen(onNavigateBack = {}, viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithText("My Wallet").assertIsDisplayed()
    }

    @Test
    fun `WalletScreen displays back button`() {
        composeTestRule.setContent {
            MaterialTheme {
                WalletScreen(onNavigateBack = {}, viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    @Test
    fun `WalletScreen back button triggers navigation`() {
        var navigatedBack = false

        composeTestRule.setContent {
            MaterialTheme {
                WalletScreen(onNavigateBack = { navigatedBack = true }, viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithContentDescription("Back").performClick()
        assert(navigatedBack)
    }

    @Test
    fun `WalletScreen displays refresh button`() {
        composeTestRule.setContent {
            MaterialTheme {
                WalletScreen(onNavigateBack = {}, viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithContentDescription("Refresh").assertIsDisplayed()
    }

    @Test
    fun `WalletScreen displays deposit FAB`() {
        composeTestRule.setContent {
            MaterialTheme {
                WalletScreen(onNavigateBack = {}, viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithContentDescription("Deposit").assertIsDisplayed()
    }

    @Test
    fun `WalletScreen displays balance card after loading`() {
        composeTestRule.setContent {
            MaterialTheme {
                WalletScreen(onNavigateBack = {}, viewModel = viewModel)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Total Balance").assertIsDisplayed()
        composeTestRule.onNodeWithText("Available").assertIsDisplayed()
        composeTestRule.onNodeWithText("In Escrow").assertIsDisplayed()
        composeTestRule.onNodeWithText("Earned").assertIsDisplayed()
        composeTestRule.onNodeWithText("Spent").assertIsDisplayed()
    }

    @Test
    fun `WalletScreen displays transaction history header`() {
        composeTestRule.setContent {
            MaterialTheme {
                WalletScreen(onNavigateBack = {}, viewModel = viewModel)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Transaction History"))
        composeTestRule.onNodeWithText("Transaction History").assertExists()
    }

    @Test
    fun `WalletScreen displays transactions`() {
        composeTestRule.setContent {
            MaterialTheme {
                WalletScreen(onNavigateBack = {}, viewModel = viewModel)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Deposit from bank"))
        composeTestRule.onNodeWithText("Deposit from bank").assertExists()

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Payment for task"))
        composeTestRule.onNodeWithText("Payment for task").assertExists()
    }

    @Test
    fun `WalletScreen shows empty transactions message when no transactions`() {
        coEvery { mockRepo.getTransactionHistory() } returns Result.success(emptyList())
        val emptyViewModel = WalletViewModel(mockRepo)

        composeTestRule.setContent {
            MaterialTheme {
                WalletScreen(onNavigateBack = {}, viewModel = emptyViewModel)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("No transactions yet"))
        composeTestRule.onNodeWithText("No transactions yet").assertExists()
    }

    @Test
    fun `WalletScreen shows error state when wallet load fails`() {
        coEvery { mockRepo.getWallet() } returns Result.failure(Exception("Failed to load"))
        coEvery { mockRepo.getTransactionHistory() } returns Result.failure(Exception("Failed"))
        val errorViewModel = WalletViewModel(mockRepo)

        composeTestRule.setContent {
            MaterialTheme {
                WalletScreen(onNavigateBack = {}, viewModel = errorViewModel)
            }
        }

        composeTestRule.waitForIdle()

        // "Error" text may appear multiple times (header + content), use onFirst
        composeTestRule.onAllNodesWithText("Error").onFirst().assertExists()
        composeTestRule.onAllNodesWithText("Retry").onFirst().assertExists()
    }
}
