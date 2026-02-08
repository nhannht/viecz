package com.viecz.vieczandroid.ui.screens

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.viecz.vieczandroid.data.models.User
import com.viecz.vieczandroid.ui.theme.VieczTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.test.assertTrue

@RunWith(AndroidJUnit4::class)
class ProfileScreenComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private fun createTestUser(
        name: String = "Test User",
        email: String = "test@example.com",
        isTasker: Boolean = false,
        rating: Double = 4.5,
        totalTasksCompleted: Int = 10,
        totalTasksPosted: Int = 5,
        university: String = "HCMUS",
        isVerified: Boolean = true
    ) = User(
        id = 1,
        email = email,
        name = name,
        avatarUrl = null,
        phone = null,
        university = university,
        studentId = null,
        isVerified = isVerified,
        rating = rating,
        totalTasksCompleted = totalTasksCompleted,
        totalTasksPosted = totalTasksPosted,
        totalEarnings = 0L,
        isTasker = isTasker,
        taskerBio = null,
        createdAt = "2024-01-01T00:00:00Z",
        updatedAt = "2024-01-01T00:00:00Z"
    )

    // --- ProfileContent tests ---

    @Test
    fun profileContentDisplaysUserName() {
        composeTestRule.setContent {
            VieczTheme {
                ProfileContent(
                    user = createTestUser(name = "John Doe"),
                    onBecomeTasker = {}
                )
            }
        }

        composeTestRule.onNodeWithText("John Doe").assertIsDisplayed()
    }

    @Test
    fun profileContentDisplaysUserEmail() {
        composeTestRule.setContent {
            VieczTheme {
                ProfileContent(
                    user = createTestUser(email = "john@example.com"),
                    onBecomeTasker = {}
                )
            }
        }

        // Email appears in both header and account info, verify at least one is displayed
        composeTestRule.onAllNodesWithText("john@example.com")[0].assertIsDisplayed()
    }

    @Test
    fun profileContentDisplaysStatistics() {
        composeTestRule.setContent {
            VieczTheme {
                ProfileContent(
                    user = createTestUser(rating = 4.5, totalTasksCompleted = 10, totalTasksPosted = 5),
                    onBecomeTasker = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Statistics").assertIsDisplayed()
        composeTestRule.onNodeWithText("4.5").assertIsDisplayed()
        composeTestRule.onNodeWithText("10").assertIsDisplayed()
        composeTestRule.onNodeWithText("5").assertIsDisplayed()
    }

    @Test
    fun profileContentDisplaysAccountInfo() {
        composeTestRule.setContent {
            VieczTheme {
                ProfileContent(
                    user = createTestUser(university = "HCMUS"),
                    onBecomeTasker = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Account Information").assertIsDisplayed()
        composeTestRule.onNodeWithText("HCMUS").assertIsDisplayed()
    }

    @Test
    fun profileContentDisplaysVerifiedStatus() {
        composeTestRule.setContent {
            VieczTheme {
                ProfileContent(
                    user = createTestUser(isVerified = true),
                    onBecomeTasker = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Yes").assertIsDisplayed()
    }

    @Test
    fun profileContentDisplaysNotVerifiedStatus() {
        composeTestRule.setContent {
            VieczTheme {
                ProfileContent(
                    user = createTestUser(isVerified = false),
                    onBecomeTasker = {}
                )
            }
        }

        composeTestRule.onNodeWithText("No").assertIsDisplayed()
    }

    @Test
    fun profileContentShowsTaskerBadgeForTasker() {
        composeTestRule.setContent {
            VieczTheme {
                ProfileContent(
                    user = createTestUser(isTasker = true),
                    onBecomeTasker = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Tasker").assertIsDisplayed()
    }

    @Test
    fun profileContentShowsBecomeTaskerButtonForNonTasker() {
        composeTestRule.setContent {
            VieczTheme {
                ProfileContent(
                    user = createTestUser(isTasker = false),
                    onBecomeTasker = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Become a Tasker").assertIsDisplayed()
    }

    @Test
    fun profileContentHidesBecomeTaskerButtonForTasker() {
        composeTestRule.setContent {
            VieczTheme {
                ProfileContent(
                    user = createTestUser(isTasker = true),
                    onBecomeTasker = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Become a Tasker").assertDoesNotExist()
    }

    @Test
    fun becomeTaskerButtonCallsCallback() {
        var becomeTaskerCalled = false
        composeTestRule.setContent {
            VieczTheme {
                ProfileContent(
                    user = createTestUser(isTasker = false),
                    onBecomeTasker = { becomeTaskerCalled = true }
                )
            }
        }

        composeTestRule.onNodeWithText("Become a Tasker").performClick()
        assertTrue(becomeTaskerCalled)
    }

    // --- StatisticItem tests ---

    @Test
    fun statisticItemDisplaysLabelAndValue() {
        composeTestRule.setContent {
            VieczTheme {
                StatisticItem(
                    icon = Icons.Default.Star,
                    label = "Rating",
                    value = "4.8"
                )
            }
        }

        composeTestRule.onNodeWithText("Rating").assertIsDisplayed()
        composeTestRule.onNodeWithText("4.8").assertIsDisplayed()
    }

    // --- InfoRow tests ---

    @Test
    fun infoRowDisplaysLabelAndValue() {
        composeTestRule.setContent {
            VieczTheme {
                InfoRow(
                    icon = Icons.Default.Star,
                    label = "Email",
                    value = "test@example.com"
                )
            }
        }

        composeTestRule.onNodeWithText("Email").assertIsDisplayed()
        composeTestRule.onNodeWithText("test@example.com").assertIsDisplayed()
    }
}
