package com.viecz.vieczandroid.data.api

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class RetrofitClientTest {

    @Test
    fun `retrofit instance is not null`() {
        assertNotNull(RetrofitClient.retrofit)
    }

    @Test
    fun `retrofit base URL is configured correctly`() {
        val baseUrl = RetrofitClient.retrofit.baseUrl().toString()
        assertEquals("http://localhost:8080/api/v1/", baseUrl)
    }

    @Test
    fun `paymentApi is created successfully`() {
        assertNotNull(RetrofitClient.paymentApi)
    }

    @Test
    fun `authApi is created successfully`() {
        assertNotNull(RetrofitClient.authApi)
    }

    @Test
    fun `taskApi is created successfully`() {
        assertNotNull(RetrofitClient.taskApi)
    }

    @Test
    fun `categoryApi is created successfully`() {
        assertNotNull(RetrofitClient.categoryApi)
    }

    @Test
    fun `userApi is created successfully`() {
        assertNotNull(RetrofitClient.userApi)
    }
}
