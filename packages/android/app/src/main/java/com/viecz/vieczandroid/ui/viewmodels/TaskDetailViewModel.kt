package com.viecz.vieczandroid.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.data.models.TaskApplication
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
    val acceptSuccess: Boolean = false
)

@HiltViewModel
class TaskDetailViewModel @Inject constructor(
    private val repository: TaskRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TaskDetailUiState())
    val uiState: StateFlow<TaskDetailUiState> = _uiState.asStateFlow()

    companion object {
        private const val TAG = "TaskDetailViewModel"
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
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = repository.acceptApplication(applicationId)
            result.fold(
                onSuccess = {
                    Log.d(TAG, "Application accepted successfully")
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        acceptSuccess = true,
                        error = null
                    )
                    // Reload task to get updated status
                    _uiState.value.task?.let { loadTask(it.id) }
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

    fun completeTask(taskId: Long) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = repository.completeTask(taskId)
            result.fold(
                onSuccess = { task ->
                    Log.d(TAG, "Task completed successfully")
                    _uiState.value = _uiState.value.copy(
                        task = task,
                        isLoading = false,
                        error = null
                    )
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to complete task", error)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to complete task"
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
}
