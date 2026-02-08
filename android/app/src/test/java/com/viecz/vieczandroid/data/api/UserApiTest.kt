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

class UserApiTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var userApi: UserApi

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val userJson = """
        {
            "id": 1,
            "email": "user@example.com",
            "name": "Test User",
            "avatar_url": "https://example.com/avatar.jpg",
            "phone": "0912345678",
            "university": "HCMUS",
            "student_id": "12345",
            "is_verified": true,
            "rating": 4.8,
            "total_tasks_completed": 15,
            "total_tasks_posted": 3,
            "total_earnings": 1500000,
            "is_tasker": true,
            "tasker_bio": "Professional tasker",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-06-01T00:00:00Z"
        }
    """.trimIndent()

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        userApi = Retrofit.Builder()
            .baseUrl(mockWebServer.url("/api/v1/"))
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(UserApi::class.java)
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun `getUserProfile sends GET to users_id`() = runTest {
        mockWebServer.enqueue(MockResponse().setBody(userJson))

        val result = userApi.getUserProfile(1)

        assertEquals(1L, result.id)
        assertEquals("user@example.com", result.email)
        assertEquals("Test User", result.name)
        assertEquals(4.8, result.rating)
        assertTrue(result.isTasker)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assertEquals("/api/v1/users/1", request.path)
    }

    @Test
    fun `getMyProfile sends GET to users_me`() = runTest {
        mockWebServer.enqueue(MockResponse().setBody(userJson))

        val result = userApi.getMyProfile()

        assertEquals("user@example.com", result.email)
        assertEquals("HCMUS", result.university)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assertEquals("/api/v1/users/me", request.path)
    }

    @Test
    fun `updateProfile sends PUT to users_me with body`() = runTest {
        val updatedUserJson = userJson.replace("Test User", "Updated Name")
        mockWebServer.enqueue(MockResponse().setBody(updatedUserJson))

        val result = userApi.updateProfile(
            UpdateProfileRequest(
                name = "Updated Name",
                phone = "0987654321"
            )
        )

        assertEquals("Updated Name", result.name)

        val request = mockWebServer.takeRequest()
        assertEquals("PUT", request.method)
        assertEquals("/api/v1/users/me", request.path)
        val body = request.body.readUtf8()
        assert(body.contains("\"name\":\"Updated Name\""))
        assert(body.contains("\"phone\":\"0987654321\""))
    }

    @Test
    fun `becomeTasker sends POST to users_become-tasker`() = runTest {
        mockWebServer.enqueue(MockResponse().setBody(userJson))

        val result = userApi.becomeTasker()

        assertTrue(result.isTasker)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/users/become-tasker", request.path)
    }

    @Test
    fun `getUserProfile with non-existent ID returns 404`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(404)
                .setBody("""{"error":"User not found"}""")
        )

        assertFailsWith<HttpException> {
            userApi.getUserProfile(999)
        }.also { exception ->
            assertEquals(404, exception.code())
        }
    }

    @Test
    fun `getMyProfile without auth returns 401`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(401)
                .setBody("""{"error":"Unauthorized"}""")
        )

        assertFailsWith<HttpException> {
            userApi.getMyProfile()
        }.also { exception ->
            assertEquals(401, exception.code())
        }
    }

    @Test
    fun `updateProfile with partial data sends only provided fields`() = runTest {
        mockWebServer.enqueue(MockResponse().setBody(userJson))

        userApi.updateProfile(UpdateProfileRequest(name = "New Name"))

        val request = mockWebServer.takeRequest()
        val body = request.body.readUtf8()
        assert(body.contains("\"name\":\"New Name\""))
    }
}
