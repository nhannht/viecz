package com.viecz.vieczandroid.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.viecz.vieczandroid.data.models.ApplyTaskRequest
import com.viecz.vieczandroid.data.models.CreateTaskRequest
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

class TaskApiTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var taskApi: TaskApi

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val taskJson = """
        {
            "id": 1,
            "requester_id": 1,
            "category_id": 2,
            "title": "Help me move",
            "description": "Need help moving furniture",
            "price": 200000,
            "location": "District 1, HCMC",
            "status": "open",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "user_has_applied": false
        }
    """.trimIndent()

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        taskApi = Retrofit.Builder()
            .baseUrl(mockWebServer.url("/api/v1/"))
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(TaskApi::class.java)
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun `getTasks sends GET with default pagination`() = runTest {
        val responseJson = """
            {
                "data": [$taskJson],
                "page": 1,
                "limit": 20,
                "total": 1
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = taskApi.getTasks()

        assertEquals(1, result.data.size)
        assertEquals("Help me move", result.data[0].title)
        assertEquals(1, result.page)
        assertEquals(20, result.limit)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assert(request.path!!.startsWith("/api/v1/tasks"))
        assert(request.path!!.contains("page=1"))
        assert(request.path!!.contains("limit=20"))
    }

    @Test
    fun `getTasks sends GET with custom filters`() = runTest {
        val responseJson = """
            {
                "data": [],
                "page": 2,
                "limit": 10,
                "total": 0
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = taskApi.getTasks(
            page = 2,
            limit = 10,
            categoryId = 3,
            status = "open",
            search = "moving"
        )

        assertEquals(0, result.data.size)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assert(request.path!!.contains("page=2"))
        assert(request.path!!.contains("limit=10"))
        assert(request.path!!.contains("category_id=3"))
        assert(request.path!!.contains("status=open"))
        assert(request.path!!.contains("search=moving"))
    }

    @Test
    fun `getTasks sends GET with near me geo params`() = runTest {
        val responseJson = """
            {
                "data": [],
                "page": 1,
                "limit": 20,
                "total": 0
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        taskApi.getTasks(
            lat = 10.7758439,
            lng = 106.7017555,
            radius = 3000,
            sort = "distance"
        )

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assert(request.path!!.contains("lat=10.7758439"))
        assert(request.path!!.contains("lng=106.7017555"))
        assert(request.path!!.contains("radius=3000"))
        assert(request.path!!.contains("sort=distance"))
    }

    @Test
    fun `getTask sends GET to tasks_id`() = runTest {
        mockWebServer.enqueue(MockResponse().setBody(taskJson))

        val result = taskApi.getTask(42)

        assertEquals(1L, result.id)
        assertEquals("Help me move", result.title)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assertEquals("/api/v1/tasks/42", request.path)
    }

    @Test
    fun `createTask sends POST with request body`() = runTest {
        mockWebServer.enqueue(MockResponse().setBody(taskJson))

        val result = taskApi.createTask(
            CreateTaskRequest(
                title = "Help me move",
                description = "Need help moving furniture",
                categoryId = 2,
                price = 200000L,
                location = "District 1, HCMC"
            )
        )

        assertEquals("Help me move", result.title)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/tasks", request.path)
        val body = request.body.readUtf8()
        assert(body.contains("\"title\":\"Help me move\""))
        assert(body.contains("\"category_id\":2"))
        assert(body.contains("\"price\":200000"))
    }

    @Test
    fun `updateTask sends PUT to tasks_id with body`() = runTest {
        val updatedTaskJson = taskJson.replace("Help me move", "Help me clean")
        mockWebServer.enqueue(MockResponse().setBody(updatedTaskJson))

        val result = taskApi.updateTask(
            taskId = 1,
            request = CreateTaskRequest(
                title = "Help me clean",
                description = "Need help cleaning",
                categoryId = 2,
                price = 150000L,
                location = "District 1, HCMC"
            )
        )

        assertEquals("Help me clean", result.title)

        val request = mockWebServer.takeRequest()
        assertEquals("PUT", request.method)
        assertEquals("/api/v1/tasks/1", request.path)
        val body = request.body.readUtf8()
        assert(body.contains("\"title\":\"Help me clean\""))
    }

    @Test
    fun `deleteTask sends DELETE to tasks_id`() = runTest {
        mockWebServer.enqueue(MockResponse().setResponseCode(204))

        taskApi.deleteTask(5)

        val request = mockWebServer.takeRequest()
        assertEquals("DELETE", request.method)
        assertEquals("/api/v1/tasks/5", request.path)
    }

    @Test
    fun `applyForTask sends POST to tasks_id_applications`() = runTest {
        val applicationJson = """
            {
                "id": 10,
                "task_id": 1,
                "tasker_id": 2,
                "proposed_price": 180000,
                "message": "I can help!",
                "status": "pending",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(applicationJson))

        val result = taskApi.applyForTask(
            taskId = 1,
            request = ApplyTaskRequest(
                proposedPrice = 180000L,
                message = "I can help!"
            )
        )

        assertEquals(10L, result.id)
        assertEquals(180000L, result.proposedPrice)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/tasks/1/applications", request.path)
        val body = request.body.readUtf8()
        assert(body.contains("\"proposed_price\":180000"))
        assert(body.contains("\"message\":\"I can help!\""))
    }

    @Test
    fun `getTaskApplications sends GET to tasks_id_applications`() = runTest {
        val applicationsJson = """
            [
                {
                    "id": 1,
                    "task_id": 5,
                    "tasker_id": 2,
                    "status": "pending",
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                },
                {
                    "id": 2,
                    "task_id": 5,
                    "tasker_id": 3,
                    "proposed_price": 90000,
                    "status": "accepted",
                    "created_at": "2024-01-02T00:00:00Z",
                    "updated_at": "2024-01-02T00:00:00Z"
                }
            ]
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(applicationsJson))

        val result = taskApi.getTaskApplications(5)

        assertEquals(2, result.size)
        assertEquals(5L, result[0].taskId)
        assertEquals(90000L, result[1].proposedPrice)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assertEquals("/api/v1/tasks/5/applications", request.path)
    }

    @Test
    fun `completeTask sends POST to tasks_id_complete`() = runTest {
        val responseJson = """{"message": "task completed successfully"}"""
        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = taskApi.completeTask(1)

        assertEquals("task completed successfully", result.message)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/tasks/1/complete", request.path)
    }

    @Test
    fun `acceptApplication sends POST to applications_id_accept`() = runTest {
        val responseJson = """{"message": "Application accepted successfully"}"""
        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = taskApi.acceptApplication(7)

        assertEquals("Application accepted successfully", result.message)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/applications/7/accept", request.path)
    }

    @Test
    fun `getTask with non-existent ID returns 404`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(404)
                .setBody("""{"error":"Task not found"}""")
        )

        assertFailsWith<HttpException> {
            taskApi.getTask(999)
        }.also { exception ->
            assertEquals(404, exception.code())
        }
    }

    @Test
    fun `createTask with unauthorized returns 401`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(401)
                .setBody("""{"error":"Unauthorized"}""")
        )

        assertFailsWith<HttpException> {
            taskApi.createTask(
                CreateTaskRequest(
                    title = "Test",
                    description = "Test desc",
                    categoryId = 1,
                    price = 100000L,
                    location = "HCMC"
                )
            )
        }.also { exception ->
            assertEquals(401, exception.code())
        }
    }
}
