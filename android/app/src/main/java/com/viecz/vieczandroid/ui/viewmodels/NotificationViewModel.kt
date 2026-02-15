package com.viecz.vieczandroid.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.local.entities.NotificationEntity
import com.viecz.vieczandroid.data.repository.NotificationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotificationUiState(
    val notifications: List<NotificationEntity> = emptyList(),
    val unreadCount: Int = 0,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class NotificationViewModel @Inject constructor(
    private val repository: NotificationRepository,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(NotificationUiState())
    val uiState: StateFlow<NotificationUiState> = _uiState.asStateFlow()

    companion object {
        private const val TAG = "NotificationViewModel"
    }

    init {
        viewModelScope.launch {
            val userId = tokenManager.userId.first()
            if (userId != null) {
                // Collect local cache
                launch {
                    repository.getNotificationsFlow(userId).collect { list ->
                        _uiState.value = _uiState.value.copy(notifications = list)
                    }
                }
                launch {
                    repository.getUnreadCountFlow(userId).collect { count ->
                        _uiState.value = _uiState.value.copy(unreadCount = count)
                    }
                }
                // Fetch from server
                refresh()
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            repository.fetchNotifications().fold(
                onSuccess = {
                    Log.d(TAG, "Fetched ${it.size} notifications from server")
                    _uiState.value = _uiState.value.copy(isLoading = false)
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to fetch notifications", error)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message
                    )
                }
            )
        }
    }

    fun markAsRead(id: Long) {
        viewModelScope.launch {
            repository.markAsRead(id)
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            repository.markAllAsRead()
        }
    }

    fun clearAll() {
        viewModelScope.launch {
            repository.deleteAll()
        }
    }
}
