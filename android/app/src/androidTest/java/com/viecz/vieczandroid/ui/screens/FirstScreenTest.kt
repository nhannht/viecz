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
class FirstScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun firstScreenDisplaysTitle() {
        composeTestRule.setContent {
            VieczTheme {
                FirstScreen(onNextClick = {}, onPaymentClick = {})
            }
        }

        composeTestRule.onNodeWithText("First Screen").assertIsDisplayed()
    }

    @Test
    fun firstScreenDisplaysDescription() {
        composeTestRule.setContent {
            VieczTheme {
                FirstScreen(onNextClick = {}, onPaymentClick = {})
            }
        }

        composeTestRule.onNodeWithText(
            "This is the first screen built with Jetpack Compose and Material 3"
        ).assertIsDisplayed()
    }

    @Test
    fun firstScreenDisplaysPaymentButton() {
        composeTestRule.setContent {
            VieczTheme {
                FirstScreen(onNextClick = {}, onPaymentClick = {})
            }
        }

        composeTestRule.onNodeWithText("Make Payment (2000 VND)").assertIsDisplayed()
    }

    @Test
    fun firstScreenDisplaysNextButton() {
        composeTestRule.setContent {
            VieczTheme {
                FirstScreen(onNextClick = {}, onPaymentClick = {})
            }
        }

        composeTestRule.onNodeWithText("Next").assertIsDisplayed()
    }

    @Test
    fun clickingNextButtonCallsCallback() {
        var nextClicked = false

        composeTestRule.setContent {
            VieczTheme {
                FirstScreen(
                    onNextClick = { nextClicked = true },
                    onPaymentClick = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Next").performClick()
        assertTrue(nextClicked)
    }

    @Test
    fun clickingPaymentButtonCallsCallback() {
        var paymentClicked = false

        composeTestRule.setContent {
            VieczTheme {
                FirstScreen(
                    onNextClick = {},
                    onPaymentClick = { paymentClicked = true }
                )
            }
        }

        composeTestRule.onNodeWithText("Make Payment (2000 VND)").performClick()
        assertTrue(paymentClicked)
    }
}
