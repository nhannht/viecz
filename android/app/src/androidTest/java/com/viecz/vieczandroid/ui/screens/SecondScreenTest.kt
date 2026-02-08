package com.viecz.vieczandroid.ui.screens

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.viecz.vieczandroid.ui.theme.VieczTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.test.assertTrue

@RunWith(AndroidJUnit4::class)
class SecondScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun secondScreenDisplaysTitle() {
        composeTestRule.setContent {
            VieczTheme {
                SecondScreen(onPreviousClick = {})
            }
        }

        composeTestRule.onNodeWithText("Second Screen").assertIsDisplayed()
    }

    @Test
    fun secondScreenDisplaysDescription() {
        composeTestRule.setContent {
            VieczTheme {
                SecondScreen(onPreviousClick = {})
            }
        }

        composeTestRule.onNodeWithText(
            "Welcome to the second screen! Material 3 provides beautiful, adaptive design."
        ).assertIsDisplayed()
    }

    @Test
    fun secondScreenDisplaysPreviousButton() {
        composeTestRule.setContent {
            VieczTheme {
                SecondScreen(onPreviousClick = {})
            }
        }

        composeTestRule.onNodeWithText("Previous").assertIsDisplayed()
    }

    @Test
    fun clickingPreviousButtonCallsCallback() {
        var previousClicked = false

        composeTestRule.setContent {
            VieczTheme {
                SecondScreen(onPreviousClick = { previousClicked = true })
            }
        }

        composeTestRule.onNodeWithText("Previous").performClick()
        assertTrue(previousClicked)
    }
}
