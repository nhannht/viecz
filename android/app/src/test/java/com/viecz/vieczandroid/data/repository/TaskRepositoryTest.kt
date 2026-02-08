package com.viecz.vieczandroid.data.repository

import com.viecz.vieczandroid.data.api.TaskApi
import com.viecz.vieczandroid.data.local.dao.TaskDao
import com.viecz.vieczandroid.data.local.entities.TaskEntity
import com.viecz.vieczandroid.data.local.entities.toEntity
import com.viecz.vieczandroid.data.models.*
import com.viecz.vieczandroid.testutil.TestData
import io.mockk.*
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException
import java.io.IOException
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

class TaskRepositoryTest {

    private lateinit var mockApi: TaskApi
    private lateinit var mockTaskDao: TaskDao
    private lateinit var repository: TaskRepository

    @Before
    fun setup() {
        mockApi = mockk()
        mockTaskDao = mockk(relaxed = true)
        repository = TaskRepository(mockApi, mockTaskDao)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    // --- getTasks ---

    @Test
    fun `getTasks should return tasks on success`() = runTest {
        val tasksResponse = TestData.createTasksResponse(
            data = listOf(
                TestData.createTask(id = 1, title = "Task 1"),
                TestData.createTask(id = 2, title = "Task 2")
            ),
            total = 2
        )
        coEvery { mockApi.getTasks(any(), any(), any(), any(), any()) } returns tasksResponse

        val result = repository.getTasks()

        assertTrue(result.isSuccess)
        assertEquals(2, result.getOrNull()?.data?.size)
        assertEquals("Task 1", result.getOrNull()?.data?.get(0)?.title)
    }

    @Test
    fun `getTasks first page should cache tasks to database`() = runTest {
        val tasksResponse = TestData.createTasksResponse()
        coEvery { mockApi.getTasks(any(), any(), any(), any(), any()) } returns tasksResponse

        repository.getTasks(page = 1)

        coVerify { mockTaskDao.deleteAllTasks() }
        coVerify { mockTaskDao.insertTasks(any()) }
    }

    @Test
    fun `getTasks with filters should not cache tasks`() = runTest {
        val tasksResponse = TestData.createTasksResponse()
        coEvery { mockApi.getTasks(any(), any(), any(), any(), any()) } returns tasksResponse

        repository.getTasks(page = 1, categoryId = 2)

        coVerify(exactly = 0) { mockTaskDao.deleteAllTasks() }
        coVerify(exactly = 0) { mockTaskDao.insertTasks(any()) }
    }

    @Test
    fun `getTasks with network error should fallback to cache for first page`() = runTest {
        val cachedTask = TestData.createTask(title = "Cached Task")
        val cachedEntities = listOf(cachedTask.toEntity())
        coEvery { mockApi.getTasks(any(), any(), any(), any(), any()) } throws IOException("No network")
        every { mockTaskDao.getAllTasks() } returns flowOf(cachedEntities)

        val result = repository.getTasks(page = 1)

        assertTrue(result.isSuccess)
        assertEquals("Cached Task", result.getOrNull()?.data?.get(0)?.title)
    }

    @Test
    fun `getTasks with network error and no cache should return failure`() = runTest {
        coEvery { mockApi.getTasks(any(), any(), any(), any(), any()) } throws IOException("No network")
        every { mockTaskDao.getAllTasks() } returns flowOf(emptyList())

        val result = repository.getTasks(page = 1)

        assertTrue(result.isFailure)
        assertIs<IOException>(result.exceptionOrNull())
    }

    @Test
    fun `getTasks page 2 with network error should not use cache`() = runTest {
        coEvery { mockApi.getTasks(any(), any(), any(), any(), any()) } throws IOException("No network")

        val result = repository.getTasks(page = 2)

        assertTrue(result.isFailure)
        coVerify(exactly = 0) { mockTaskDao.getAllTasks() }
    }

    @Test
    fun `getTasks with category filter should pass correct parameter`() = runTest {
        val tasksResponse = TestData.createTasksResponse()
        coEvery { mockApi.getTasks(any(), any(), any(), any(), any()) } returns tasksResponse

        repository.getTasks(categoryId = 5L)

        coVerify { mockApi.getTasks(page = 1, categoryId = 5L, status = null, search = null, limit = any()) }
    }

    @Test
    fun `getTasks with search query should pass correct parameter`() = runTest {
        val tasksResponse = TestData.createTasksResponse()
        coEvery { mockApi.getTasks(any(), any(), any(), any(), any()) } returns tasksResponse

        repository.getTasks(search = "cleaning")

        coVerify { mockApi.getTasks(page = 1, categoryId = null, status = null, search = "cleaning", limit = any()) }
    }

    // --- getTask ---

    @Test
    fun `getTask should return task on success`() = runTest {
        val task = TestData.createTask(id = 5, title = "Specific Task")
        coEvery { mockApi.getTask(5) } returns task

        val result = repository.getTask(5)

        assertTrue(result.isSuccess)
        assertEquals("Specific Task", result.getOrNull()?.title)
    }

    @Test
    fun `getTask should cache task to database`() = runTest {
        val task = TestData.createTask(id = 5)
        coEvery { mockApi.getTask(5) } returns task

        repository.getTask(5)

        coVerify { mockTaskDao.insertTask(any()) }
    }

    @Test
    fun `getTask with network error should fallback to cache`() = runTest {
        val cachedTask = TestData.createTask(id = 5, title = "Cached")
        val cachedEntity = cachedTask.toEntity()
        coEvery { mockApi.getTask(5) } throws IOException("No network")
        coEvery { mockTaskDao.getTaskById(5) } returns cachedEntity

        val result = repository.getTask(5)

        assertTrue(result.isSuccess)
        assertEquals("Cached", result.getOrNull()?.title)
    }

    @Test
    fun `getTask with network error and no cache should return failure`() = runTest {
        coEvery { mockApi.getTask(5) } throws IOException("No network")
        coEvery { mockTaskDao.getTaskById(5) } returns null

        val result = repository.getTask(5)

        assertTrue(result.isFailure)
    }

    // --- createTask ---

    @Test
    fun `createTask should return created task on success`() = runTest {
        val request = TestData.createCreateTaskRequest(title = "New Task")
        val createdTask = TestData.createTask(id = 10, title = "New Task")
        coEvery { mockApi.createTask(request) } returns createdTask

        val result = repository.createTask(request)

        assertTrue(result.isSuccess)
        assertEquals(10, result.getOrNull()?.id)
        assertEquals("New Task", result.getOrNull()?.title)
    }

    @Test
    fun `createTask with network error should return failure`() = runTest {
        val request = TestData.createCreateTaskRequest()
        coEvery { mockApi.createTask(request) } throws IOException("No network")

        val result = repository.createTask(request)

        assertTrue(result.isFailure)
    }

    @Test
    fun `createTask with HTTP error should return failure`() = runTest {
        val request = TestData.createCreateTaskRequest()
        val httpException = mockk<HttpException> {
            every { code() } returns 400
            every { message() } returns "Bad Request"
        }
        coEvery { mockApi.createTask(request) } throws httpException

        val result = repository.createTask(request)

        assertTrue(result.isFailure)
    }

    // --- deleteTask ---

    @Test
    fun `deleteTask should return success`() = runTest {
        coEvery { mockApi.deleteTask(1) } returns Unit

        val result = repository.deleteTask(1)

        assertTrue(result.isSuccess)
    }

    @Test
    fun `deleteTask with network error should return failure`() = runTest {
        coEvery { mockApi.deleteTask(1) } throws IOException("No network")

        val result = repository.deleteTask(1)

        assertTrue(result.isFailure)
    }

    // --- applyForTask ---

    @Test
    fun `applyForTask should return application on success`() = runTest {
        val request = TestData.createApplyTaskRequest(message = "I can help!")
        val application = TestData.createTaskApplication(id = 1, taskId = 1)
        coEvery { mockApi.applyForTask(1, request) } returns application

        val result = repository.applyForTask(1, request)

        assertTrue(result.isSuccess)
        assertEquals(1L, result.getOrNull()?.id)
    }

    @Test
    fun `applyForTask with network error should return meaningful error`() = runTest {
        val request = TestData.createApplyTaskRequest()
        coEvery { mockApi.applyForTask(1, request) } throws IOException("No network")

        val result = repository.applyForTask(1, request)

        assertTrue(result.isFailure)
        assertEquals("Network error. Please check your connection.", result.exceptionOrNull()?.message)
    }

    // --- getTaskApplications ---

    @Test
    fun `getTaskApplications should return list on success`() = runTest {
        val applications = listOf(
            TestData.createTaskApplication(id = 1),
            TestData.createTaskApplication(id = 2)
        )
        coEvery { mockApi.getTaskApplications(1) } returns applications

        val result = repository.getTaskApplications(1)

        assertTrue(result.isSuccess)
        assertEquals(2, result.getOrNull()?.size)
    }

    @Test
    fun `getTaskApplications should return empty list when none exist`() = runTest {
        coEvery { mockApi.getTaskApplications(1) } returns emptyList()

        val result = repository.getTaskApplications(1)

        assertTrue(result.isSuccess)
        assertEquals(0, result.getOrNull()?.size)
    }

    // --- acceptApplication ---

    @Test
    fun `acceptApplication should return success response`() = runTest {
        val response = TestData.createAcceptApplicationResponse()
        coEvery { mockApi.acceptApplication(1) } returns response

        val result = repository.acceptApplication(1)

        assertTrue(result.isSuccess)
        assertEquals("Application accepted", result.getOrNull()?.message)
    }

    @Test
    fun `acceptApplication with network error should return failure`() = runTest {
        coEvery { mockApi.acceptApplication(1) } throws IOException("No network")

        val result = repository.acceptApplication(1)

        assertTrue(result.isFailure)
    }

    // --- completeTask ---

    @Test
    fun `completeTask should return completed task`() = runTest {
        val task = TestData.createTask(id = 1, status = TaskStatus.COMPLETED)
        coEvery { mockApi.completeTask(1) } returns task

        val result = repository.completeTask(1)

        assertTrue(result.isSuccess)
        assertEquals(TaskStatus.COMPLETED, result.getOrNull()?.status)
    }

    @Test
    fun `completeTask with network error should return failure`() = runTest {
        coEvery { mockApi.completeTask(1) } throws IOException("No network")

        val result = repository.completeTask(1)

        assertTrue(result.isFailure)
    }
}
