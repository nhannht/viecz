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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.viecz.vieczandroid.BuildConfig
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

    LaunchedEffect(uiState.becomeTaskerSuccess) {
        if (uiState.becomeTaskerSuccess) {
            snackbarHostState.showSnackbar(
                message = "You are now registered as a tasker!",
                withDismissAction = true
            )
            viewModel.clearBecomeTaskerSuccess()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profile") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToEditProfile) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit Profile")
                    }
                    IconButton(onClick = { showLogoutDialog = true }) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Logout")
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
                        message = uiState.error ?: "An error occurred",
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
            title = "Become a Tasker",
            confirmLabel = "Yes, Register",
            cancelLabel = "Cancel",
            onConfirm = {
                viewModel.becomeTasker()
                showBecomeTaskerDialog = false
            },
            onCancel = { showBecomeTaskerDialog = false },
        ) {
            Text(
                text = "Do you want to register as a tasker? This will allow you to apply for tasks posted by other users.",
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
            title = "Logout",
            confirmLabel = "Logout",
            cancelLabel = "Cancel",
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
                text = "Are you sure you want to logout?",
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
                        text = user.email,
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
                            text = "No bio yet",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.muted.copy(alpha = 0.6f),
                        )
                    }
                    if (onNavigateToEditProfile != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        MetroButton(
                            label = "Edit Profile",
                            onClick = onNavigateToEditProfile,
                            variant = MetroButtonVariant.Secondary,
                        )
                    }
                    if (user.isTasker) {
                        Spacer(modifier = Modifier.height(8.dp))
                        MetroBadge(
                            label = "Tasker",
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
                    text = "Statistics",
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
                        label = "Rating",
                        value = String.format("%.1f", user.rating)
                    )
                    StatisticItem(
                        icon = Icons.Default.Check,
                        label = "Completed",
                        value = user.totalTasksCompleted.toString()
                    )
                    StatisticItem(
                        icon = Icons.Default.Add,
                        label = "Posted",
                        value = user.totalTasksPosted.toString()
                    )
                    StatisticItem(
                        icon = Icons.Default.Payments,
                        label = "Earned",
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
                        text = "Account Information",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = colors.fg,
                    )

                    InfoRow(
                        icon = Icons.Default.Email,
                        label = "Email",
                        value = user.email
                    )
                    InfoRow(
                        icon = Icons.Default.LocationOn,
                        label = "University",
                        value = user.university
                    )
                    InfoRow(
                        icon = Icons.Default.CheckCircle,
                        label = "Verified",
                        value = if (user.isVerified) "Yes" else "No"
                    )
                }
            }
        }

        // My Jobs
        item {
            MetroCard(contentPadding = PaddingValues(16.dp)) {
                MyJobsRow(
                    icon = Icons.Default.Work,
                    label = "My Jobs",
                    onClick = onNavigateToMyJobs
                )
            }
        }

        // Become tasker button
        if (!user.isTasker) {
            item {
                MetroButton(
                    label = "Become a Tasker",
                    onClick = onBecomeTasker,
                    fullWidth = true,
                )
            }
        }

        // Logout button (shown when used inside MainScreen tab)
        if (onLogout != null) {
            item {
                MetroButton(
                    label = "Logout",
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
            contentDescription = "Profile picture",
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
