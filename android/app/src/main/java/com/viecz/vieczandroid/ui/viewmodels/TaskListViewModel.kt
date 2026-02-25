package com.viecz.vieczandroid.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.data.repository.TaskRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TaskListUiState(
    val tasks: List<Task> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentPage: Int = 1,
    val hasMore: Boolean = true,
    val selectedCategoryId: Long? = null,
    val searchQuery: String? = null,
    val currentUserId: Long? = null,
    val nearMeEnabled: Boolean = false,
    val selectedRadiusMeters: Int? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val locationStatusMessage: String? = null
)

@OptIn(FlowPreview::class)
@HiltViewModel
class TaskListViewModel @Inject constructor(
    private val repository: TaskRepository,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(TaskListUiState())
    val uiState: StateFlow<TaskListUiState> = _uiState.asStateFlow()

    private val _searchQueryText = MutableStateFlow("")
    val searchQueryText: StateFlow<String> = _searchQueryText.asStateFlow()

    companion object {
        private const val TAG = "TaskListViewModel"
    }

    init {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                currentUserId = tokenManager.userId.firstOrNull()
            )
        }
        loadTasks()

        // Debounced auto-search: fires 1 second after user stops typing
        viewModelScope.launch {
            _searchQueryText
                .drop(1) // Skip initial empty value to avoid duplicate load
                .debounce(1000)
                .distinctUntilChanged()
                .collect { query ->
                    val searchValue = query.ifBlank { null }
                    _uiState.value = _uiState.value.copy(searchQuery = searchValue)
                    loadTasks(refresh = true)
                }
        }
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

            val currentState = _uiState.value
            val canUseGeoSearch = currentState.nearMeEnabled &&
                currentState.latitude != null &&
                currentState.longitude != null

            val result = repository.getTasks(
                page = currentState.currentPage,
                categoryId = currentState.selectedCategoryId,
                search = currentState.searchQuery,
                status = "open",
                lat = if (canUseGeoSearch) currentState.latitude else null,
                lng = if (canUseGeoSearch) currentState.longitude else null,
                radius = if (canUseGeoSearch) currentState.selectedRadiusMeters else null,
                sort = if (canUseGeoSearch) "distance" else null
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

    fun updateSearchQuery(query: String) {
        _searchQueryText.value = query
    }

    fun clearSearch() {
        _searchQueryText.value = ""
    }

    fun refresh() {
        loadTasks(refresh = true)
    }

    fun enableNearMe(latitude: Double, longitude: Double) {
        _uiState.value = _uiState.value.copy(
            nearMeEnabled = true,
            latitude = latitude,
            longitude = longitude,
            locationStatusMessage = null
        )
        loadTasks(refresh = true)
    }

    fun disableNearMe() {
        _uiState.value = _uiState.value.copy(
            nearMeEnabled = false,
            latitude = null,
            longitude = null,
            locationStatusMessage = null
        )
        loadTasks(refresh = true)
    }

    fun updateNearMeRadius(radiusMeters: Int?) {
        _uiState.value = _uiState.value.copy(selectedRadiusMeters = radiusMeters)
        if (_uiState.value.nearMeEnabled) {
            loadTasks(refresh = true)
        }
    }

    fun onLocationPermissionDenied() {
        _uiState.value = _uiState.value.copy(
            nearMeEnabled = false,
            latitude = null,
            longitude = null,
            locationStatusMessage = "Location permission denied. Showing all tasks."
        )
        loadTasks(refresh = true)
    }

    fun onLocationUnavailable() {
        _uiState.value = _uiState.value.copy(
            nearMeEnabled = false,
            latitude = null,
            longitude = null,
            locationStatusMessage = "Unable to get current location. Showing all tasks."
        )
        loadTasks(refresh = true)
    }

    fun clearLocationStatusMessage() {
        _uiState.value = _uiState.value.copy(locationStatusMessage = null)
    }
}
