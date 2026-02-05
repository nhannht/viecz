package com.viecz.vieczandroid.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.models.Category
import com.viecz.vieczandroid.data.repository.CategoryRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CategoryUiState(
    val categories: List<Category> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

class CategoryViewModel : ViewModel() {
    private val repository = CategoryRepository()

    private val _uiState = MutableStateFlow(CategoryUiState())
    val uiState: StateFlow<CategoryUiState> = _uiState.asStateFlow()

    companion object {
        private const val TAG = "CategoryViewModel"
    }

    init {
        loadCategories()
    }

    fun loadCategories() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = repository.getCategories()
            result.fold(
                onSuccess = { categories ->
                    Log.d(TAG, "Categories loaded successfully: ${categories.size} categories")
                    _uiState.value = _uiState.value.copy(
                        categories = categories,
                        isLoading = false,
                        error = null
                    )
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to load categories", error)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to load categories"
                    )
                }
            )
        }
    }
}
