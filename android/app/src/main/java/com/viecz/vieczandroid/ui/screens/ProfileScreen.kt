package com.viecz.vieczandroid.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.viecz.vieczandroid.BuildConfig
import com.viecz.vieczandroid.R
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.User
import com.viecz.vieczandroid.data.repository.UserRepository
import com.viecz.vieczandroid.ui.components.ErrorState
import com.viecz.vieczandroid.ui.components.metro.MetroBadge
import com.viecz.vieczandroid.ui.components.metro.MetroBadgeStatus
import com.viecz.vieczandroid.ui.components.metro.MetroButton
import com.viecz.vieczandroid.ui.components.metro.MetroButtonVariant
import com.viecz.vieczandroid.ui.components.metro.MetroCard
import com.viecz.vieczandroid.ui.components.metro.MetroDialog
import com.viecz.vieczandroid.ui.components.metro.MetroLoadingState
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.utils.formatCurrency
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val user: User? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val becomeTaskerSuccess: Boolean = false
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val repository: UserRepository,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = repository.getMyProfile()
            result.fold(
                onSuccess = { user ->
                    _uiState.value = _uiState.value.copy(
                        user = user,
                        isLoading = false,
                        error = null
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

    fun becomeTasker() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = repository.becomeTasker()
            result.fold(
                onSuccess = { user ->
                    tokenManager.updateIsTasker(true)
                    _uiState.value = _uiState.value.copy(
                        user = user,
                        isLoading = false,
                        becomeTaskerSuccess = true,
                        error = null
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to become tasker"
                    )
                }
            )
        }
    }

    suspend fun logout() {
        tokenManager.clearTokens()
    }

    fun clearBecomeTaskerSuccess() {
        _uiState.value = _uiState.value.copy(becomeTaskerSuccess = false)
    }
}

/**
 * Resolves a relative avatar URL (e.g. "/uploads/avatars/uuid.jpg") to an absolute URL
 * using the server base URL derived from BuildConfig.API_BASE_URL.
 */
fun resolveAvatarUrl(relativeUrl: String): String {
    val serverBase = BuildConfig.API_BASE_URL
        .removeSuffix("/")
        .removeSuffix("api/v1")
        .removeSuffix("/")
    return serverBase + relativeUrl
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onNavigateBack: () -> Unit,
    onLogout: () -> Unit,
    onNavigateToMyJobs: () -> Unit = {},
    onNavigateToEditProfile: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val colors = MetroTheme.colors
    val uiState by viewModel.uiState.collectAsState()
    var showBecomeTaskerDialog by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    // Refresh profile every time screen becomes visible (not just first load)
    val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                viewModel.loadProfile()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    val taskerSuccessMsg = stringResource(R.string.profile_tasker_success)
    LaunchedEffect(uiState.becomeTaskerSuccess) {
        if (uiState.becomeTaskerSuccess) {
            snackbarHostState.showSnackbar(
                message = taskerSuccessMsg,
                withDismissAction = true
            )
            viewModel.clearBecomeTaskerSuccess()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.profile_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.profile_back))
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToEditProfile) {
                        Icon(Icons.Default.Edit, contentDescription = stringResource(R.string.profile_edit))
                    }
                    IconButton(onClick = { showLogoutDialog = true }) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = stringResource(R.string.profile_logout))
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading && uiState.user == null -> {
                    MetroLoadingState()
                }
                uiState.error != null -> {
                    ErrorState(
                        message = uiState.error ?: stringResource(R.string.profile_error_occurred),
                        onRetry = { viewModel.loadProfile() }
                    )
                }
                uiState.user != null -> {
                    ProfileContent(
                        user = uiState.user!!,
                        onBecomeTasker = { showBecomeTaskerDialog = true },
                        onNavigateToMyJobs = onNavigateToMyJobs
                    )
                }
            }
        }
    }

    // Become tasker confirmation dialog
    if (showBecomeTaskerDialog) {
        MetroDialog(
            open = true,
            onDismiss = { showBecomeTaskerDialog = false },
            title = stringResource(R.string.profile_tasker_dialog_title),
            confirmLabel = stringResource(R.string.profile_tasker_dialog_confirm),
            cancelLabel = stringResource(R.string.profile_tasker_dialog_cancel),
            onConfirm = {
                viewModel.becomeTasker()
                showBecomeTaskerDialog = false
            },
            onCancel = { showBecomeTaskerDialog = false },
        ) {
            Text(
                text = stringResource(R.string.profile_tasker_dialog_message),
                style = MaterialTheme.typography.bodyMedium,
                color = colors.muted,
            )
        }
    }

    // Logout confirmation dialog
    if (showLogoutDialog) {
        MetroDialog(
            open = true,
            onDismiss = { showLogoutDialog = false },
            title = stringResource(R.string.profile_logout_dialog_title),
            confirmLabel = stringResource(R.string.profile_logout_dialog_confirm),
            cancelLabel = stringResource(R.string.profile_logout_dialog_cancel),
            onConfirm = {
                kotlinx.coroutines.MainScope().launch {
                    viewModel.logout()
                    onLogout()
                }
                showLogoutDialog = false
            },
            onCancel = { showLogoutDialog = false },
        ) {
            Text(
                text = stringResource(R.string.profile_logout_dialog_message),
                style = MaterialTheme.typography.bodyMedium,
                color = colors.muted,
            )
        }
    }
}

