package com.viecz.vieczandroid.ui.theme

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [34])
class ThemeTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // --- Color tests ---

    @Test
    fun `light primary color is correct`() {
        assertEquals(Color(0xFF6750A4), md_theme_light_primary)
    }

    @Test
    fun `light onPrimary color is white`() {
        assertEquals(Color(0xFFFFFFFF), md_theme_light_onPrimary)
    }

    @Test
    fun `light error color is correct`() {
        assertEquals(Color(0xFFB3261E), md_theme_light_error)
    }

    @Test
    fun `light background color is correct`() {
        assertEquals(Color(0xFFFFFBFE), md_theme_light_background)
    }

    @Test
    fun `dark primary color is correct`() {
        assertEquals(Color(0xFFD0BCFF), md_theme_dark_primary)
    }

    @Test
    fun `dark onPrimary color is correct`() {
        assertEquals(Color(0xFF381E72), md_theme_dark_onPrimary)
    }

    @Test
    fun `dark error color is correct`() {
        assertEquals(Color(0xFFF2B8B5), md_theme_dark_error)
    }

    @Test
    fun `dark background color is correct`() {
        assertEquals(Color(0xFF1C1B1F), md_theme_dark_background)
    }

    // --- Typography tests ---

    @Test
    fun `bodyLarge has correct font size`() {
        assertEquals(16.sp, Typography.bodyLarge.fontSize)
    }

    @Test
    fun `bodyLarge has correct line height`() {
        assertEquals(24.sp, Typography.bodyLarge.lineHeight)
    }

    @Test
    fun `bodyLarge has Normal font weight`() {
        assertEquals(FontWeight.Normal, Typography.bodyLarge.fontWeight)
    }

    @Test
    fun `titleLarge has correct font size`() {
        assertEquals(22.sp, Typography.titleLarge.fontSize)
    }

    @Test
    fun `titleLarge has correct line height`() {
        assertEquals(28.sp, Typography.titleLarge.lineHeight)
    }

    @Test
    fun `labelSmall has correct font size`() {
        assertEquals(11.sp, Typography.labelSmall.fontSize)
    }

    @Test
    fun `labelSmall has Medium font weight`() {
        assertEquals(FontWeight.Medium, Typography.labelSmall.fontWeight)
    }

    // --- VieczTheme composable tests ---

    @Test
    fun `VieczTheme renders content in light mode`() {
        composeTestRule.setContent {
            VieczTheme(darkTheme = false, dynamicColor = false) {
                Text("Light Theme Content")
            }
        }

        composeTestRule.onNodeWithText("Light Theme Content").assertIsDisplayed()
    }

    @Test
    fun `VieczTheme renders content in dark mode`() {
        composeTestRule.setContent {
            VieczTheme(darkTheme = true, dynamicColor = false) {
                Text("Dark Theme Content")
            }
        }

        composeTestRule.onNodeWithText("Dark Theme Content").assertIsDisplayed()
    }

    @Test
    fun `VieczTheme provides MaterialTheme colorScheme`() {
        var primaryColor: Color? = null

        composeTestRule.setContent {
            VieczTheme(darkTheme = false, dynamicColor = false) {
                primaryColor = MaterialTheme.colorScheme.primary
                Text("Test")
            }
        }

        composeTestRule.waitForIdle()
        assertNotNull(primaryColor)
        assertEquals(md_theme_light_primary, primaryColor)
    }

    @Test
    fun `VieczTheme dark mode provides dark colorScheme`() {
        var primaryColor: Color? = null

        composeTestRule.setContent {
            VieczTheme(darkTheme = true, dynamicColor = false) {
                primaryColor = MaterialTheme.colorScheme.primary
                Text("Test")
            }
        }

        composeTestRule.waitForIdle()
        assertNotNull(primaryColor)
        assertEquals(md_theme_dark_primary, primaryColor)
    }

    @Test
    fun `VieczTheme provides typography`() {
        var bodyFontSize: androidx.compose.ui.unit.TextUnit? = null

        composeTestRule.setContent {
            VieczTheme(darkTheme = false, dynamicColor = false) {
                bodyFontSize = MaterialTheme.typography.bodyLarge.fontSize
                Text("Test")
            }
        }

        composeTestRule.waitForIdle()
        assertEquals(16.sp, bodyFontSize)
    }
}
