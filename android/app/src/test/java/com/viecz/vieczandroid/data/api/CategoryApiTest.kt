package com.viecz.vieczandroid.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class CategoryApiTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var categoryApi: CategoryApi

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        categoryApi = Retrofit.Builder()
            .baseUrl(mockWebServer.url("/api/v1/"))
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(CategoryApi::class.java)
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun `getCategories sends GET to categories`() = runTest {
        val responseJson = """
            [
                {
                    "id": 1,
                    "name": "Cleaning",
                    "name_vi": "Dọn dẹp",
                    "icon": "cleaning_icon",
                    "is_active": true
                },
                {
                    "id": 2,
                    "name": "Moving",
                    "name_vi": "Chuyển nhà",
                    "icon": "moving_icon",
                    "is_active": true
                },
                {
                    "id": 3,
                    "name": "Tutoring",
                    "name_vi": "Gia sư",
                    "is_active": false
                }
            ]
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = categoryApi.getCategories()

        assertEquals(3, result.size)
        assertEquals("Cleaning", result[0].name)
        assertEquals("Dọn dẹp", result[0].nameVi)
        assertEquals("cleaning_icon", result[0].icon)
        assertTrue(result[0].isActive)
        assertEquals("Moving", result[1].name)
        assertEquals(false, result[2].isActive)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assertEquals("/api/v1/categories", request.path)
    }

    @Test
    fun `getCategories with empty list returns empty`() = runTest {
        mockWebServer.enqueue(MockResponse().setBody("[]"))

        val result = categoryApi.getCategories()

        assertTrue(result.isEmpty())
    }

    @Test
    fun `getCategories with server error returns 500`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(500)
                .setBody("""{"error":"Internal server error"}""")
        )

        assertFailsWith<HttpException> {
            categoryApi.getCategories()
        }.also { exception ->
            assertEquals(500, exception.code())
        }
    }

    @Test
    fun `getCategories parses category without optional icon`() = runTest {
        val responseJson = """
            [
                {
                    "id": 1,
                    "name": "Other",
                    "name_vi": "Khác",
                    "is_active": true
                }
            ]
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = categoryApi.getCategories()

        assertEquals(1, result.size)
        assertEquals(null, result[0].icon)
    }
}
