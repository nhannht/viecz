package com.viecz.vieczandroid.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.data.models.TaskStatus
import com.viecz.vieczandroid.data.repository.TaskRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TaskListUiState(
    val tasks: List<Task> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentPage: Int = 1,
    val hasMore: Boolean = true,
    val selectedCategoryId: Long? = null,
    val searchQuery: String? = null
)

class TaskListViewModel : ViewModel() {
    private val repository = TaskRepository()

    private val _uiState = MutableStateFlow(TaskListUiState())
    val uiState: StateFlow<TaskListUiState> = _uiState.asStateFlow()

    companion object {
        private const val TAG = "TaskListViewModel"
    }

    init {
        loadTasks()
    }

    fun loadTasks(refresh: Boolean = false) {
        viewModelScope.launch {
            if (refresh) {
                _uiState.value = _uiState.value.copy(
                    currentPage = 1,
                    tasks = emptyList(),
                    hasMore = true
                )
            }

            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = repository.getTasks(
                page = _uiState.value.currentPage,
                categoryId = _uiState.value.selectedCategoryId,
                search = _uiState.value.searchQuery,
                status = "open"
            )

            result.fold(
                onSuccess = { response ->
                    Log.d(TAG, "Tasks loaded successfully: ${response.data.size} tasks")
                    val currentTasks = if (refresh) emptyList() else _uiState.value.tasks
                    _uiState.value = _uiState.value.copy(
                        tasks = currentTasks + response.data,
                        isLoading = false,
                        error = null,
                        hasMore = response.data.size >= response.limit
                    )
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to load tasks", error)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to load tasks"
                    )
                }
            )
        }
    }

    fun loadMore() {
        if (!_uiState.value.isLoading && _uiState.value.hasMore) {
            _uiState.value = _uiState.value.copy(currentPage = _uiState.value.currentPage + 1)
            loadTasks()
        }
    }

    fun filterByCategory(categoryId: Long?) {
        _uiState.value = _uiState.value.copy(selectedCategoryId = categoryId)
        loadTasks(refresh = true)
    }

    fun searchTasks(query: String?) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        loadTasks(refresh = true)
    }

    fun refresh() {
        loadTasks(refresh = true)
    }
}
