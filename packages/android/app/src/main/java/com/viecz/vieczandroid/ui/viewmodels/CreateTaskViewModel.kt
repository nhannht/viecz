package com.viecz.vieczandroid.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.models.CreateTaskRequest
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.data.repository.TaskRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CreateTaskUiState(
    val title: String = "",
    val description: String = "",
    val categoryId: Long? = null,
    val price: String = "",
    val location: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val createdTask: Task? = null,
    val titleError: String? = null,
    val descriptionError: String? = null,
    val categoryError: String? = null,
    val priceError: String? = null,
    val locationError: String? = null
)

class CreateTaskViewModel : ViewModel() {
    private val repository = TaskRepository()

    private val _uiState = MutableStateFlow(CreateTaskUiState())
    val uiState: StateFlow<CreateTaskUiState> = _uiState.asStateFlow()

    companion object {
        private const val TAG = "CreateTaskViewModel"
    }

    fun updateTitle(title: String) {
        _uiState.value = _uiState.value.copy(
            title = title,
            titleError = validateTitle(title)
        )
    }

    fun updateDescription(description: String) {
        _uiState.value = _uiState.value.copy(
            description = description,
            descriptionError = validateDescription(description)
        )
    }

    fun updateCategory(categoryId: Long) {
        _uiState.value = _uiState.value.copy(
            categoryId = categoryId,
            categoryError = null
        )
    }

    fun updatePrice(price: String) {
        _uiState.value = _uiState.value.copy(
            price = price,
            priceError = validatePrice(price)
        )
    }

    fun updateLocation(location: String) {
        _uiState.value = _uiState.value.copy(
            location = location,
            locationError = validateLocation(location)
        )
    }

    private fun validateTitle(title: String): String? {
        return when {
            title.isBlank() -> "Title is required"
            title.length < 5 -> "Title must be at least 5 characters"
            title.length > 200 -> "Title must be less than 200 characters"
            else -> null
        }
    }

    private fun validateDescription(description: String): String? {
        return when {
            description.isBlank() -> "Description is required"
            description.length < 10 -> "Description must be at least 10 characters"
            description.length > 2000 -> "Description must be less than 2000 characters"
            else -> null
        }
    }

    private fun validatePrice(price: String): String? {
        return when {
            price.isBlank() -> "Price is required"
            price.toLongOrNull() == null -> "Price must be a number"
            price.toLong() <= 0 -> "Price must be greater than 0"
            else -> null
        }
    }

    private fun validateLocation(location: String): String? {
        return when {
            location.isBlank() -> "Location is required"
            location.length < 3 -> "Location must be at least 3 characters"
            location.length > 255 -> "Location must be less than 255 characters"
            else -> null
        }
    }

    private fun validateForm(): Boolean {
        val titleError = validateTitle(_uiState.value.title)
        val descriptionError = validateDescription(_uiState.value.description)
        val categoryError = if (_uiState.value.categoryId == null) "Category is required" else null
        val priceError = validatePrice(_uiState.value.price)
        val locationError = validateLocation(_uiState.value.location)

        _uiState.value = _uiState.value.copy(
            titleError = titleError,
            descriptionError = descriptionError,
            categoryError = categoryError,
            priceError = priceError,
            locationError = locationError
        )

        return titleError == null && descriptionError == null &&
               categoryError == null && priceError == null && locationError == null
    }

    fun createTask() {
        if (!validateForm()) {
            Log.d(TAG, "Form validation failed")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val request = CreateTaskRequest(
                title = _uiState.value.title,
                description = _uiState.value.description,
                categoryId = _uiState.value.categoryId!!,
                price = _uiState.value.price.toLong(),
                location = _uiState.value.location
            )

            val result = repository.createTask(request)
            result.fold(
                onSuccess = { task ->
                    Log.d(TAG, "Task created successfully: ${task.id}")
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        createdTask = task,
                        error = null
                    )
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to create task", error)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to create task"
                    )
                }
            )
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun resetForm() {
        _uiState.value = CreateTaskUiState()
    }
}
