package com.viecz.vieczandroid.testutil

import com.viecz.vieczandroid.data.models.*

/**
 * Test data builders for creating mock objects in tests.
 * Provides sensible defaults while allowing customization.
 */
object TestData {

    fun createUser(
        id: Long = 1,
        email: String = "test@example.com",
        name: String = "Test User",
        avatarUrl: String? = null,
        phone: String? = null,
        university: String = "Test University",
        studentId: String? = null,
        isVerified: Boolean = false,
        rating: Double = 0.0,
        totalTasksCompleted: Int = 0,
        totalTasksPosted: Int = 0,
        totalEarnings: Long = 0L,
        isTasker: Boolean = false,
        taskerBio: String? = null,
        createdAt: String = "2024-01-01T00:00:00Z",
        updatedAt: String = "2024-01-01T00:00:00Z"
    ) = User(
        id = id,
        email = email,
        name = name,
        avatarUrl = avatarUrl,
        phone = phone,
        university = university,
        studentId = studentId,
        isVerified = isVerified,
        rating = rating,
        totalTasksCompleted = totalTasksCompleted,
        totalTasksPosted = totalTasksPosted,
        totalEarnings = totalEarnings,
        isTasker = isTasker,
        taskerBio = taskerBio,
        createdAt = createdAt,
        updatedAt = updatedAt
    )

    fun createTask(
        id: Long = 1,
        requesterId: Long = 1,
        taskerId: Long? = null,
        categoryId: Long = 1,
        title: String = "Test Task",
        description: String = "Test description",
        price: Long = 100000L,
        location: String = "Test Location",
        latitude: Double? = null,
        longitude: Double? = null,
        status: TaskStatus = TaskStatus.OPEN,
        createdAt: String = "2024-01-01T00:00:00Z",
        updatedAt: String = "2024-01-01T00:00:00Z",
        userHasApplied: Boolean = false
    ) = Task(
        id = id,
        requesterId = requesterId,
        taskerId = taskerId,
        categoryId = categoryId,
        title = title,
        description = description,
        price = price,
        location = location,
        latitude = latitude,
        longitude = longitude,
        status = status,
        createdAt = createdAt,
        updatedAt = updatedAt,
        userHasApplied = userHasApplied
    )

    fun createCategory(
        id: Int = 1,
        name: String = "Test Category",
        nameVi: String = "Danh mục test",
        icon: String? = null,
        isActive: Boolean = true
    ) = Category(
        id = id,
        name = name,
        nameVi = nameVi,
        icon = icon,
        isActive = isActive
    )

    fun createTasksResponse(
        data: List<Task> = listOf(createTask()),
        page: Int = 1,
        limit: Int = 20,
        total: Int = 1
    ) = TasksResponse(
        data = data,
        page = page,
        limit = limit,
        total = total
    )

    fun createCategoriesResponse(
        categories: List<Category> = listOf(createCategory())
    ) = CategoriesResponse(
        categories = categories
    )

    fun createCreateTaskRequest(
        title: String = "Test Task",
        description: String = "Test description",
        categoryId: Long = 1,
        price: Long = 100000L,
        location: String = "Test Location",
        latitude: Double? = null,
        longitude: Double? = null
    ) = CreateTaskRequest(
        title = title,
        description = description,
        categoryId = categoryId,
        price = price,
        location = location,
        latitude = latitude,
        longitude = longitude
    )

    fun createTaskApplication(
        id: Long = 1,
        taskId: Long = 1,
        taskerId: Long = 2,
        proposedPrice: Long? = null,
        message: String? = null,
        status: ApplicationStatus = ApplicationStatus.PENDING,
        createdAt: String = "2024-01-01T00:00:00Z",
        updatedAt: String = "2024-01-01T00:00:00Z"
    ) = TaskApplication(
        id = id,
        taskId = taskId,
        taskerId = taskerId,
        proposedPrice = proposedPrice,
        message = message,
        status = status,
        createdAt = createdAt,
        updatedAt = updatedAt
    )

    fun createApplyTaskRequest(
        proposedPrice: Long? = null,
        message: String? = null
    ) = ApplyTaskRequest(
        proposedPrice = proposedPrice,
        message = message
    )

    fun createAcceptApplicationResponse(
        message: String = "Application accepted"
    ) = AcceptApplicationResponse(
        message = message
    )