@Composable
fun ProfileContent(
    user: User,
    onBecomeTasker: () -> Unit,
    onNavigateToMyJobs: () -> Unit = {},
    onNavigateToEditProfile: (() -> Unit)? = null,
    onLogout: (() -> Unit)? = null
) {
    val colors = MetroTheme.colors

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Profile header
        item {
            MetroCard(
                featured = true,
                contentPadding = PaddingValues(16.dp),
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Avatar stays circular — content images, not UI chrome
                    ProfileAvatar(
                        avatarUrl = user.avatarUrl,
                        size = 80
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = user.name,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = colors.fg,
                    )
                    Text(
                        text = user.email ?: user.phone ?: "",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.muted,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    if (!user.bio.isNullOrBlank()) {
                        Text(
                            text = user.bio,
                            style = MaterialTheme.typography.bodyMedium,
                            color = colors.muted,
                        )
                    } else {
                        Text(
                            text = stringResource(R.string.profile_no_bio),
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.muted.copy(alpha = 0.6f),
                        )
                    }
                    if (onNavigateToEditProfile != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        MetroButton(
                            label = stringResource(R.string.profile_edit),
                            onClick = onNavigateToEditProfile,
                            variant = MetroButtonVariant.Secondary,
                        )
                    }
                    if (user.isTasker) {
                        Spacer(modifier = Modifier.height(8.dp))
                        MetroBadge(
                            label = stringResource(R.string.profile_tasker_badge),
                            status = MetroBadgeStatus.Open,
                        )
                    }
                }
            }
        }

        // Statistics
        item {
            MetroCard(contentPadding = PaddingValues(16.dp)) {
                Text(
                    text = stringResource(R.string.profile_statistics),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = colors.fg,
                )
                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    StatisticItem(
                        icon = Icons.Default.Star,
                        label = stringResource(R.string.profile_stat_rating),
                        value = String.format("%.1f", user.rating)
                    )
                    StatisticItem(
                        icon = Icons.Default.Check,
                        label = stringResource(R.string.profile_stat_completed),
                        value = user.totalTasksCompleted.toString()
                    )
                    StatisticItem(
                        icon = Icons.Default.Add,
                        label = stringResource(R.string.profile_stat_posted),
                        value = user.totalTasksPosted.toString()
                    )
                    StatisticItem(
                        icon = Icons.Default.Payments,
                        label = stringResource(R.string.profile_stat_earned),
                        value = formatCurrency(user.totalEarnings)
                    )
                }
            }
        }

        // Account info
        item {
            MetroCard(contentPadding = PaddingValues(16.dp)) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = stringResource(R.string.profile_account_info),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = colors.fg,
                    )

                    InfoRow(
                        icon = Icons.Default.Email,
                        label = stringResource(R.string.profile_email),
                        value = user.email ?: stringResource(R.string.profile_not_set)
                    )
                    InfoRow(
                        icon = Icons.Default.LocationOn,
                        label = stringResource(R.string.profile_university),
                        value = user.university ?: stringResource(R.string.profile_not_set)
                    )
                    InfoRow(
                        icon = Icons.Default.CheckCircle,
                        label = stringResource(R.string.profile_verified),
                        value = if (user.isVerified) stringResource(R.string.profile_verified_yes) else stringResource(R.string.profile_verified_no)
                    )
                }
            }
        }

        // My Jobs
        item {
            MetroCard(contentPadding = PaddingValues(16.dp)) {
                MyJobsRow(
                    icon = Icons.Default.Work,
                    label = stringResource(R.string.profile_my_jobs),
                    onClick = onNavigateToMyJobs
                )
            }
        }

        // Become tasker button
        if (!user.isTasker) {
            item {
                MetroButton(
                    label = stringResource(R.string.profile_become_tasker),
                    onClick = onBecomeTasker,
                    fullWidth = true,
                )
            }
        }

        // Logout button (shown when used inside MainScreen tab)
        if (onLogout != null) {
            item {
                MetroButton(
                    label = stringResource(R.string.profile_logout),
                    onClick = onLogout,
                    variant = MetroButtonVariant.Secondary,
                    fullWidth = true,
                )
            }
        }
    }
}

/**
 * Displays a user's avatar. Shows Coil AsyncImage if avatarUrl is set,
 * otherwise shows a default person icon.
 */
@Composable
fun ProfileAvatar(
    avatarUrl: String?,
    size: Int,
    modifier: Modifier = Modifier
) {
    val colors = MetroTheme.colors

    if (!avatarUrl.isNullOrBlank()) {
        AsyncImage(
            model = resolveAvatarUrl(avatarUrl),
            contentDescription = stringResource(R.string.profile_picture),
            contentScale = ContentScale.Crop,
            modifier = modifier
                .size(size.dp)
                .clip(CircleShape)
        )
    } else {
        Icon(
            imageVector = Icons.Default.Person,
            contentDescription = null,
            modifier = modifier.size(size.dp),
            tint = colors.fg
        )
    }
}

@Composable
fun StatisticItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    val colors = MetroTheme.colors

    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(32.dp),
            tint = colors.fg
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = colors.fg,
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = colors.muted,
        )
    }
}

@Composable
fun InfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    val colors = MetroTheme.colors

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = colors.muted
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = colors.muted,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = colors.fg,
            )
        }
    }
}

@Composable
fun MyJobsRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit
) {
    val colors = MetroTheme.colors

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(24.dp),
            tint = colors.fg
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodyLarge,
            color = colors.fg,
            modifier = Modifier.weight(1f)
        )
        Icon(
            imageVector = Icons.Default.ChevronRight,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = colors.muted
        )
    }
}
