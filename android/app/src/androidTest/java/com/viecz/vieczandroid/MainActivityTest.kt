package com.viecz.vieczandroid

import android.content.Intent
import android.net.Uri
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.test.assertFalse

@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class MainActivityTest {

    @get:Rule
    val hiltRule = HiltAndroidRule(this)

    @Before
    fun setup() {
        hiltRule.inject()
    }

    @Test
    fun activityLaunchesSuccessfully() {
        val scenario = ActivityScenario.launch(MainActivity::class.java)
        scenario.onActivity { activity ->
            assertNotNull(activity)
        }
        scenario.close()
    }

    @Test
    fun paymentResultInitiallyNull() {
        val scenario = ActivityScenario.launch(MainActivity::class.java)
        scenario.onActivity { activity ->
            assertNull(activity.paymentResult.value)
        }
        scenario.close()
    }

    @Test
    fun deepLinkSuccessPaymentSetsResult() {
        val intent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("viecz://payment?status=success&orderCode=12345&message=Payment%20done")
        ).apply {
            setClassName(
                ApplicationProvider.getApplicationContext(),
                "com.viecz.vieczandroid.MainActivity"
            )
        }

        val scenario = ActivityScenario.launch<MainActivity>(intent)
        scenario.onActivity { activity ->
            val result = activity.paymentResult.value
            assertNotNull(result)
            assertTrue(result.success)
            assertEquals("12345", result.orderCode)
            assertEquals("Payment done", result.message)
        }
        scenario.close()
    }

    @Test
    fun deepLinkPaidStatusSetsSuccessResult() {
        val intent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("viecz://payment?status=PAID&orderCode=99")
        ).apply {
            setClassName(
                ApplicationProvider.getApplicationContext(),
                "com.viecz.vieczandroid.MainActivity"
            )
        }

        val scenario = ActivityScenario.launch<MainActivity>(intent)
        scenario.onActivity { activity ->
            val result = activity.paymentResult.value
            assertNotNull(result)
            assertTrue(result.success)
            assertEquals("99", result.orderCode)
            assertEquals("Payment successful", result.message)
        }
        scenario.close()
    }

    @Test
    fun deepLinkCancelPaymentSetsFailResult() {
        val intent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("viecz://payment?status=cancel&orderCode=12345")
        ).apply {
            setClassName(
                ApplicationProvider.getApplicationContext(),
                "com.viecz.vieczandroid.MainActivity"
            )
        }

        val scenario = ActivityScenario.launch<MainActivity>(intent)
        scenario.onActivity { activity ->
            val result = activity.paymentResult.value
            assertNotNull(result)
            assertFalse(result.success)
            assertEquals("12345", result.orderCode)
            assertEquals("Payment cancelled", result.message)
        }
        scenario.close()
    }

    @Test
    fun deepLinkCancelledStatusSetsFailResult() {
        val intent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("viecz://payment?status=CANCELLED&orderCode=456")
        ).apply {
            setClassName(
                ApplicationProvider.getApplicationContext(),
                "com.viecz.vieczandroid.MainActivity"
            )
        }

        val scenario = ActivityScenario.launch<MainActivity>(intent)
        scenario.onActivity { activity ->
            val result = activity.paymentResult.value
            assertNotNull(result)
            assertFalse(result.success)
        }
        scenario.close()
    }

    @Test
    fun deepLinkUnknownStatusSetsFailResult() {
        val intent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("viecz://payment?status=unknown&orderCode=789")
        ).apply {
            setClassName(
                ApplicationProvider.getApplicationContext(),
                "com.viecz.vieczandroid.MainActivity"
            )
        }

        val scenario = ActivityScenario.launch<MainActivity>(intent)
        scenario.onActivity { activity ->
            val result = activity.paymentResult.value
            assertNotNull(result)
            assertFalse(result.success)
            assertEquals("Unknown payment status", result.message)
        }
        scenario.close()
    }

    @Test
    fun clearPaymentResultSetsNull() {
        val scenario = ActivityScenario.launch(MainActivity::class.java)
        scenario.onActivity { activity ->
            activity.clearPaymentResult()
            assertNull(activity.paymentResult.value)
        }
        scenario.close()
    }
}
