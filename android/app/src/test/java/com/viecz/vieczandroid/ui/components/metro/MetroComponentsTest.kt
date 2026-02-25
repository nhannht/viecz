package com.viecz.vieczandroid.ui.components.metro

import android.app.Application
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.viecz.vieczandroid.ui.theme.VieczTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [34])
class MetroComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ── MetroButton ─────────────────────────────────────────────────

    @Test
    fun `MetroButton primary renders label and clicks`() {
        var clicked = false
        composeTestRule.setContent {
            VieczTheme {
                MetroButton(label = "SUBMIT", onClick = { clicked = true })
            }
        }
        composeTestRule.onNodeWithText("SUBMIT").assertIsDisplayed()
        composeTestRule.onNodeWithText("SUBMIT").performClick()
        assertTrue(clicked)
    }

    @Test
    fun `MetroButton secondary shows label with arrow`() {
        composeTestRule.setContent {
            VieczTheme {
                MetroButton(label = "Learn more", onClick = {}, variant = MetroButtonVariant.Secondary)
            }
        }
        composeTestRule.onNodeWithText("Learn more >").assertIsDisplayed()
    }

    @Test
    fun `MetroButton disabled prevents click`() {
        var clicked = false
        composeTestRule.setContent {
            VieczTheme {
                MetroButton(label = "DISABLED", onClick = { clicked = true }, enabled = false)
            }
        }
        composeTestRule.onNodeWithText("DISABLED").assertIsNotEnabled()
    }

    // ── MetroCard ───────────────────────────────────────────────────

    @Test
    fun `MetroCard renders content`() {
        composeTestRule.setContent {
            VieczTheme {
                MetroCard {
                    Text("Card body")
                }
            }
        }
        composeTestRule.onNodeWithText("Card body").assertIsDisplayed()
    }

    @Test
    fun `MetroCard clickable variant calls onClick`() {
        var clicked = false
        composeTestRule.setContent {
            VieczTheme {
                MetroCard(onClick = { clicked = true }) {
                    Text("Clickable card")
                }
            }
        }
        composeTestRule.onNodeWithText("Clickable card").performClick()
        assertTrue(clicked)
    }

    // ── MetroBadge ──────────────────────────────────────────────────

    @Test
    fun `MetroBadge renders uppercase label`() {
        composeTestRule.setContent {
            VieczTheme {
                MetroBadge(label = "open", status = MetroBadgeStatus.Open)
            }
        }
        composeTestRule.onNodeWithText("OPEN").assertIsDisplayed()
    }

    @Test
    fun `MetroBadge renders all statuses`() {
        composeTestRule.setContent {
            VieczTheme {
                MetroBadge(label = "in progress", status = MetroBadgeStatus.InProgress)
                MetroBadge(label = "completed", status = MetroBadgeStatus.Completed)
                MetroBadge(label = "cancelled", status = MetroBadgeStatus.Cancelled)
            }
        }
        composeTestRule.onNodeWithText("IN PROGRESS").assertIsDisplayed()
        composeTestRule.onNodeWithText("COMPLETED").assertIsDisplayed()
        composeTestRule.onNodeWithText("CANCELLED").assertIsDisplayed()
    }

    // ── MetroInput ──────────────────────────────────────────────────

    @Test
    fun `MetroInput renders label and placeholder`() {
        composeTestRule.setContent {
            VieczTheme {
                MetroInput(
                    value = "",
                    onValueChange = {},
                    label = "EMAIL",
                    placeholder = "your@email.com",
                )
            }
        }
        composeTestRule.onNodeWithText("EMAIL").assertIsDisplayed()
        composeTestRule.onNodeWithText("your@email.com").assertIsDisplayed()
    }

    @Test
    fun `MetroInput shows error message`() {
        composeTestRule.setContent {
            VieczTheme {
                MetroInput(
                    value = "bad",
                    onValueChange = {},
                    label = "EMAIL",
                    error = "Invalid email",
                )
            }
        }
        composeTestRule.onNodeWithText("Invalid email").assertIsDisplayed()
    }

    // ── MetroSpinner ────────────────────────────────────────────────

    @Test
    fun `MetroSpinner renders with accessibility label`() {
        composeTestRule.setContent {
            VieczTheme {
                MetroSpinner(label = "Loading tasks")
            }
        }
        composeTestRule.waitForIdle()
        // Spinner exists (no crash)
    }

    // ── MetroDivider ────────────────────────────────────────────────

    @Test
    fun `MetroDivider renders without crash`() {
        composeTestRule.setContent {
            VieczTheme {
                MetroDivider()
            }
        }
        composeTestRule.waitForIdle()
    }

    // ── MetroTabs ───────────────────────────────────────────────────

    @Test
    fun `MetroTabs renders all tab labels`() {
        composeTestRule.setContent {
            VieczTheme {
                MetroTabs(
                    tabs = listOf(
                        MetroTab("a", "TAB A"),
                        MetroTab("b", "TAB B"),
                    ),
                    activeTab = "a",
                    onTabChanged = {},
                )
            }
        }
        composeTestRule.onNodeWithText("TAB A").assertIsDisplayed()
        composeTestRule.onNodeWithText("TAB B").assertIsDisplayed()
    }

    @Test
    fun `MetroTabs emits value on tab click`() {
        var selected = ""
        composeTestRule.setContent {
            VieczTheme {
                MetroTabs(
                    tabs = listOf(
                        MetroTab("a", "TAB A"),
                        MetroTab("b", "TAB B"),
                    ),
                    activeTab = "a",
                    onTabChanged = { selected = it },
                )
            }
        }
        composeTestRule.onNodeWithText("TAB B").performClick()
        assertEquals("b", selected)
    }

    // ── MetroSelect ─────────────────────────────────────────────────

    @Test
    fun `MetroSelect renders label and placeholder`() {
        composeTestRule.setContent {
            VieczTheme {
                MetroSelect(
                    selected = "",
                    onSelected = {},
                    options = listOf(MetroSelectOption("1", "Option 1")),
                    label = "CATEGORY",
                    placeholder = "Pick one",
                )
            }
        }
        composeTestRule.onNodeWithText("CATEGORY").assertIsDisplayed()
        composeTestRule.onNodeWithText("Pick one").assertIsDisplayed()
    }

    // ── MetroTextarea ───────────────────────────────────────────────

    @Test
    fun `MetroTextarea renders label`() {
        composeTestRule.setContent {
            VieczTheme {
                MetroTextarea(
                    value = "",
                    onValueChange = {},
                    label = "DESCRIPTION",
                    placeholder = "Describe...",
                )
            }
        }
        composeTestRule.onNodeWithText("DESCRIPTION").assertIsDisplayed()
    }

    // ── MetroDialog ─────────────────────────────────────────────────

    @Test
    fun `MetroDialog shows title and buttons when open`() {
        composeTestRule.setContent {
            VieczTheme {
                MetroDialog(
                    open = true,
                    onDismiss = {},
                    title = "CONFIRM",
                    confirmLabel = "YES",
                    cancelLabel = "No",
                ) {
                    Text("Are you sure?")
                }
            }
        }
        composeTestRule.onNodeWithText("CONFIRM").assertIsDisplayed()
        composeTestRule.onNodeWithText("YES").assertIsDisplayed()
        composeTestRule.onNodeWithText("No >").assertIsDisplayed()
        composeTestRule.onNodeWithText("Are you sure?").assertIsDisplayed()
    }

    @Test
    fun `MetroDialog hidden when open is false`() {
        composeTestRule.setContent {
            VieczTheme {
                MetroDialog(
                    open = false,
                    onDismiss = {},
                    title = "HIDDEN",
                ) {
                    Text("Should not appear")
                }
            }
        }
        composeTestRule.onNodeWithText("HIDDEN").assertDoesNotExist()
    }
}
