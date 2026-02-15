package com.viecz.vieczandroid.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.data.models.TaskApplication
import com.viecz.vieczandroid.data.repository.MessageRepository
import com.viecz.vieczandroid.data.repository.PaymentRepository
import com.viecz.vieczandroid.data.repository.TaskRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TaskDetailUiState(
    val task: Task? = null,
    val applications: List<TaskApplication> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val acceptSuccess: Boolean = false,
    val paymentCheckoutUrl: String? = null,
    val paymentSuccess: Boolean = false,
    val paymentError: String? = null,
    val conversationId: Long? = null
)

@HiltViewModel
class TaskDetailViewModel @Inject constructor(
    private val repository: TaskRepository,
    private val paymentRepository: PaymentRepository,
    private val messageRepository: MessageRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TaskDetailUiState())
    val uiState: StateFlow<TaskDetailUiState> = _uiState.asStateFlow()

    companion object {
        private const val TAG = "TaskDetailViewModel"
    }

    /**
     * Get or create conversation for the task
     * Returns conversation ID for navigation
     */
    fun getOrCreateConversation(): Long? {
        val task = _uiState.value.task ?: return null
        val acceptedApp = _uiState.value.applications.firstOrNull {
            it.status == com.viecz.vieczandroid.data.models.ApplicationStatus.ACCEPTED
        } ?: return null

        // If we already have a conversation ID, return it
        _uiState.value.conversationId?.let { return it }

        // Otherwise, create conversation
        viewModelScope.launch {
            messageRepository.createConversation(task.id, acceptedApp.taskerId).fold(
                onSuccess = { conversation ->
                    Log.d(TAG, "Conversation created/retrieved: ${conversation.id}")
                    _uiState.value = _uiState.value.copy(conversationId = conversation.id)
                },
                onFailure = { error ->
                    Log.e(TAG, "Error creating conversation: ${error.message}", error)
                    _uiState.value = _uiState.value.copy(error = error.message)
                }
            )
        }

        return null // Will be available after async call completes
    }

    fun loadTask(taskId: Long) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = repository.getTask(taskId)
            result.fold(
                onSuccess = { task ->
                    Log.d(TAG, "Task loaded successfully: ${task.title}")
                    _uiState.value = _uiState.value.copy(
                        task = task,
                        isLoading = false,
                        error = null
                    )
                    // If user is the requester, load applications
                    loadApplications(taskId)
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to load task", error)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to load task"
                    )
                }
            )
        }
    }

    private fun loadApplications(taskId: Long) {
        viewModelScope.launch {
            val result = repository.getTaskApplications(taskId)
            result.fold(
                onSuccess = { applications ->
                    Log.d(TAG, "Applications loaded: ${applications.size}")
                    _uiState.value = _uiState.value.copy(applications = applications)
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to load applications", error)
                    // Don't show error for applications, just log it
                }
            )
        }
    }

    fun acceptApplication(applicationId: Long) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, paymentError = null)

            // Step 1: Accept the application
            val acceptResult = repository.acceptApplication(applicationId)
            acceptResult.fold(
                onSuccess = {
                    Log.d(TAG, "Application accepted successfully")
                    val taskId = _uiState.value.task?.id

                    // Step 2: Create escrow payment
                    if (taskId != null) {
                        createEscrowPayment(taskId)
                    } else {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = "Task ID not found"
                        )
                    }
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to accept application", error)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to accept application"
                    )
                }
            )
        }
    }

    private suspend fun createEscrowPayment(taskId: Long) {
        Log.d(TAG, "Creating escrow payment for task: $taskId")

        val paymentResult = paymentRepository.createEscrowPayment(taskId)
        paymentResult.fold(
            onSuccess = { response ->
                Log.d(TAG, "Escrow payment created successfully")

                if (response.checkoutUrl != null) {
                    // Real PayOS mode - need to open checkout URL
                    Log.d(TAG, "PayOS checkout URL: ${response.checkoutUrl}")
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        acceptSuccess = true,
                        paymentCheckoutUrl = response.checkoutUrl,
                        error = null
                    )
                } else {
                    // Mock wallet mode - payment already deducted
                    Log.d(TAG, "Mock wallet payment successful")
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        acceptSuccess = true,
                        paymentSuccess = true,
                        error = null
                    )
                    // Reload task to get updated status
                    loadTask(taskId)
                }
            },
            onFailure = { error ->
                Log.e(TAG, "Failed to create escrow payment", error)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    paymentError = error.message ?: "Failed to create payment"
                )
            }
        )
    }

    fun completeTask(taskId: Long) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, paymentError = null)

            // Step 1: Release payment to tasker
            Log.d(TAG, "Releasing payment for task: $taskId")
            val paymentResult = paymentRepository.releasePayment(taskId)

            paymentResult.fold(
                onSuccess = { message ->
                    Log.d(TAG, "Payment released successfully: $message")

                    // Step 2: Mark task as complete
                    val completeResult = repository.completeTask(taskId)
                    completeResult.fold(
                        onSuccess = {
                            Log.d(TAG, "Task completed successfully")
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                paymentSuccess = true,
                                error = null
                            )
                            // Reload task to get updated status
                            loadTask(taskId)
                        },
                        onFailure = { error ->
                            Log.e(TAG, "Failed to complete task", error)
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                error = error.message ?: "Payment released but failed to mark task complete"
                            )
                        }
                    )
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to release payment", error)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        paymentError = error.message ?: "Failed to release payment"
                    )
                }
            )
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun clearAcceptSuccess() {
        _uiState.value = _uiState.value.copy(acceptSuccess = false)
    }

    fun clearPaymentCheckoutUrl() {
        _uiState.value = _uiState.value.copy(paymentCheckoutUrl = null)
    }

    fun clearPaymentSuccess() {
        _uiState.value = _uiState.value.copy(paymentSuccess = false)
    }

    fun clearPaymentError() {
        _uiState.value = _uiState.value.copy(paymentError = null)
    }
}
