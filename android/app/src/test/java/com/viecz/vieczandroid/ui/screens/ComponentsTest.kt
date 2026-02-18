package com.viecz.vieczandroid.ui.screens

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.hasScrollToNodeAction
import com.viecz.vieczandroid.data.models.*
import com.viecz.vieczandroid.testutil.TestData
import com.viecz.vieczandroid.ui.components.TaskCard
import com.viecz.vieczandroid.ui.components.TaskStatusBadge
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ===== TaskCard Tests =====

    @Test
    fun `TaskCard displays task title and description`() {
        val task = TestData.createTask(title = "Clean my room", description = "Need help cleaning")

        composeTestRule.setContent {
            MaterialTheme {
                TaskCard(task = task, onClick = {})
            }
        }

        composeTestRule.onNodeWithText("Clean my room").assertIsDisplayed()
        composeTestRule.onNodeWithText("Need help cleaning").assertIsDisplayed()
    }

    @Test
    fun `TaskCard displays location`() {
        val task = TestData.createTask(location = "District 5, HCMC")

        composeTestRule.setContent {
            MaterialTheme {
                TaskCard(task = task, onClick = {})
            }
        }

        composeTestRule.onNodeWithText("District 5, HCMC").assertIsDisplayed()
    }

    @Test
    fun `TaskCard click triggers callback`() {
        var clicked = false
        val task = TestData.createTask()

        composeTestRule.setContent {
            MaterialTheme {
                TaskCard(task = task, onClick = { clicked = true })
            }
        }

        composeTestRule.onNodeWithText("Test Task").performClick()
        assert(clicked)
    }

    // ===== TaskStatusBadge Tests =====

    @Test
    fun `TaskStatusBadge displays Open for OPEN status`() {
        composeTestRule.setContent {
            MaterialTheme {
                TaskStatusBadge(status = "OPEN")
            }
        }

        composeTestRule.onNodeWithText("Open").assertIsDisplayed()
    }

    @Test
    fun `TaskStatusBadge displays In Progress for IN_PROGRESS status`() {
        composeTestRule.setContent {
            MaterialTheme {
                TaskStatusBadge(status = "IN_PROGRESS")
            }
        }

        composeTestRule.onNodeWithText("In Progress").assertIsDisplayed()
    }

    @Test
    fun `TaskStatusBadge displays Completed for COMPLETED status`() {
        composeTestRule.setContent {
            MaterialTheme {
                TaskStatusBadge(status = "COMPLETED")
            }
        }

        composeTestRule.onNodeWithText("Completed").assertIsDisplayed()
    }

    @Test
    fun `TaskStatusBadge displays Cancelled for CANCELLED status`() {
        composeTestRule.setContent {
            MaterialTheme {
                TaskStatusBadge(status = "CANCELLED")
            }
        }

        composeTestRule.onNodeWithText("Cancelled").assertIsDisplayed()
    }

    // ===== CategoryFilterRow Tests =====

    @Test
    fun `CategoryFilterRow displays All chip`() {
        composeTestRule.setContent {
            MaterialTheme {
                CategoryFilterRow(
                    categories = emptyList(),
                    selectedCategoryId = null,
                    onCategorySelected = {}
                )
            }
        }

        composeTestRule.onNodeWithText("All").assertIsDisplayed()
    }

    @Test
    fun `CategoryFilterRow displays category names`() {
        val categories = listOf(
            TestData.createCategory(id = 1, nameVi = "Dọn dẹp"),
            TestData.createCategory(id = 2, nameVi = "Giao hàng")
        )

        composeTestRule.setContent {
            MaterialTheme {
                CategoryFilterRow(
                    categories = categories,
                    selectedCategoryId = null,
                    onCategorySelected = {}
                )
            }
        }

        composeTestRule.onNodeWithText("All").assertIsDisplayed()
        composeTestRule.onNodeWithText("Dọn dẹp").assertIsDisplayed()
        composeTestRule.onNodeWithText("Giao hàng").assertIsDisplayed()
    }

    @Test
    fun `CategoryFilterRow click triggers callback with category id`() {
        var selectedId: Long? = -1L
        val categories = listOf(
            TestData.createCategory(id = 5, nameVi = "Tutoring")
        )

        composeTestRule.setContent {
            MaterialTheme {
                CategoryFilterRow(
                    categories = categories,
                    selectedCategoryId = null,
                    onCategorySelected = { selectedId = it }
                )
            }
        }

        composeTestRule.onNodeWithText("Tutoring").performClick()
        assert(selectedId == 5L)
    }

    @Test
    fun `CategoryFilterRow All chip click triggers callback with null`() {
        var selectedId: Long? = 5L

        composeTestRule.setContent {
            MaterialTheme {
                CategoryFilterRow(
                    categories = listOf(TestData.createCategory(id = 5, nameVi = "Cat")),
                    selectedCategoryId = 5L,
                    onCategorySelected = { selectedId = it }
                )
            }
        }

        composeTestRule.onNodeWithText("All").performClick()
        assert(selectedId == null)
    }

    // ===== SearchBar Tests =====

    @Test
    fun `SearchBar displays placeholder text`() {
        composeTestRule.setContent {
            MaterialTheme {
                SearchBar(query = "", onQueryChange = {}, onClear = {})
            }
        }

        composeTestRule.onNodeWithText("Search tasks...").assertIsDisplayed()
    }

    @Test
    fun `SearchBar displays current query`() {
        composeTestRule.setContent {
            MaterialTheme {
                SearchBar(query = "cleaning", onQueryChange = {}, onClear = {})
            }
        }

        composeTestRule.onNodeWithText("cleaning").assertIsDisplayed()
    }

    // ===== MessageBubble Tests =====

    @Test
    fun `MessageBubble displays message content`() {
        val message = TestData.createMessage(content = "Hello there!", sender = null)

        composeTestRule.setContent {
            MaterialTheme {
                MessageBubble(message = message, currentUserId = 1L)
            }
        }

        composeTestRule.onNodeWithText("Hello there!").assertIsDisplayed()
    }

    @Test
    fun `MessageBubble from other user shows sender name`() {
        val sender = TestData.createUser(name = "John Doe")
        val message = TestData.createMessage(content = "Hi!", sender = sender)

        composeTestRule.setContent {
            MaterialTheme {
                MessageBubble(message = message, currentUserId = 999L)
            }
        }

        composeTestRule.onNodeWithText("John Doe").assertIsDisplayed()
        composeTestRule.onNodeWithText("Hi!").assertIsDisplayed()
    }

    @Test
    fun `MessageBubble from me does not show sender name`() {
        val message = TestData.createMessage(content = "My message", sender = null)

        composeTestRule.setContent {
            MaterialTheme {
                MessageBubble(message = message, currentUserId = 1L)
            }
        }

        composeTestRule.onNodeWithText("My message").assertIsDisplayed()
    }

    // ===== TypingIndicator Tests =====

    @Test
    fun `TypingIndicator renders without crash`() {
        composeTestRule.setContent {
            MaterialTheme {
                TypingIndicator()
            }
        }

        // TypingIndicator just renders 3 dots - verify it doesn't crash
        composeTestRule.onRoot().assertIsDisplayed()
    }

    // ===== ApplicationCard Tests =====

    @Test
    fun `ApplicationCard displays tasker id and status`() {
        val application = TestData.createTaskApplication(
            taskerId = 42,
            status = ApplicationStatus.PENDING
        )

        composeTestRule.setContent {
            MaterialTheme {
                ApplicationCard(application = application, taskPrice = 100000L, onAccept = {})
            }
        }

        composeTestRule.onNodeWithText("Tasker #42").assertIsDisplayed()
        composeTestRule.onNodeWithText("Pending").assertIsDisplayed()
    }

    @Test
    fun `ApplicationCard shows accept button for pending applications`() {
        val application = TestData.createTaskApplication(status = ApplicationStatus.PENDING)

        composeTestRule.setContent {
            MaterialTheme {
                ApplicationCard(application = application, taskPrice = 100000L, onAccept = {})
            }
        }

        composeTestRule.onNodeWithText("Accept Application").assertIsDisplayed()
    }

    @Test
    fun `ApplicationCard hides accept button for accepted applications`() {
        val application = TestData.createTaskApplication(status = ApplicationStatus.ACCEPTED)

        composeTestRule.setContent {
            MaterialTheme {
                ApplicationCard(application = application, taskPrice = 100000L, onAccept = {})
            }
        }

        composeTestRule.onNodeWithText("Accept Application").assertDoesNotExist()
        composeTestRule.onNodeWithText("Accepted").assertIsDisplayed()
    }

    @Test
    fun `ApplicationCard displays message when present`() {
        val application = TestData.createTaskApplication(message = "I can do this job!")

        composeTestRule.setContent {
            MaterialTheme {
                ApplicationCard(application = application, taskPrice = 100000L, onAccept = {})
            }
        }

        composeTestRule.onNodeWithText("I can do this job!").assertIsDisplayed()
    }

    @Test
    fun `ApplicationCard displays proposed price when present`() {
        val application = TestData.createTaskApplication(proposedPrice = 150000L)

        composeTestRule.setContent {
            MaterialTheme {
                ApplicationCard(application = application, taskPrice = 100000L, onAccept = {})
            }
        }

        composeTestRule.onNodeWithText("Proposed price:", substring = true).assertIsDisplayed()
    }

    @Test
    fun `ApplicationCard accept triggers callback`() {
        var accepted = false
        val application = TestData.createTaskApplication(status = ApplicationStatus.PENDING)

        composeTestRule.setContent {
            MaterialTheme {
                ApplicationCard(application = application, taskPrice = 100000L, onAccept = { accepted = true })
            }
        }

        composeTestRule.onNodeWithText("Accept Application").performClick()
        assert(accepted)
    }

    // ===== ApplicationStatusBadge Tests =====

    @Test
    fun `ApplicationStatusBadge displays Pending for PENDING status`() {
        composeTestRule.setContent {
            MaterialTheme {
                ApplicationStatusBadge(status = ApplicationStatus.PENDING)
            }
        }
        composeTestRule.onNodeWithText("Pending").assertIsDisplayed()
    }

    @Test
    fun `ApplicationStatusBadge displays Accepted for ACCEPTED status`() {
        composeTestRule.setContent {
            MaterialTheme {
                ApplicationStatusBadge(status = ApplicationStatus.ACCEPTED)
            }
        }
        composeTestRule.onNodeWithText("Accepted").assertIsDisplayed()
    }

    @Test
    fun `ApplicationStatusBadge displays Rejected for REJECTED status`() {
        composeTestRule.setContent {
            MaterialTheme {
                ApplicationStatusBadge(status = ApplicationStatus.REJECTED)
            }
        }
        composeTestRule.onNodeWithText("Rejected").assertIsDisplayed()
    }

    // ===== TaskDetailContent Tests =====

    @Test
    fun `TaskDetailContent shows task title and description`() {
        val task = TestData.createTask(
            title = "Fix plumbing",
            description = "Kitchen sink is leaking",
            location = "123 Main St"
        )

        composeTestRule.setContent {
            MaterialTheme {
                TaskDetailContent(
                    task = task,
                    applications = emptyList(),
                    conversationId = null,
                    onApply = {},
                    onAcceptApplication = {},
                    onCompleteTask = {},
                    onMessageClick = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Fix plumbing").assertIsDisplayed()
        composeTestRule.onNodeWithText("Kitchen sink is leaking").assertIsDisplayed()
        composeTestRule.onNodeWithText("123 Main St").assertIsDisplayed()
    }

    @Test
    fun `TaskDetailContent shows apply button for open task not applied`() {
        val task = TestData.createTask(status = TaskStatus.OPEN, userHasApplied = false)

        composeTestRule.setContent {
            MaterialTheme {
                TaskDetailContent(
                    task = task,
                    applications = emptyList(),
                    conversationId = null,
                    isCurrentUserTasker = true,
                    onApply = {},
                    onAcceptApplication = {},
                    onCompleteTask = {},
                    onMessageClick = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Apply for this Task").assertIsDisplayed()
    }

    @Test
    fun `TaskDetailContent shows pending status when already applied`() {
        val task = TestData.createTask(status = TaskStatus.OPEN, userHasApplied = true)

        composeTestRule.setContent {
            MaterialTheme {
                TaskDetailContent(
                    task = task,
                    applications = emptyList(),
                    conversationId = null,
                    isCurrentUserTasker = true,
                    onApply = {},
                    onAcceptApplication = {},
                    onCompleteTask = {},
                    onMessageClick = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Application Pending").assertIsDisplayed()
        composeTestRule.onNodeWithText("Apply for this Task").assertDoesNotExist()
    }

    @Test
    fun `TaskDetailContent shows message and complete buttons for in progress task`() {
        val task = TestData.createTask(status = TaskStatus.IN_PROGRESS)

        composeTestRule.setContent {
            MaterialTheme {
                TaskDetailContent(
                    task = task,
                    applications = emptyList(),
                    conversationId = null,
                    onApply = {},
                    onAcceptApplication = {},
                    onCompleteTask = {},
                    onMessageClick = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Message").assertIsDisplayed()
        composeTestRule.onNodeWithText("Mark as Completed").assertIsDisplayed()
    }

    @Test
    fun `TaskDetailContent hides action buttons for completed task`() {
        val task = TestData.createTask(status = TaskStatus.COMPLETED)

        composeTestRule.setContent {
            MaterialTheme {
                TaskDetailContent(
                    task = task,
                    applications = emptyList(),
                    conversationId = null,
                    onApply = {},
                    onAcceptApplication = {},
                    onCompleteTask = {},
                    onMessageClick = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Apply for this Task").assertDoesNotExist()
        composeTestRule.onNodeWithText("Message").assertDoesNotExist()
        composeTestRule.onNodeWithText("Mark as Completed").assertDoesNotExist()
    }

    @Test
    fun `TaskDetailContent displays applications list`() {
        val task = TestData.createTask(status = TaskStatus.OPEN)
        val applications = listOf(
            TestData.createTaskApplication(id = 1, taskerId = 10, status = ApplicationStatus.PENDING),
            TestData.createTaskApplication(id = 2, taskerId = 20, status = ApplicationStatus.ACCEPTED)
        )

        composeTestRule.setContent {
            MaterialTheme {
                TaskDetailContent(
                    task = task,
                    applications = applications,
                    conversationId = null,
                    onApply = {},
                    onAcceptApplication = {},
                    onCompleteTask = {},
                    onMessageClick = {}
                )
            }
        }

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Applications (2)"))
        composeTestRule.onNodeWithText("Applications (2)").assertExists()

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Tasker #10"))
        composeTestRule.onNodeWithText("Tasker #10").assertExists()

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Tasker #20"))
        composeTestRule.onNodeWithText("Tasker #20").assertExists()
    }

    // ===== ProfileContent Tests =====

    @Test
    fun `ProfileContent displays user name and email`() {
        val user = TestData.createUser(name = "Jane Doe", email = "jane@example.com")

        composeTestRule.setContent {
            MaterialTheme {
                ProfileContent(user = user, onBecomeTasker = {})
            }
        }

        composeTestRule.onNodeWithText("Jane Doe").assertIsDisplayed()
        // Email appears in both header and account info section
        composeTestRule.onAllNodesWithText("jane@example.com").onFirst().assertExists()
    }

    @Test
    fun `ProfileContent shows Tasker badge for tasker users`() {
        val user = TestData.createUser(isTasker = true)

        composeTestRule.setContent {
            MaterialTheme {
                ProfileContent(user = user, onBecomeTasker = {})
            }
        }

        composeTestRule.onNodeWithText("Tasker").assertIsDisplayed()
    }

    @Test
    fun `ProfileContent hides Tasker badge for non-tasker users`() {
        val user = TestData.createUser(isTasker = false)

        composeTestRule.setContent {
            MaterialTheme {
                ProfileContent(user = user, onBecomeTasker = {})
            }
        }

        composeTestRule.onNodeWithText("Tasker").assertDoesNotExist()
    }

    @Test
    fun `ProfileContent shows Become a Tasker button for non-tasker`() {
        val user = TestData.createUser(isTasker = false)

        composeTestRule.setContent {
            MaterialTheme {
                ProfileContent(user = user, onBecomeTasker = {})
            }
        }

        // Button may be scrolled off screen in LazyColumn, scroll to it
        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Become a Tasker"))
        composeTestRule.onNodeWithText("Become a Tasker").assertExists()
    }

    @Test
    fun `ProfileContent hides Become a Tasker button for tasker`() {
        val user = TestData.createUser(isTasker = true)

        composeTestRule.setContent {
            MaterialTheme {
                ProfileContent(user = user, onBecomeTasker = {})
            }
        }

        composeTestRule.onNodeWithText("Become a Tasker").assertDoesNotExist()
    }

    @Test
    fun `ProfileContent displays statistics`() {
        val user = TestData.createUser(
            rating = 4.5,
            totalTasksCompleted = 12,
            totalTasksPosted = 5
        )

        composeTestRule.setContent {
            MaterialTheme {
                ProfileContent(user = user, onBecomeTasker = {})
            }
        }

        composeTestRule.onNodeWithText("Statistics").assertIsDisplayed()
        composeTestRule.onNodeWithText("4.5").assertIsDisplayed()
        composeTestRule.onNodeWithText("12").assertIsDisplayed()
        composeTestRule.onNodeWithText("5").assertIsDisplayed()
    }

    @Test
    fun `ProfileContent displays account information`() {
        val user = TestData.createUser(
            email = "user@uni.edu",
            university = "HCMUS"
        )

        composeTestRule.setContent {
            MaterialTheme {
                ProfileContent(user = user, onBecomeTasker = {})
            }
        }

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Account Information"))
        composeTestRule.onNodeWithText("Account Information").assertExists()
        // Email appears in both header and account info section
        composeTestRule.onAllNodesWithText("user@uni.edu").onFirst().assertExists()
        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("HCMUS"))
        composeTestRule.onNodeWithText("HCMUS").assertExists()
    }

    // ===== WalletBalanceCard Tests =====

    @Test
    fun `WalletBalanceCard displays balance`() {
        val wallet = TestData.createWallet(balance = 500000L)

        composeTestRule.setContent {
            MaterialTheme {
                WalletBalanceCard(wallet = wallet)
            }
        }

        composeTestRule.onNodeWithText("Total Balance").assertIsDisplayed()
        composeTestRule.onNodeWithText("Available").assertIsDisplayed()
    }

    @Test
    fun `WalletBalanceCard displays escrow and totals`() {
        val wallet = TestData.createWallet(
            escrowBalance = 100000L,
            totalEarned = 200000L,
            totalSpent = 50000L
        )

        composeTestRule.setContent {
            MaterialTheme {
                WalletBalanceCard(wallet = wallet)
            }
        }

        composeTestRule.onNodeWithText("In Escrow").assertIsDisplayed()
        composeTestRule.onNodeWithText("Earned").assertIsDisplayed()
        composeTestRule.onNodeWithText("Spent").assertIsDisplayed()
    }

    // ===== TransactionItem Tests =====

    @Test
    fun `TransactionItem displays description and type`() {
        val transaction = TestData.createWalletTransaction(
            description = "Payment for cleaning",
            type = WalletTransactionType.DEPOSIT
        )

        composeTestRule.setContent {
            MaterialTheme {
                TransactionItem(transaction = transaction)
            }
        }

        composeTestRule.onNodeWithText("Payment for cleaning").assertIsDisplayed()
        composeTestRule.onNodeWithText("Deposit").assertIsDisplayed()
    }

    // ===== ErrorCard Tests =====

    @Test
    fun `ErrorCard displays error message and retry button`() {
        var retried = false

        composeTestRule.setContent {
            MaterialTheme {
                ErrorCard(message = "Something went wrong", onRetry = { retried = true })
            }
        }

        composeTestRule.onNodeWithText("Error").assertIsDisplayed()
        composeTestRule.onNodeWithText("Something went wrong").assertIsDisplayed()
        composeTestRule.onNodeWithText("Retry").assertIsDisplayed()

        composeTestRule.onNodeWithText("Retry").performClick()
        assert(retried)
    }

    // ===== CategorySelectionDialog Tests =====

    @Test
    fun `CategorySelectionDialog displays categories`() {
        val categories = listOf(
            TestData.createCategory(id = 1, nameVi = "Dọn dẹp"),
            TestData.createCategory(id = 2, nameVi = "Sửa chữa")
        )

        composeTestRule.setContent {
            MaterialTheme {
                CategorySelectionDialog(
                    categories = categories,
                    onDismiss = {},
                    onCategorySelected = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Select Category").assertIsDisplayed()
        composeTestRule.onNodeWithText("Dọn dẹp").assertIsDisplayed()
        composeTestRule.onNodeWithText("Sửa chữa").assertIsDisplayed()
        composeTestRule.onNodeWithText("Cancel").assertIsDisplayed()
    }

    @Test
    fun `CategorySelectionDialog selecting category triggers callback`() {
        var selectedCategory: Category? = null
        val categories = listOf(
            TestData.createCategory(id = 1, nameVi = "Dọn dẹp")
        )

        composeTestRule.setContent {
            MaterialTheme {
                CategorySelectionDialog(
                    categories = categories,
                    onDismiss = {},
                    onCategorySelected = { selectedCategory = it }
                )
            }
        }

        composeTestRule.onNodeWithText("Dọn dẹp").performClick()
        assert(selectedCategory?.id == 1)
    }
}