    fun createWallet(
        id: Long = 1,
        userId: Long = 1,
        balance: Long = 500000L,
        escrowBalance: Long = 0L,
        totalDeposited: Long = 1000000L,
        totalWithdrawn: Long = 0L,
        totalEarned: Long = 0L,
        totalSpent: Long = 500000L,
        createdAt: String = "2024-01-01T00:00:00Z",
        updatedAt: String = "2024-01-01T00:00:00Z"
    ) = Wallet(
        id = id,
        userId = userId,
        balance = balance,
        escrowBalance = escrowBalance,
        totalDeposited = totalDeposited,
        totalWithdrawn = totalWithdrawn,
        totalEarned = totalEarned,
        totalSpent = totalSpent,
        createdAt = createdAt,
        updatedAt = updatedAt
    )

    fun createWalletTransaction(
        id: Long = 1,
        walletId: Long = 1,
        transactionId: Long? = null,
        taskId: Long? = null,
        type: WalletTransactionType = WalletTransactionType.DEPOSIT,
        amount: Long = 100000L,
        balanceBefore: Long = 0L,
        balanceAfter: Long = 100000L,
        escrowBefore: Long = 0L,
        escrowAfter: Long = 0L,
        description: String = "Test transaction",
        referenceUserId: Long? = null,
        createdAt: String = "2024-01-01T00:00:00Z"
    ) = WalletTransaction(
        id = id,
        walletId = walletId,
        transactionId = transactionId,
        taskId = taskId,
        type = type,
        amount = amount,
        balanceBefore = balanceBefore,
        balanceAfter = balanceAfter,
        escrowBefore = escrowBefore,
        escrowAfter = escrowAfter,
        description = description,
        referenceUserId = referenceUserId,
        createdAt = createdAt
    )

    fun createPaymentResponse(
        orderCode: Long = 12345L,
        checkoutUrl: String = "https://example.com/checkout",
        qrCode: String = "https://example.com/qr"
    ) = PaymentResponse(
        orderCode = orderCode,
        checkoutUrl = checkoutUrl,
        qrCode = qrCode
    )

    fun createTransaction(
        id: Long = 1,
        taskId: Long? = 1,
        payerId: Long = 1,
        payeeId: Long? = 2,
        amount: Long = 100000L,
        platformFee: Long = 5000L,
        netAmount: Long = 95000L,
        type: TransactionType = TransactionType.ESCROW,
        status: TransactionStatus = TransactionStatus.PENDING,
        payosOrderCode: Long? = null,
        payosPaymentId: String? = null,
        description: String = "Test transaction",
        failureReason: String? = null,
        completedAt: String? = null,
        createdAt: String = "2024-01-01T00:00:00Z",
        updatedAt: String = "2024-01-01T00:00:00Z"
    ) = Transaction(
        id = id,
        taskId = taskId,
        payerId = payerId,
        payeeId = payeeId,
        amount = amount,
        platformFee = platformFee,
        netAmount = netAmount,
        type = type,
        status = status,
        payosOrderCode = payosOrderCode,
        payosPaymentId = payosPaymentId,
        description = description,
        failureReason = failureReason,
        completedAt = completedAt,
        createdAt = createdAt,
        updatedAt = updatedAt
    )

    fun createConversation(
        id: Long = 1,
        createdAt: String = "2024-01-01T00:00:00Z",
        updatedAt: String = "2024-01-01T00:00:00Z",
        taskId: Long = 1,
        posterId: Long = 1,
        taskerId: Long = 2,
        lastMessageAt: String? = null,
        lastMessage: String? = null,
        task: Task? = null,
        poster: User? = null,
        tasker: User? = null
    ) = Conversation(
        id = id,
        createdAt = createdAt,
        updatedAt = updatedAt,
        taskId = taskId,
        posterId = posterId,
        taskerId = taskerId,
        lastMessageAt = lastMessageAt,
        lastMessage = lastMessage,
        task = task,
        poster = poster,
        tasker = tasker
    )

    fun createMessage(
        id: Long = 1,
        createdAt: String = "2024-01-01T00:00:00Z",
        conversationId: Long = 1,
        senderId: Long = 1,
        content: String = "Test message",
        isRead: Boolean = false,
        readAt: String? = null,
        sender: User? = null
    ) = Message(
        id = id,
        createdAt = createdAt,
        conversationId = conversationId,
        senderId = senderId,
        content = content,
        isRead = isRead,
        readAt = readAt,
        sender = sender
    )

    fun createMessageResponse(
        message: String = "Success"
    ) = MessageResponse(
        message = message
    )
}
