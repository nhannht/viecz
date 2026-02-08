package com.viecz.vieczandroid.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.viecz.vieczandroid.data.models.*
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

class PaymentApiTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var paymentApi: PaymentApi

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        paymentApi = Retrofit.Builder()
            .baseUrl(mockWebServer.url("/api/v1/"))
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(PaymentApi::class.java)
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun `createPayment sends POST to payment_create`() = runTest {
        val responseJson = """
            {
                "orderCode": 123456789,
                "checkoutUrl": "https://pay.payos.vn/checkout/123",
                "qrCode": "https://pay.payos.vn/qr/123"
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = paymentApi.createPayment(
            PaymentRequest(amount = 100000, description = "Task payment")
        )

        assertEquals(123456789L, result.orderCode)
        assertEquals("https://pay.payos.vn/checkout/123", result.checkoutUrl)
        assertEquals("https://pay.payos.vn/qr/123", result.qrCode)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/payment/create", request.path)
        val body = request.body.readUtf8()
        assert(body.contains("\"amount\":100000"))
        assert(body.contains("\"description\":\"Task payment\""))
    }

    @Test
    fun `createEscrowPayment sends POST to payments_escrow`() = runTest {
        val responseJson = """
            {
                "transaction": {
                    "id": 1,
                    "task_id": 5,
                    "payer_id": 1,
                    "payee_id": 2,
                    "amount": 200000,
                    "platform_fee": 10000,
                    "net_amount": 190000,
                    "type": "escrow",
                    "status": "pending",
                    "description": "Escrow for task #5",
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                },
                "checkout_url": "https://pay.payos.vn/checkout/456"
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = paymentApi.createEscrowPayment(
            CreateEscrowPaymentRequest(taskId = 5)
        )

        assertEquals(1L, result.transaction.id)
        assertEquals(TransactionType.ESCROW, result.transaction.type)
        assertEquals("https://pay.payos.vn/checkout/456", result.checkoutUrl)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/payments/escrow", request.path)
        val body = request.body.readUtf8()
        assert(body.contains("\"task_id\":5"))
    }

    @Test
    fun `releasePayment sends POST to payments_release`() = runTest {
        val responseJson = """{"message": "Payment released successfully"}"""

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = paymentApi.releasePayment(
            ReleasePaymentRequest(taskId = 5)
        )

        assertEquals("Payment released successfully", result.message)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/payments/release", request.path)
        val body = request.body.readUtf8()
        assert(body.contains("\"task_id\":5"))
    }

    @Test
    fun `refundPayment sends POST to payments_refund`() = runTest {
        val responseJson = """{"message": "Payment refunded successfully"}"""

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = paymentApi.refundPayment(
            RefundPaymentRequest(taskId = 5, reason = "Task cancelled by poster")
        )

        assertEquals("Payment refunded successfully", result.message)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/payments/refund", request.path)
        val body = request.body.readUtf8()
        assert(body.contains("\"task_id\":5"))
        assert(body.contains("\"reason\":\"Task cancelled by poster\""))
    }

    @Test
    fun `getTransactionsByTask sends GET to tasks_taskId_transactions`() = runTest {
        val responseJson = """
            [
                {
                    "id": 1,
                    "task_id": 5,
                    "payer_id": 1,
                    "payee_id": 2,
                    "amount": 200000,
                    "platform_fee": 10000,
                    "net_amount": 190000,
                    "type": "escrow",
                    "status": "success",
                    "description": "Escrow payment",
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                },
                {
                    "id": 2,
                    "task_id": 5,
                    "payer_id": 1,
                    "payee_id": 2,
                    "amount": 190000,
                    "platform_fee": 0,
                    "net_amount": 190000,
                    "type": "release",
                    "status": "success",
                    "description": "Release payment",
                    "created_at": "2024-01-02T00:00:00Z",
                    "updated_at": "2024-01-02T00:00:00Z"
                }
            ]
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = paymentApi.getTransactionsByTask(5)

        assertEquals(2, result.size)
        assertEquals(TransactionType.ESCROW, result[0].type)
        assertEquals(TransactionType.RELEASE, result[1].type)
        assertEquals(TransactionStatus.SUCCESS, result[0].status)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assertEquals("/api/v1/tasks/5/transactions", request.path)
    }

    @Test
    fun `createEscrowPayment with insufficient balance returns 400`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(400)
                .setBody("""{"error":"Insufficient balance"}""")
        )

        assertFailsWith<HttpException> {
            paymentApi.createEscrowPayment(CreateEscrowPaymentRequest(taskId = 5))
        }.also { exception ->
            assertEquals(400, exception.code())
        }
    }

    @Test
    fun `getTransactionsByTask with empty list returns empty`() = runTest {
        mockWebServer.enqueue(MockResponse().setBody("[]"))

        val result = paymentApi.getTransactionsByTask(99)

        assertEquals(0, result.size)
    }
}
