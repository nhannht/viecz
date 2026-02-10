package com.viecz.vieczandroid.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.local.entities.NotificationEntity
import com.viecz.vieczandroid.data.repository.NotificationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotificationUiState(
    val notifications: List<NotificationEntity> = emptyList(),
    val unreadCount: Int = 0
)

@HiltViewModel
class NotificationViewModel @Inject constructor(
    private val repository: NotificationRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(NotificationUiState())
    val uiState: StateFlow<NotificationUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            repository.notifications.collect { list ->
                _uiState.value = _uiState.value.copy(notifications = list)
            }
        }
        viewModelScope.launch {
            repository.unreadCount.collect { count ->
                _uiState.value = _uiState.value.copy(unreadCount = count)
            }
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
