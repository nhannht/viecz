package com.viecz.benchmark

import androidx.benchmark.macro.CompilationMode
import androidx.benchmark.macro.FrameTimingMetric
import androidx.benchmark.macro.StartupMode
import androidx.benchmark.macro.junit4.MacrobenchmarkRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Direction
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Measures frame timing (jank) while scrolling the marketplace task list.
 *
 * Run: ./gradlew :benchmark:connectedDevBenchmarkAndroidTest
 * JSON results: benchmark/build/outputs/connected_android_test_additional_output/
 */
@RunWith(AndroidJUnit4::class)
class ScrollBenchmark {

    @get:Rule
    val benchmarkRule = MacrobenchmarkRule()

    @Test
    fun scrollMarketplace() = benchmarkRule.measureRepeated(
        packageName = "com.viecz.vieczandroid.dev",
        metrics = listOf(FrameTimingMetric()),
        compilationMode = CompilationMode.None(),
        startupMode = StartupMode.WARM,
        iterations = 5,
    ) {
        pressHome()
        startActivityAndWait()

        // Wait for marketplace list to load, then scroll
        val list = device.findObject(By.scrollable(true))
        if (list != null) {
            list.setGestureMargin(device.displayWidth / 5)
            repeat(3) {
                list.fling(Direction.DOWN)
                device.waitForIdle()
            }
            repeat(3) {
                list.fling(Direction.UP)
                device.waitForIdle()
            }
        }
    }
}
