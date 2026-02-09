package com.viecz.vieczandroid.e2e

import okhttp3.mockwebserver.MockWebServer
import org.junit.rules.TestWatcher
import org.junit.runner.Description

/**
 * JUnit TestWatcher that manages MockWebServer lifecycle.
 * Must be the outermost rule in the RuleChain so the server is running
 * before Hilt creates Retrofit (which reads MockWebServerHolder.baseUrl).
 */
class E2EMockWebServerRule : TestWatcher() {

    private lateinit var server: MockWebServer

    override fun starting(description: Description) {
        server = MockWebServer()
        server.dispatcher = FakeApiDispatcher()
        server.start()
        MockWebServerHolder.server = server
    }

    override fun finished(description: Description) {
        try {
            server.shutdown()
        } catch (_: Exception) {
            // Ignore shutdown errors
        }
        MockWebServerHolder.server = null
    }
}
