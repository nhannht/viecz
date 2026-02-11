package com.viecz.vieczandroid.di

import com.viecz.vieczandroid.BuildConfig
import com.viecz.vieczandroid.data.api.*
import com.viecz.vieczandroid.data.local.TokenManager
import io.mockk.mockk
import okhttp3.logging.HttpLoggingInterceptor
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class NetworkModuleTest {

    @Test
    fun `provideHttpLoggingInterceptor returns interceptor with BODY level`() {
        val interceptor = NetworkModule.provideHttpLoggingInterceptor()

        assertNotNull(interceptor)
        assertEquals(HttpLoggingInterceptor.Level.BODY, interceptor.level)
    }

    @Test
    fun `provideAuthInterceptor returns AuthInterceptor`() {
        val tokenManager = mockk<TokenManager>(relaxed = true)

        val interceptor = NetworkModule.provideAuthInterceptor(tokenManager)

        assertNotNull(interceptor)
        assertIs<AuthInterceptor>(interceptor)
    }

    @Test
    fun `provideOkHttpClient has both interceptors`() {
        val tokenManager = mockk<TokenManager>(relaxed = true)
        val authInterceptor = NetworkModule.provideAuthInterceptor(tokenManager)
        val loggingInterceptor = NetworkModule.provideHttpLoggingInterceptor()

        val client = NetworkModule.provideOkHttpClient(authInterceptor, loggingInterceptor)

        assertNotNull(client)
        assertTrue(client.interceptors.contains(authInterceptor))
        assertTrue(client.interceptors.contains(loggingInterceptor))
    }

    @Test
    fun `provideOkHttpClient has 30 second timeouts`() {
        val tokenManager = mockk<TokenManager>(relaxed = true)
        val authInterceptor = NetworkModule.provideAuthInterceptor(tokenManager)
        val loggingInterceptor = NetworkModule.provideHttpLoggingInterceptor()

        val client = NetworkModule.provideOkHttpClient(authInterceptor, loggingInterceptor)

        assertEquals(30_000, client.connectTimeoutMillis)
        assertEquals(30_000, client.readTimeoutMillis)
        assertEquals(30_000, client.writeTimeoutMillis)
    }

    @Test
    fun `provideMoshi returns Moshi instance`() {
        val moshi = NetworkModule.provideMoshi()

        assertNotNull(moshi)
    }

    @Test
    fun `provideMoshi can adapt Kotlin classes`() {
        val moshi = NetworkModule.provideMoshi()
        val adapter = moshi.adapter(ErrorResponse::class.java)

        assertNotNull(adapter)
        val result = adapter.fromJson("""{"error":"test"}""")
        assertEquals("test", result?.error)
    }

    @Test
    fun `provideRetrofit has correct base URL`() {
        val tokenManager = mockk<TokenManager>(relaxed = true)
        val authInterceptor = NetworkModule.provideAuthInterceptor(tokenManager)
        val loggingInterceptor = NetworkModule.provideHttpLoggingInterceptor()
        val okHttpClient = NetworkModule.provideOkHttpClient(authInterceptor, loggingInterceptor)
        val moshi = NetworkModule.provideMoshi()

        val retrofit = NetworkModule.provideRetrofit(okHttpClient, moshi)

        assertEquals(BuildConfig.API_BASE_URL, retrofit.baseUrl().toString())
    }

    @Test
    fun `provideAuthApi creates AuthApi instance`() {
        val retrofit = buildRetrofit()
        val api = NetworkModule.provideAuthApi(retrofit)
        assertNotNull(api)
    }

    @Test
    fun `provideTaskApi creates TaskApi instance`() {
        val retrofit = buildRetrofit()
        val api = NetworkModule.provideTaskApi(retrofit)
        assertNotNull(api)
    }

    @Test
    fun `provideCategoryApi creates CategoryApi instance`() {
        val retrofit = buildRetrofit()
        val api = NetworkModule.provideCategoryApi(retrofit)
        assertNotNull(api)
    }

    @Test
    fun `provideUserApi creates UserApi instance`() {
        val retrofit = buildRetrofit()
        val api = NetworkModule.provideUserApi(retrofit)
        assertNotNull(api)
    }

    @Test
    fun `providePaymentApi creates PaymentApi instance`() {
        val retrofit = buildRetrofit()
        val api = NetworkModule.providePaymentApi(retrofit)
        assertNotNull(api)
    }

    @Test
    fun `provideWalletApi creates WalletApi instance`() {
        val retrofit = buildRetrofit()
        val api = NetworkModule.provideWalletApi(retrofit)
        assertNotNull(api)
    }

    @Test
    fun `provideMessageApi creates MessageApi instance`() {
        val retrofit = buildRetrofit()
        val api = NetworkModule.provideMessageApi(retrofit)
        assertNotNull(api)
    }

    @Test
    fun `auth interceptor is added before logging interceptor`() {
        val tokenManager = mockk<TokenManager>(relaxed = true)
        val authInterceptor = NetworkModule.provideAuthInterceptor(tokenManager)
        val loggingInterceptor = NetworkModule.provideHttpLoggingInterceptor()

        val client = NetworkModule.provideOkHttpClient(authInterceptor, loggingInterceptor)

        val authIndex = client.interceptors.indexOf(authInterceptor)
        val loggingIndex = client.interceptors.indexOf(loggingInterceptor)
        assertTrue(authIndex < loggingIndex, "Auth interceptor should come before logging interceptor")
    }

    // Helper to build a Retrofit instance for API creation tests
    private fun buildRetrofit(): retrofit2.Retrofit {
        val tokenManager = mockk<TokenManager>(relaxed = true)
        val authInterceptor = NetworkModule.provideAuthInterceptor(tokenManager)
        val loggingInterceptor = NetworkModule.provideHttpLoggingInterceptor()
        val okHttpClient = NetworkModule.provideOkHttpClient(authInterceptor, loggingInterceptor)
        val moshi = NetworkModule.provideMoshi()
        return NetworkModule.provideRetrofit(okHttpClient, moshi)
    }
}
