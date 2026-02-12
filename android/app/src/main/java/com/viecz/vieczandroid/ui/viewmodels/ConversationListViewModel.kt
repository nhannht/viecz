package com.viecz.vieczandroid.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.Conversation
import com.viecz.vieczandroid.data.repository.MessageRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ConversationListUiState(
    val conversations: List<Conversation> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentUserId: Long? = null
)

@HiltViewModel
class ConversationListViewModel @Inject constructor(
    private val messageRepository: MessageRepository,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(ConversationListUiState())
    val uiState: StateFlow<ConversationListUiState> = _uiState.asStateFlow()

    init {
        loadConversations()
    }

    fun loadConversations() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val userId = tokenManager.userId.first()
            _uiState.value = _uiState.value.copy(currentUserId = userId)

            messageRepository.getConversations()
                .onSuccess { conversations ->
                    _uiState.value = _uiState.value.copy(
                        conversations = conversations,
                        isLoading = false
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to load conversations"
                    )
                }
        }
    }

    fun refresh() {
        loadConversations()
    }
}
