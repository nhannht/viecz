package com.viecz.vieczandroid.e2e

import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.mockwebserver.MockWebServer

/**
 * Singleton holder for MockWebServer instance.
 * Returns a fallback URL when server isn't running, so non-E2E @HiltAndroidTest tests
 * (like MainActivityTest) don't crash during Hilt DI graph construction.
 */
object MockWebServerHolder {
    var server: MockWebServer? = null

    val baseUrl: HttpUrl
        get() = server?.url("/api/v1/")
            ?: "http://localhost:1/api/v1/".toHttpUrl()
}
