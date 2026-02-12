package com.viecz.vieczandroid.ui.screens

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.viecz.vieczandroid.data.models.Category
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.data.models.TaskStatus
import com.viecz.vieczandroid.ui.components.TaskCard
import com.viecz.vieczandroid.ui.components.TaskStatusBadge
import com.viecz.vieczandroid.ui.components.formatPrice
import com.viecz.vieczandroid.ui.theme.VieczTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@RunWith(AndroidJUnit4::class)
class HomeScreenComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private fun createTestTask(
        id: Long = 1,
        title: String = "Test Task",
        description: String = "Test description",
        price: Long = 100000,
        status: TaskStatus = TaskStatus.OPEN,
        location: String = "Test Location"
    ) = Task(
        id = id,
        title = title,
        description = description,
        price = price,
        status = status,
        location = location,
        categoryId = 1,
        requesterId = 1,
        userHasApplied = false,
        createdAt = "2024-01-01T00:00:00Z",
        updatedAt = "2024-01-01T00:00:00Z"
    )

    // --- TaskCard tests ---

    @Test
    fun taskCardDisplaysTitle() {
        composeTestRule.setContent {
            VieczTheme {
                TaskCard(
                    task = createTestTask(title = "My Task Title"),
                    onClick = {}
                )
            }
        }

        composeTestRule.onNodeWithText("My Task Title").assertIsDisplayed()
    }

    @Test
    fun taskCardDisplaysDescription() {
        composeTestRule.setContent {
            VieczTheme {
                TaskCard(
                    task = createTestTask(description = "Detailed task description"),
                    onClick = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Detailed task description").assertIsDisplayed()
    }

    @Test
    fun taskCardDisplaysLocation() {
        composeTestRule.setContent {
            VieczTheme {
                TaskCard(
                    task = createTestTask(location = "Ho Chi Minh City"),
                    onClick = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Ho Chi Minh City").assertIsDisplayed()
    }

    @Test
    fun taskCardCallsOnClick() {
        var clicked = false
        composeTestRule.setContent {
            VieczTheme {
                TaskCard(
                    task = createTestTask(),
                    onClick = { clicked = true }
                )
            }
        }

        composeTestRule.onNodeWithText("Test Task").performClick()
        assertTrue(clicked)
    }

    // --- TaskStatusBadge tests ---

    @Test
    fun taskStatusBadgeDisplaysOpen() {
        composeTestRule.setContent {
            VieczTheme {
                TaskStatusBadge(status = "OPEN")
            }
        }

        composeTestRule.onNodeWithText("Open").assertIsDisplayed()
    }

    @Test
    fun taskStatusBadgeDisplaysInProgress() {
        composeTestRule.setContent {
            VieczTheme {
                TaskStatusBadge(status = "IN_PROGRESS")
            }
        }

        composeTestRule.onNodeWithText("In Progress").assertIsDisplayed()
    }

    @Test
    fun taskStatusBadgeDisplaysCompleted() {
        composeTestRule.setContent {
            VieczTheme {
                TaskStatusBadge(status = "COMPLETED")
            }
        }

        composeTestRule.onNodeWithText("Completed").assertIsDisplayed()
    }

    @Test
    fun taskStatusBadgeDisplaysCancelled() {
        composeTestRule.setContent {
            VieczTheme {
                TaskStatusBadge(status = "CANCELLED")
            }
        }

        composeTestRule.onNodeWithText("Cancelled").assertIsDisplayed()
    }

    @Test
    fun taskStatusBadgeDisplaysUnknownStatus() {
        composeTestRule.setContent {
            VieczTheme {
                TaskStatusBadge(status = "CUSTOM")
            }
        }

        composeTestRule.onNodeWithText("CUSTOM").assertIsDisplayed()
    }

    // --- CategoryFilterRow tests ---

    @Test
    fun categoryFilterRowDisplaysAllChip() {
        composeTestRule.setContent {
            VieczTheme {
                CategoryFilterRow(
                    categories = listOf(
                        Category(id = 1, name = "Cleaning", nameVi = "Don dep")
                    ),
                    selectedCategoryId = null,
                    onCategorySelected = {}
                )
            }
        }

        composeTestRule.onNodeWithText("All").assertIsDisplayed()
    }

    @Test
    fun categoryFilterRowDisplaysCategoryNames() {
        composeTestRule.setContent {
            VieczTheme {
                CategoryFilterRow(
                    categories = listOf(
                        Category(id = 1, name = "Cleaning", nameVi = "Don dep"),
                        Category(id = 2, name = "Delivery", nameVi = "Giao hang")
                    ),
                    selectedCategoryId = null,
                    onCategorySelected = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Don dep").assertIsDisplayed()
        composeTestRule.onNodeWithText("Giao hang").assertIsDisplayed()
    }

    @Test
    fun categoryFilterRowCallsOnCategorySelected() {
        var selectedId: Long? = -1L

        composeTestRule.setContent {
            VieczTheme {
                CategoryFilterRow(
                    categories = listOf(
                        Category(id = 1, name = "Cleaning", nameVi = "Don dep")
                    ),
                    selectedCategoryId = null,
                    onCategorySelected = { selectedId = it }
                )
            }
        }

        composeTestRule.onNodeWithText("All").performClick()
        assertEquals(null, selectedId)
    }

    // --- SearchBar tests ---

    @Test
    fun searchBarDisplaysPlaceholder() {
        composeTestRule.setContent {
            VieczTheme {
                SearchBar(
                    query = "",
                    onQueryChange = {},
                    onSearch = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Search tasks...").assertIsDisplayed()
    }

    @Test
    fun searchBarDisplaysEnteredText() {
        composeTestRule.setContent {
            VieczTheme {
                SearchBar(
                    query = "cleaning",
                    onQueryChange = {},
                    onSearch = {}
                )
            }
        }

        composeTestRule.onNodeWithText("cleaning").assertIsDisplayed()
    }

    // --- formatPrice tests ---

    @Test
    fun formatPriceFormatsVietnameseCurrency() {
        val formatted = formatPrice(100000)
        // Vietnamese currency format should contain the number
        assertTrue(formatted.contains("100"))
    }

    // --- TaskCardShimmer tests ---

    @Test
    fun taskCardShimmerRendersWithoutError() {
        composeTestRule.setContent {
            VieczTheme {
                TaskCardShimmer()
            }
        }

        // Just verify it renders without crashing
        composeTestRule.onRoot().assertIsDisplayed()
    }
}
