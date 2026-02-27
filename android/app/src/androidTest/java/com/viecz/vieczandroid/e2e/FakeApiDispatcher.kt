package com.viecz.vieczandroid.e2e

import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.RecordedRequest

/**
 * Mock API dispatcher that routes requests by path and method,
 * returning fake JSON responses matching the app's Moshi model annotations.
 */
class FakeApiDispatcher : Dispatcher() {

    override fun dispatch(request: RecordedRequest): MockResponse {
        val fullPath = request.path ?: return notFound()
        val method = request.method ?: return notFound()
        // Strip query parameters so endsWith checks work correctly
        val path = fullPath.split("?").first()

        return when {
            // Auth
            method == "POST" && path.endsWith("/auth/login") -> loginResponse()
            method == "POST" && path.endsWith("/auth/register") -> registerResponse()

            // Categories
            method == "GET" && path.endsWith("/categories") -> categoriesResponse()

            // Task applications (must be before task detail)
            method == "GET" && path.endsWith("/applications") -> applicationsResponse()

            // Tasks
            method == "POST" && path.endsWith("/tasks") -> createTaskResponse()
            method == "GET" && Regex(".*/tasks/\\d+$").matches(path) -> taskDetailResponse()
            method == "GET" && path.endsWith("/tasks") -> tasksListResponse()

            // Users
            method == "GET" && path.endsWith("/users/me") -> userMeResponse()

            // Wallet
            method == "GET" && path.endsWith("/wallet/transactions") -> walletTransactionsResponse()
            method == "GET" && path.endsWith("/wallet") -> walletResponse()

            else -> notFound()
        }
    }

    private fun loginResponse() = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody("""
            {
                "access_token": "fake-access-token-12345",
                "refresh_token": "fake-refresh-token-67890",
                "user": ${userJson()}
            }
        """.trimIndent())

    private fun registerResponse() = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody("""
            {
                "access_token": "fake-access-token-register",
                "refresh_token": "fake-refresh-token-register",
                "user": ${userJson()}
            }
        """.trimIndent())

    private fun categoriesResponse() = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody("""
            [
                {"id": 1, "name": "Delivery", "name_vi": "Giao hàng", "icon": null, "is_active": true},
                {"id": 2, "name": "Cleaning", "name_vi": "Dọn dẹp", "icon": null, "is_active": true},
                {"id": 3, "name": "Tutoring", "name_vi": "Gia sư", "icon": null, "is_active": true}
            ]
        """.trimIndent())

    private fun tasksListResponse() = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody("""
            {
                "data": [
                    ${taskJson(1, "Deliver package to campus", "Need someone to deliver a package from District 1 to HCMUS campus")},
                    ${taskJson(2, "Clean apartment before checkout", "Need help cleaning a studio apartment in District 3")},
                    ${taskJson(3, "Math tutoring for midterm", "Looking for a tutor to help with Calculus 2 exam prep")}
                ],
                "page": 1,
                "limit": 10,
                "total": 3
            }
        """.trimIndent())

    private fun taskDetailResponse() = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody(taskJson(1, "Deliver package to campus", "Need someone to deliver a package from District 1 to HCMUS campus"))

    private fun createTaskResponse() = MockResponse()
        .setResponseCode(201)
        .setHeader("Content-Type", "application/json")
        .setBody(taskJson(99, "My New Task", "This is a task I just created"))

    private fun applicationsResponse() = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody("[]")

    private fun userMeResponse() = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody(userJson())

    private fun walletResponse() = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody("""
            {
                "id": 1,
                "user_id": 1,
                "balance": 500000,
                "escrow_balance": 100000,
                "total_deposited": 1000000,
                "total_withdrawn": 200000,
                "total_earned": 300000,
                "total_spent": 150000,
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-15T00:00:00Z"
            }
        """.trimIndent())

    private fun walletTransactionsResponse() = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody("""
            [
                {
                    "id": 1,
                    "wallet_id": 1,
                    "transaction_id": null,
                    "task_id": null,
                    "type": "deposit",
                    "amount": 500000,
                    "balance_before": 0,
                    "balance_after": 500000,
                    "escrow_before": 0,
                    "escrow_after": 0,
                    "description": "Initial deposit",
                    "reference_user_id": null,
                    "created_at": "2025-01-01T00:00:00Z"
                },
                {
                    "id": 2,
                    "wallet_id": 1,
                    "transaction_id": 10,
                    "task_id": 1,
                    "type": "escrow_hold",
                    "amount": 100000,
                    "balance_before": 500000,
                    "balance_after": 400000,
                    "escrow_before": 0,
                    "escrow_after": 100000,
                    "description": "Escrow for task: Deliver package",
                    "reference_user_id": 2,
                    "created_at": "2025-01-05T00:00:00Z"
                }
            ]
        """.trimIndent())

    private fun notFound() = MockResponse()
        .setResponseCode(404)
        .setHeader("Content-Type", "application/json")
        .setBody("""{"error": "Not found"}""")

    private fun userJson() = """
        {
            "id": 1,
            "email": "test@example.com",
            "name": "Test User",
            "avatar_url": null,
            "phone": "0123456789",
            "university": "HCMUS",
            "student_id": "21127001",
            "is_verified": true,
            "rating": 4.5,
            "total_tasks_completed": 10,
            "total_tasks_posted": 5,
            "total_earnings": 300000,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-15T00:00:00Z"
        }
    """.trimIndent()

    private fun taskJson(id: Long, title: String, description: String) = """
        {
            "id": $id,
            "requester_id": 1,
            "tasker_id": null,
            "category_id": 1,
            "title": "$title",
            "description": "$description",
            "price": 50000,
            "location": "HCMUS Campus",
            "latitude": null,
            "longitude": null,
            "status": "open",
            "created_at": "2025-01-10T00:00:00Z",
            "updated_at": "2025-01-10T00:00:00Z",
            "user_has_applied": false
        }
    """.trimIndent()
}
