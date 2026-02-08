package com.viecz.vieczandroid.testutil

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.rules.TestWatcher
import org.junit.runner.Description

/**
 * JUnit rule for setting up MockWebServer for API tests.
 *
 * Automatically starts the MockWebServer before each test
 * and shuts it down after each test.
 *
 * Usage:
 * ```
 * @get:Rule
 * val mockWebServerRule = MockWebServerRule()
 *
 * @Test
 * fun testApiCall() {
 *     // Enqueue mock response
 *     mockWebServerRule.enqueue(MockResponse().setBody("{}"))
 *
 *     // Create API with base URL
 *     val api = RetrofitBuilder.createApi(mockWebServerRule.baseUrl)
 *
 *     // Test your API call
 * }
 * ```
 */
class MockWebServerRule : TestWatcher() {

    private val mockWebServer = MockWebServer()

    /**
     * Base URL of the mock server.
     * Use this to configure your Retrofit instance in tests.
     */
    val baseUrl: String
        get() = mockWebServer.url("/").toString()

    /**
     * Enqueue a mock response to be returned by the server.
     */
    fun enqueue(mockResponse: MockResponse) {
        mockWebServer.enqueue(mockResponse)
    }

    /**
     * Get the MockWebServer instance directly for advanced usage.
     */
    fun getServer(): MockWebServer = mockWebServer

    override fun starting(description: Description) {
        super.starting(description)
        mockWebServer.start()
    }

    override fun finished(description: Description) {
        super.finished(description)
        mockWebServer.shutdown()
    }
}
