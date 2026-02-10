package com.viecz.vieczandroid.e2e

import androidx.test.platform.app.InstrumentationRegistry
import okhttp3.HttpUrl.Companion.toHttpUrl
import org.junit.rules.TestWatcher
import org.junit.runner.Description

/**
 * JUnit TestWatcher that configures [MockWebServerHolder.cachedBaseUrl] to point at
 * a real Go test server instead of a local MockWebServer.
 *
 * Must be the outermost rule in the RuleChain so the URL is set before
 * Hilt creates Retrofit (which reads MockWebServerHolder.baseUrl).
 *
 * The server host is read from instrumentation argument `testServerHost`.
 * Default: `10.0.2.2` (Android emulator loopback to host).
 */
class RealServerRule : TestWatcher() {

    override fun starting(description: Description) {
        val args = InstrumentationRegistry.getArguments()
        val host = args.getString("testServerHost", "10.0.2.2")
        val port = args.getString("testServerPort", "9999")
        val baseUrl = "http://$host:$port/api/v1/"

        // Reuse MockWebServerHolder so TestNetworkModule picks up this URL
        MockWebServerHolder.server = null
        MockWebServerHolder.cachedBaseUrl = baseUrl.toHttpUrl()
    }

    override fun finished(description: Description) {
        MockWebServerHolder.cachedBaseUrl = null
    }
}
