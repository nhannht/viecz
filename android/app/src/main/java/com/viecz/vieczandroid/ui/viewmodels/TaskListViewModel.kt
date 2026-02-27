package com.viecz.vieczandroid.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.api.NominatimResult
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.data.repository.GeocodingRepository
import com.viecz.vieczandroid.data.repository.TaskRepository
import org.maplibre.android.geometry.LatLng
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
    val locationStatusMessage: String? = null,
    val isMapView: Boolean = false,
    val selectedMapTaskId: Long? = null,
    // Map UX improvements
    val mapSearchCenter: LatLng? = null,
    val mapCameraMoved: Boolean = false,
    val mapSearchQuery: String = "",
    val geocodeSuggestions: List<NominatimResult> = emptyList(),
    val isGeocodingLoading: Boolean = false,
    val showMapSearchBar: Boolean = false
)

@OptIn(FlowPreview::class)
@HiltViewModel
class TaskListViewModel @Inject constructor(
    private val repository: TaskRepository,
    private val tokenManager: TokenManager,
    private val geocodingRepository: GeocodingRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TaskListUiState())
    val uiState: StateFlow<TaskListUiState> = _uiState.asStateFlow()

    private val _searchQueryText = MutableStateFlow("")
    val searchQueryText: StateFlow<String> = _searchQueryText.asStateFlow()

    private val _mapSearchQueryText = MutableStateFlow("")

    companion object {
        private const val TAG = "TaskListViewModel"
        private const val CAMERA_MOVE_THRESHOLD_METERS = 200.0
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

        // Debounced geocoding search (300ms)
        viewModelScope.launch {
            _mapSearchQueryText
                .drop(1)
                .debounce(300)
                .distinctUntilChanged()
                .collect { query ->
                    if (query.length >= 2) {
                        _uiState.value = _uiState.value.copy(isGeocodingLoading = true)
                        geocodingRepository.search(query).fold(
                            onSuccess = { results ->
                                _uiState.value = _uiState.value.copy(
                                    geocodeSuggestions = results.take(5),
                                    isGeocodingLoading = false
                                )
                            },
                            onFailure = {
                                _uiState.value = _uiState.value.copy(
                                    geocodeSuggestions = emptyList(),
                                    isGeocodingLoading = false
                                )
                            }
                        )
                    } else {
                        _uiState.value = _uiState.value.copy(
                            geocodeSuggestions = emptyList(),
                            isGeocodingLoading = false
                        )
                    }
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
            locationStatusMessage = "Location permission denied. Showing all tasks."
        )
        loadTasks(refresh = true)
    }

    fun onLocationUnavailable() {
        _uiState.value = _uiState.value.copy(
            nearMeEnabled = false,
            locationStatusMessage = "Unable to get current location. Showing all tasks."
        )
        loadTasks(refresh = true)
    }

    fun updateUserLocation(latitude: Double, longitude: Double) {
        _uiState.value = _uiState.value.copy(
            latitude = latitude,
            longitude = longitude
        )
    }

    fun showMapView() {
        _uiState.value = _uiState.value.copy(isMapView = true)
    }

    fun showListView() {
        _uiState.value = _uiState.value.copy(
            isMapView = false,
            selectedMapTaskId = null
        )
    }

    fun selectTaskOnMap(taskId: Long?) {
        _uiState.value = _uiState.value.copy(selectedMapTaskId = taskId)
    }

    fun clearLocationStatusMessage() {
        _uiState.value = _uiState.value.copy(locationStatusMessage = null)
    }

    // ── Map UX improvements ──

    fun searchArea(lat: Double, lng: Double, radiusMeters: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = repository.getTasks(
                page = 1,
                categoryId = _uiState.value.selectedCategoryId,
                search = _uiState.value.searchQuery,
                status = "open",
                lat = lat,
                lng = lng,
                radius = radiusMeters,
                sort = "distance"
            )

            result.fold(
                onSuccess = { response ->
                    Log.d(TAG, "Area search: ${response.data.size} tasks at ($lat, $lng) r=${radiusMeters}m")
                    _uiState.value = _uiState.value.copy(
                        tasks = response.data,
                        isLoading = false,
                        error = null,
                        currentPage = 1,
                        hasMore = response.data.size >= response.limit,
                        mapSearchCenter = LatLng(lat, lng),
                        mapCameraMoved = false
                    )
                },
                onFailure = { error ->
                    Log.e(TAG, "Area search failed", error)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to search area"
                    )
                }
            )
        }
    }

    fun onMapCameraMoved(currentCenter: LatLng) {
        val searchCenter = _uiState.value.mapSearchCenter
        if (searchCenter != null) {
            val distance = searchCenter.distanceTo(currentCenter)
            if (distance > CAMERA_MOVE_THRESHOLD_METERS && !_uiState.value.mapCameraMoved) {
                _uiState.value = _uiState.value.copy(mapCameraMoved = true)
            }
        } else {
            // No previous search center — first map interaction
            if (!_uiState.value.mapCameraMoved) {
                _uiState.value = _uiState.value.copy(mapCameraMoved = true)
            }
        }
    }

    fun updateMapSearchQuery(query: String) {
        _uiState.value = _uiState.value.copy(mapSearchQuery = query)
        _mapSearchQueryText.value = query
    }

    fun clearGeocodeSuggestions() {
        _uiState.value = _uiState.value.copy(
            geocodeSuggestions = emptyList(),
            mapSearchQuery = ""
        )
        _mapSearchQueryText.value = ""
    }

    fun toggleMapSearchBar() {
        val current = _uiState.value.showMapSearchBar
        _uiState.value = _uiState.value.copy(
            showMapSearchBar = !current,
            geocodeSuggestions = emptyList()
        )
        if (current) {
            // Closing — clear query
            _mapSearchQueryText.value = ""
            _uiState.value = _uiState.value.copy(mapSearchQuery = "")
        }
    }
}
