package com.viecz.vieczandroid.ui.screens

import com.viecz.vieczandroid.ui.components.formatPrice
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.models.ApplyTaskRequest
import com.viecz.vieczandroid.data.repository.NotificationRepository
import com.viecz.vieczandroid.data.repository.TaskRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ApplyTaskUiState(
    val proposedPrice: String = "",
    val message: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false,
    val priceError: String? = null,
    val messageError: String? = null
)

@HiltViewModel
class ApplyTaskViewModel @Inject constructor(
    private val repository: TaskRepository,
    private val notificationRepository: NotificationRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ApplyTaskUiState())
    val uiState: StateFlow<ApplyTaskUiState> = _uiState.asStateFlow()

    fun updateProposedPrice(price: String) {
        _uiState.value = _uiState.value.copy(
            proposedPrice = price,
            priceError = validatePrice(price)
        )
    }

    fun updateMessage(message: String) {
        _uiState.value = _uiState.value.copy(
            message = message,
            messageError = validateMessage(message)
        )
    }

    private fun validatePrice(price: String): String? {
        if (price.isBlank()) return null // Optional field
        return when {
            price.toLongOrNull() == null -> "Price must be a number"
            price.toLong() <= 0 -> "Price must be greater than 0"
            else -> null
        }
    }

    private fun validateMessage(message: String): String? {
        return when {
            message.length > 500 -> "Message must be less than 500 characters"
            else -> null
        }
    }

    fun applyForTask(taskId: Long, taskTitle: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val request = ApplyTaskRequest(
                proposedPrice = _uiState.value.proposedPrice.toLongOrNull(),
                message = _uiState.value.message.ifBlank { "" }
            )

            val result = repository.applyForTask(taskId, request)
            result.fold(
                onSuccess = {
                    val title = taskTitle ?: "task #$taskId"
                    notificationRepository.addNotification(
                        type = "APPLICATION_SENT",
                        title = "Application Sent",
                        message = "You applied for '$title'",
                        taskId = taskId
                    )
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        success = true,
                        error = null
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to apply for task"
                    )
                }
            )
        }
    }

    fun reset() {
        _uiState.value = ApplyTaskUiState()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApplyTaskScreen(
    taskId: Long,
    originalPrice: Long,
    onNavigateBack: () -> Unit,
    viewModel: ApplyTaskViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.success) {
        if (uiState.success) {
            onNavigateBack()
            viewModel.reset()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Apply for Task") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Info card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Text(
                        text = "Original Price",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = formatPrice(originalPrice),
                        style = MaterialTheme.typography.headlineSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Text(
                text = "Submit your application",
                style = MaterialTheme.typography.titleMedium
            )

            // Proposed price field (optional)
            OutlinedTextField(
                value = uiState.proposedPrice,
                onValueChange = { viewModel.updateProposedPrice(it) },
                label = { Text("Proposed Price (Optional)") },
                modifier = Modifier.fillMaxWidth(),
                isError = uiState.priceError != null,
                supportingText = {
                    uiState.priceError?.let { Text(it) }
                        ?: Text("Leave empty to accept the original price")
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                prefix = { Text("₫ ") }
            )

            // Message field
            OutlinedTextField(
                value = uiState.message,
                onValueChange = { viewModel.updateMessage(it) },
                label = { Text("Message (Optional)") },
                modifier = Modifier.fillMaxWidth(),
                isError = uiState.messageError != null,
                supportingText = {
                    uiState.messageError?.let { Text(it) }
                        ?: Text("Tell the requester why you're the right person for this task")
                },
                minLines = 4,
                maxLines = 8
            )

            // Error message
            uiState.error?.let { error ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        text = error,
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Submit button
            Button(
                onClick = { viewModel.applyForTask(taskId) },
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isLoading && uiState.priceError == null && uiState.messageError == null
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Submit Application")
                }
            }
        }
    }
}
