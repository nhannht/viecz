package com.viecz.vieczandroid

import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.RuleChain
import org.junit.runner.RunWith

/**
 * Tests that VieczApp does not render the boilerplate outer Scaffold
 * elements (duplicate TopAppBar and placeholder Email FAB) that would
 * overlap with screen-level Scaffolds.
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class VieczAppTest {

    private val hiltRule = HiltAndroidRule(this)
    private val composeRule = createAndroidComposeRule<MainActivity>()

    @get:Rule
    val ruleChain: RuleChain = RuleChain
        .outerRule(hiltRule)
        .around(composeRule)

    @Before
    fun setup() {
        hiltRule.inject()
    }

    @Test
    fun vieczAppDoesNotShowOuterEmailFab() {
        assert(
            composeRule.onAllNodes(
                hasContentDescription("Email")
            ).fetchSemanticsNodes().isEmpty()
        ) { "Outer Email FAB should not exist" }
    }

    @Test
    fun vieczAppDoesNotShowOuterMoreOptionsButton() {
        assert(
            composeRule.onAllNodes(
                hasContentDescription("More options")
            ).fetchSemanticsNodes().isEmpty()
        ) { "Outer More options button should not exist" }
    }
}
