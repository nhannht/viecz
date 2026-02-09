package com.viecz.vieczandroid.e2e

import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.mockwebserver.MockWebServer

/**
 * Singleton holder for MockWebServer instance.
 *
 * The base URL is pre-computed and cached when the server starts (on the test thread)
 * to avoid calling MockWebServer.url() on the main thread, which triggers a reverse
 * DNS lookup via InetAddress.getCanonicalHostName() and causes NetworkOnMainThreadException.
 *
 * Returns a fallback URL when server isn't running, so non-E2E @HiltAndroidTest tests
 * (like MainActivityTest) don't crash during Hilt DI graph construction.
 */
object MockWebServerHolder {
    var server: MockWebServer? = null
    var cachedBaseUrl: HttpUrl? = null

    val baseUrl: HttpUrl
        get() = cachedBaseUrl
            ?: "http://localhost:1/api/v1/".toHttpUrl()
}
