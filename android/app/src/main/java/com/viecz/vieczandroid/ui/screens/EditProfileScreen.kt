package com.viecz.vieczandroid.ui.screens

import android.app.Application
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.viecz.vieczandroid.data.api.UpdateProfileRequest
import com.viecz.vieczandroid.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EditProfileUiState(
    val name: String = "",
    val bio: String = "",
    val phone: String = "",
    val avatarUrl: String? = null,
    val selectedImageUri: Uri? = null,
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val isUploadingAvatar: Boolean = false,
    val error: String? = null,
    val updateSuccess: Boolean = false
)

@HiltViewModel
class EditProfileViewModel @Inject constructor(
    private val repository: UserRepository,
    private val application: Application
) : ViewModel() {

    private val _uiState = MutableStateFlow(EditProfileUiState())
    val uiState: StateFlow<EditProfileUiState> = _uiState.asStateFlow()

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = repository.getMyProfile()
            result.fold(
                onSuccess = { user ->
                    _uiState.value = _uiState.value.copy(
                        name = user.name,
                        bio = user.bio ?: "",
                        phone = user.phone ?: "",
                        avatarUrl = user.avatarUrl,
                        isLoading = false
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to load profile"
                    )
                }
            )
        }
    }

    fun onNameChange(name: String) {
        _uiState.value = _uiState.value.copy(name = name)
    }

    fun onBioChange(bio: String) {
        if (bio.length <= 500) {
            _uiState.value = _uiState.value.copy(bio = bio)
        }
    }

    fun onPhoneChange(phone: String) {
        _uiState.value = _uiState.value.copy(phone = phone)
    }

    fun onImageSelected(uri: Uri?) {
        _uiState.value = _uiState.value.copy(selectedImageUri = uri)
    }

    fun saveProfile() {
        val state = _uiState.value
        if (state.name.isBlank()) {
            _uiState.value = state.copy(error = "Name is required")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, error = null)

            // Upload avatar first if a new image was selected
            val selectedUri = state.selectedImageUri
            if (selectedUri != null) {
                _uiState.value = _uiState.value.copy(isUploadingAvatar = true)
                val uploadResult = repository.uploadAvatar(
                    application.contentResolver,
                    selectedUri
                )
                uploadResult.fold(
                    onSuccess = { user ->
                        _uiState.value = _uiState.value.copy(
                            avatarUrl = user.avatarUrl,
                            selectedImageUri = null,
                            isUploadingAvatar = false
                        )
                    },
                    onFailure = { error ->
                        _uiState.value = _uiState.value.copy(
                            isSaving = false,
                            isUploadingAvatar = false,
                            error = error.message ?: "Failed to upload avatar"
                        )
                        return@launch
                    }
                )
            }

            // Then update profile fields
            val request = UpdateProfileRequest(
                name = _uiState.value.name,
                bio = _uiState.value.bio.ifBlank { null },
                phone = _uiState.value.phone.ifBlank { null }
            )
            val result = repository.updateProfile(request)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        updateSuccess = true
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        error = error.message ?: "Failed to update profile"
                    )
                }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    onNavigateBack: () -> Unit,
    viewModel: EditProfileViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        viewModel.onImageSelected(uri)
    }

    LaunchedEffect(Unit) {
        viewModel.loadProfile()
    }

    LaunchedEffect(uiState.updateSuccess) {
        if (uiState.updateSuccess) {
            onNavigateBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Profile") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(
                        onClick = { viewModel.saveProfile() },
                        enabled = !uiState.isSaving && !uiState.isLoading
                    ) {
                        Icon(Icons.Default.Check, contentDescription = "Save")
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Avatar section
                        item {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(100.dp)
                                        .clip(CircleShape)
                                        .clickable {
                                            photoPickerLauncher.launch(
                                                PickVisualMediaRequest(
                                                    ActivityResultContracts.PickVisualMedia.ImageOnly
                                                )
                                            )
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    when {
                                        // Show selected image preview
                                        uiState.selectedImageUri != null -> {
                                            AsyncImage(
                                                model = uiState.selectedImageUri,
                                                contentDescription = "Selected photo",
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier
                                                    .fillMaxSize()
                                                    .clip(CircleShape)
                                            )
                                        }
                                        // Show current avatar
                                        !uiState.avatarUrl.isNullOrBlank() -> {
                                            AsyncImage(
                                                model = resolveAvatarUrl(uiState.avatarUrl!!),
                                                contentDescription = "Current avatar",
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier
                                                    .fillMaxSize()
                                                    .clip(CircleShape)
                                            )
                                        }
                                        // Show camera icon placeholder
                                        else -> {
                                            Surface(
                                                modifier = Modifier.fillMaxSize(),
                                                shape = CircleShape,
                                                color = MaterialTheme.colorScheme.surfaceVariant
                                            ) {
                                                Icon(
                                                    Icons.Default.CameraAlt,
                                                    contentDescription = null,
                                                    modifier = Modifier
                                                        .padding(24.dp),
                                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                TextButton(
                                    onClick = {
                                        photoPickerLauncher.launch(
                                            PickVisualMediaRequest(
                                                ActivityResultContracts.PickVisualMedia.ImageOnly
                                            )
                                        )
                                    }
                                ) {
                                    Text("Change Photo")
                                }

                                if (uiState.isUploadingAvatar) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    LinearProgressIndicator(modifier = Modifier.width(100.dp))
                                }
                            }
                        }

                        item {
                            OutlinedTextField(
                                value = uiState.name,
                                onValueChange = viewModel::onNameChange,
                                label = { Text("Name") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                isError = uiState.error == "Name is required" && uiState.name.isBlank()
                            )
                        }

                        item {
                            OutlinedTextField(
                                value = uiState.bio,
                                onValueChange = viewModel::onBioChange,
                                label = { Text("Bio") },
                                modifier = Modifier.fillMaxWidth(),
                                minLines = 3,
                                maxLines = 5,
                                supportingText = {
                                    Text("${uiState.bio.length}/500")
                                }
                            )
                        }

                        item {
                            OutlinedTextField(
                                value = uiState.phone,
                                onValueChange = viewModel::onPhoneChange,
                                label = { Text("Phone") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )
                        }

                        if (uiState.error != null) {
                            item {
                                Text(
                                    text = uiState.error!!,
                                    color = MaterialTheme.colorScheme.error,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }

                        item {
                            Button(
                                onClick = { viewModel.saveProfile() },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !uiState.isSaving
                            ) {
                                if (uiState.isSaving) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(16.dp),
                                        strokeWidth = 2.dp,
                                        color = MaterialTheme.colorScheme.onPrimary
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                }
                                Text("Save")
                            }
                        }
                    }
                }
            }
        }
    }
}
