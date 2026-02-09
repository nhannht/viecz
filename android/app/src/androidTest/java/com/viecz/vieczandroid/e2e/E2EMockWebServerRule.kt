package com.viecz.vieczandroid.e2e

import okhttp3.mockwebserver.MockWebServer
import org.junit.rules.TestWatcher
import org.junit.runner.Description

/**
 * JUnit TestWatcher that manages MockWebServer lifecycle.
 * Must be the outermost rule in the RuleChain so the server is running
 * before Hilt creates Retrofit (which reads MockWebServerHolder.baseUrl).
 *
 * Pre-computes and caches the base URL on the test thread to avoid
 * NetworkOnMainThreadException from MockWebServer.url()'s reverse DNS lookup.
 */
class E2EMockWebServerRule : TestWatcher() {

    private lateinit var server: MockWebServer

    override fun starting(description: Description) {
        server = MockWebServer()
        server.dispatcher = FakeApiDispatcher()
        server.start()
        MockWebServerHolder.server = server
        // Cache the URL now (on test thread) to avoid DNS lookup on main thread
        MockWebServerHolder.cachedBaseUrl = server.url("/api/v1/")
    }

    override fun finished(description: Description) {
        try {
            server.shutdown()
        } catch (_: Exception) {
            // Ignore shutdown errors
        }
        MockWebServerHolder.server = null
        MockWebServerHolder.cachedBaseUrl = null
    }
}
