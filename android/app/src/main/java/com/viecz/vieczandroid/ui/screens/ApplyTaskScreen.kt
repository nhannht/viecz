package com.viecz.vieczandroid.ui.screens

import com.viecz.vieczandroid.R
import com.viecz.vieczandroid.ui.components.formatPrice
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.api.ProfileIncompleteException
import com.viecz.vieczandroid.data.api.UpdateProfileRequest
import com.viecz.vieczandroid.data.models.ApplyTaskRequest
import com.viecz.vieczandroid.data.repository.TaskRepository
import com.viecz.vieczandroid.data.repository.UserRepository
import com.viecz.vieczandroid.ui.components.metro.MetroButton
import com.viecz.vieczandroid.ui.components.metro.MetroCard
import com.viecz.vieczandroid.ui.components.metro.MetroInput
import com.viecz.vieczandroid.ui.components.metro.MetroTextarea
import com.viecz.vieczandroid.ui.components.metro.ProfileCompletionBottomSheet
import com.viecz.vieczandroid.ui.components.metro.ProfileGateRequest
import com.viecz.vieczandroid.ui.theme.MetroTheme
import android.content.Context
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
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
    val messageError: String? = null,
    val profileGate: ProfileGateRequest? = null,
    val profileSaving: Boolean = false,
)

@HiltViewModel
class ApplyTaskViewModel @Inject constructor(
    private val repository: TaskRepository,
    private val userRepository: UserRepository,
    @ApplicationContext private val context: Context
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
            price.toLongOrNull() == null -> context.getString(R.string.apply_task_price_error)
            price.toLong() <= 0 -> context.getString(R.string.apply_task_price_positive)
            else -> null
        }
    }

    private fun validateMessage(message: String): String? {
        return when {
            message.length > 500 -> context.getString(R.string.apply_task_message_too_long)
            else -> null
        }
    }

    fun applyForTask(taskId: Long) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val request = ApplyTaskRequest(
                proposedPrice = _uiState.value.proposedPrice.toLongOrNull(),
                message = _uiState.value.message.ifBlank { "" }
            )

            val result = repository.applyForTask(taskId, request)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        success = true,
                        error = null
                    )
                },
                onFailure = { error ->
                    if (error is ProfileIncompleteException) {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            profileGate = ProfileGateRequest(
                                missingFields = error.missingFields,
                                action = error.action,
                                message = error.message ?: "",
                            ),
                        )
                    } else {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = error.message ?: context.getString(R.string.apply_task_failed)
                        )
                    }
                }
            )
        }
    }

    fun reset() {
        _uiState.value = ApplyTaskUiState()
    }

    /** Updates the user's profile and retries the task application. */
    fun completeProfileAndRetry(taskId: Long, name: String?, bio: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(profileSaving = true)
            val request = UpdateProfileRequest(name = name, bio = bio)
            userRepository.updateProfile(request).fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(profileGate = null, profileSaving = false)
                    applyForTask(taskId)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        profileSaving = false,
                        error = error.message ?: "Failed to update profile",
                    )
                }
            )
        }
    }

    fun dismissProfileGate() {
        _uiState.value = _uiState.value.copy(profileGate = null)
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
    val colors = MetroTheme.colors
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
                title = { Text(stringResource(R.string.apply_task_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.apply_task_back))
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
            MetroCard(
                contentPadding = PaddingValues(16.dp),
                featured = true,
            ) {
                Text(
                    text = stringResource(R.string.apply_task_original_price),
                    style = MaterialTheme.typography.labelMedium,
                    color = colors.muted
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = formatPrice(originalPrice),
                    style = MaterialTheme.typography.headlineSmall,
                    color = colors.fg
                )
            }

            Text(
                text = stringResource(R.string.apply_task_subtitle),
                style = MaterialTheme.typography.titleMedium,
                color = colors.fg
            )

            // Proposed price field (optional)
            MetroInput(
                value = uiState.proposedPrice,
                onValueChange = { viewModel.updateProposedPrice(it) },
                label = stringResource(R.string.apply_task_price_label),
                placeholder = stringResource(R.string.apply_task_price_placeholder),
                error = uiState.priceError ?: "",
                keyboardType = KeyboardType.Number,
                prefix = { Text("₫ ", color = colors.muted) },
            )

            // Message field
            MetroTextarea(
                value = uiState.message,
                onValueChange = { viewModel.updateMessage(it) },
                label = stringResource(R.string.apply_task_message_label),
                placeholder = stringResource(R.string.apply_task_message_placeholder),
                error = uiState.messageError ?: "",
            )

            // Error message
            uiState.error?.let { error ->
                MetroCard(
                    contentPadding = PaddingValues(16.dp),
                ) {
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Submit button
            MetroButton(
                label = stringResource(R.string.apply_task_submit),
                onClick = { viewModel.applyForTask(taskId) },
                fullWidth = true,
                enabled = !uiState.isLoading && uiState.priceError == null && uiState.messageError == null,
                isLoading = uiState.isLoading,
            )
        }

        // Profile completion bottom sheet
        uiState.profileGate?.let { gate ->
            ProfileCompletionBottomSheet(
                request = gate,
                saving = uiState.profileSaving,
                onSubmit = { name, bio ->
                    viewModel.completeProfileAndRetry(taskId, name, bio)
                },
                onDismiss = { viewModel.dismissProfileGate() },
                onGoToProfile = {
                    viewModel.dismissProfileGate()
                    onNavigateBack()
                },
            )
        }
    }
}
