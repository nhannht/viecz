package com.viecz.vieczandroid.testutil

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestDispatcher
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.rules.TestWatcher
import org.junit.runner.Description

/**
 * JUnit rule for setting up TestDispatcher for coroutine tests.
 *
 * Automatically replaces Dispatchers.Main with TestDispatcher before each test
 * and resets it after each test.
 *
 * Usage:
 * ```
 * @get:Rule
 * val coroutineRule = CoroutineTestRule()
 *
 * @Test
 * fun myTest() = runTest {
 *     // Your test code using coroutines
 * }
 * ```
 */
@ExperimentalCoroutinesApi
class CoroutineTestRule(
    val testDispatcher: TestDispatcher = UnconfinedTestDispatcher()
) : TestWatcher() {

    override fun starting(description: Description) {
        super.starting(description)
        Dispatchers.setMain(testDispatcher)
    }

    override fun finished(description: Description) {
        super.finished(description)
        Dispatchers.resetMain()
    }
}
