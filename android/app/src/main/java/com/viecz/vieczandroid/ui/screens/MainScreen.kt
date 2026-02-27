package com.viecz.vieczandroid.ui.screens

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner

import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.NavHostController
import androidx.core.content.ContextCompat
import com.viecz.vieczandroid.R
import com.viecz.vieczandroid.ui.components.ErrorState
import com.viecz.vieczandroid.ui.components.metro.MetroDialog
import com.viecz.vieczandroid.ui.components.metro.MetroLoadingState
import com.viecz.vieczandroid.ui.navigation.NavigationRoutes
import com.viecz.vieczandroid.ui.viewmodels.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    navController: NavHostController,
    refreshTrigger: Boolean = false
) {
    // Check if we should switch to a specific tab (e.g. after payment deep link)
    val switchToTab = navController.currentBackStackEntry
        ?.savedStateHandle?.get<Int>("switchToTab")
    var currentTab by remember { mutableIntStateOf(switchToTab ?: 0) }
    LaunchedEffect(switchToTab) {
        switchToTab?.let {
            currentTab = it
            navController.currentBackStackEntry?.savedStateHandle?.remove<Int>("switchToTab")
        }
    }
    var showDepositDialog by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showSearchBar by remember { mutableStateOf(false) }

    // ViewModels scoped to MainScreen
    val taskListViewModel: TaskListViewModel = hiltViewModel()
    val notificationViewModel: NotificationViewModel = hiltViewModel()
    val notificationUiState by notificationViewModel.uiState.collectAsState()
    val walletViewModel: WalletViewModel = hiltViewModel()
    val depositState by walletViewModel.depositState.collectAsState()
    val profileViewModel: ProfileViewModel = hiltViewModel()
    val profileUiState by profileViewModel.uiState.collectAsState()
    val taskListUiState by taskListViewModel.uiState.collectAsState()

    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    fun enableNearMeFromCurrentLocation() {
        fetchCurrentLocation(
            context = context,
            onSuccess = { latitude, longitude ->
                taskListViewModel.enableNearMe(latitude, longitude)
            },
            onFailure = {
                taskListViewModel.onLocationUnavailable()
            }
        )
    }

    fun updateCurrentLocationInState() {
        fetchCurrentLocation(
            context = context,
            onSuccess = { latitude, longitude ->
                taskListViewModel.updateUserLocation(latitude, longitude)
            },
            onFailure = { }
        )
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val fineGranted = grants[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarseGranted = grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (fineGranted || coarseGranted) {
            enableNearMeFromCurrentLocation()
        } else {
            taskListViewModel.onLocationPermissionDenied()
        }
    }

    // Load profile on first composition
    LaunchedEffect(Unit) {
        profileViewModel.loadProfile()
    }

    // Auto-refresh marketplace when returning from task detail/other screens
    LaunchedEffect(lifecycleOwner, currentTab) {
        if (currentTab == 0) {
            lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
                taskListViewModel.refresh()
            }
        }
    }

    // Auto-refresh wallet when on wallet tab and returning from browser
    LaunchedEffect(lifecycleOwner, currentTab) {
        if (currentTab == 3) {
            lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
                walletViewModel.loadWallet()
                walletViewModel.loadTransactionHistory()
            }
        }
    }

    // Open browser when deposit succeeds
    LaunchedEffect(depositState) {
        if (depositState is DepositUiState.Success) {
            val checkoutUrl = (depositState as DepositUiState.Success).checkoutUrl
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(checkoutUrl))
            context.startActivity(intent)
            showDepositDialog = false
            walletViewModel.resetDepositState()
        }
    }

    // Handle refresh trigger from CreateTask
    LaunchedEffect(refreshTrigger) {
        if (refreshTrigger) {
            taskListViewModel.refresh()
        }
    }

    Scaffold(
        topBar = {
            VieczTopBar(
                currentTab = currentTab,
                unreadCount = notificationUiState.unreadCount,
                onAddJob = {
                    navController.navigate(NavigationRoutes.CREATE_TASK)
                },
                onDeposit = { showDepositDialog = true },
                onNotifications = {
                    navController.navigate(NavigationRoutes.NOTIFICATIONS)
                },
                onSearchToggle = { showSearchBar = !showSearchBar },
                isMapView = taskListUiState.isMapView,
                onShowListView = {
                    taskListViewModel.showListView()
                },
                onShowMapView = {
                    taskListViewModel.showMapView()
                    if (taskListUiState.latitude == null && taskListUiState.longitude == null && hasLocationPermission(context)) {
                        updateCurrentLocationInState()
                    }
                },
                nearMeEnabled = taskListUiState.nearMeEnabled,
                onNearMeToggle = {
                    if (taskListUiState.nearMeEnabled) {
                        taskListViewModel.disableNearMe()
                    } else if (hasLocationPermission(context)) {
                        enableNearMeFromCurrentLocation()
                    } else {
                        locationPermissionLauncher.launch(
                            arrayOf(
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            )
                        )
                    }
                },
                onEditProfile = {
                    navController.navigate(NavigationRoutes.EDIT_PROFILE)
                }
            )
        },
        bottomBar = {
            VieczBottomBar(
                currentTab = currentTab,
                onTabSelected = { currentTab = it }
            )
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues)) {
            when (currentTab) {
                0 -> HomeContent(
                    onNavigateToTaskDetail = { taskId ->
                        navController.navigate(NavigationRoutes.taskDetail(taskId))
                    },
                    taskListViewModel = taskListViewModel,
                    showSearchBar = showSearchBar
                )
                1 -> {
                    Box(modifier = Modifier.fillMaxSize()) {
                        when {
                            profileUiState.isLoading && profileUiState.user == null -> {
                                MetroLoadingState()
                            }
                            profileUiState.error != null -> {
                                ErrorState(
                                    message = profileUiState.error ?: stringResource(R.string.main_error_occurred),
                                    onRetry = { profileViewModel.loadProfile() }
                                )
                            }
                            profileUiState.user != null -> {
                                ProfileContent(
                                    user = profileUiState.user!!,
                                    onNavigateToMyJobs = {
                                        navController.navigate(NavigationRoutes.MY_JOBS)
                                    },
                                    onNavigateToEditProfile = {
                                        navController.navigate(NavigationRoutes.EDIT_PROFILE)
                                    },
                                    onLogout = { showLogoutDialog = true }
                                )
                            }
                        }
                    }
                }
                2 -> ConversationListContent(
                    onNavigateToChat = { conversationId ->
                        navController.navigate(NavigationRoutes.chat(conversationId))
                    },
                    onNavigateToMarketplace = { currentTab = 0 }
                )
                3 -> WalletContent(viewModel = walletViewModel)
            }
        }
    }

    // Deposit Dialog
    if (showDepositDialog) {
        DepositDialog(
            depositState = depositState,
            onDeposit = { amount, description ->
                walletViewModel.deposit(amount, description)
            },
            onDismiss = {
                showDepositDialog = false
                walletViewModel.resetDepositState()
            }
        )
    }

    // Logout confirmation dialog
    if (showLogoutDialog) {
        MetroDialog(
            open = true,
            onDismiss = { showLogoutDialog = false },
            title = stringResource(R.string.main_logout),
            confirmLabel = stringResource(R.string.main_logout_confirm),
            cancelLabel = stringResource(R.string.main_logout_cancel),
            onConfirm = {
                kotlinx.coroutines.MainScope().launch {
                    profileViewModel.logout()
                    navController.navigate(NavigationRoutes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
                showLogoutDialog = false
            },
            onCancel = { showLogoutDialog = false },
        ) {
            Text(stringResource(R.string.main_logout_message))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VieczTopBar(
    currentTab: Int,
    unreadCount: Int,
    onAddJob: () -> Unit,
    onDeposit: () -> Unit,
    onNotifications: () -> Unit,
    onSearchToggle: () -> Unit = {},
    isMapView: Boolean = false,
    onShowListView: () -> Unit = {},
    onShowMapView: () -> Unit = {},
    nearMeEnabled: Boolean = false,
    onNearMeToggle: () -> Unit = {},
    onEditProfile: () -> Unit = {}
) {
    TopAppBar(
        title = {
            Text(
                text = stringResource(R.string.main_title),
                fontWeight = FontWeight.Bold
            )
        },
        actions = {
            // Contextual action based on current tab
            when (currentTab) {
                0 -> {
                    IconButton(onClick = onShowListView) {
                        Icon(
                            Icons.Default.ViewList,
                            contentDescription = stringResource(R.string.main_list_view),
                            tint = if (!isMapView) MaterialTheme.colorScheme.primary else LocalContentColor.current
                        )
                    }
                    IconButton(onClick = onShowMapView) {
                        Icon(
                            Icons.Default.Map,
                            contentDescription = stringResource(R.string.main_map_view),
                            tint = if (isMapView) MaterialTheme.colorScheme.primary else LocalContentColor.current
                        )
                    }
                    // Hide near-me toggle and search when in map view (they're on the map now)
                    if (!isMapView) {
                        IconButton(onClick = onNearMeToggle) {
                            Icon(
                                Icons.Default.MyLocation,
                                contentDescription = stringResource(if (nearMeEnabled) R.string.main_near_me_enabled else R.string.main_near_me),
                                tint = if (nearMeEnabled) MaterialTheme.colorScheme.primary else LocalContentColor.current
                            )
                        }
                        IconButton(onClick = onSearchToggle) {
                            Icon(Icons.Default.Search, contentDescription = stringResource(R.string.main_search))
                        }
                    }
                    IconButton(onClick = onAddJob) {
                        Icon(Icons.Default.Add, contentDescription = stringResource(R.string.main_add_job))
                    }
                }
                1 -> {
                    IconButton(onClick = onEditProfile) {
                        Icon(Icons.Default.Edit, contentDescription = stringResource(R.string.main_edit_profile))
                    }
                }
                3 -> {
                    IconButton(onClick = onDeposit) {
                        Icon(Icons.Default.Add, contentDescription = stringResource(R.string.main_deposit))
                    }
                }
            }

            // Notification bell (always visible)
            IconButton(onClick = onNotifications) {
                BadgedBox(
                    badge = {
                        if (unreadCount > 0) {
                            Badge { Text("$unreadCount") }
                        }
                    }
                ) {
                    Icon(Icons.Default.Notifications, contentDescription = stringResource(R.string.main_notifications))
                }
            }
        }
    )
}

private data class NavItem(
    val icon: ImageVector,
    val labelResId: Int,
)

private val navItems = listOf(
    NavItem(Icons.Default.Home, R.string.main_nav_market),
    NavItem(Icons.Default.Person, R.string.main_nav_profile),
    NavItem(Icons.AutoMirrored.Filled.Chat, R.string.main_nav_chat),
    NavItem(Icons.Default.AccountBalanceWallet, R.string.main_nav_wallet),
)

@Composable
fun VieczBottomBar(
    currentTab: Int,
    onTabSelected: (Int) -> Unit
) {
    val colors = com.viecz.vieczandroid.ui.theme.MetroTheme.colors

    Surface(
        color = colors.card,
        shadowElevation = 8.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp)
                .navigationBarsPadding(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            navItems.forEachIndexed { index, item ->
                PillNavItem(
                    icon = item.icon,
                    label = stringResource(item.labelResId),
                    selected = currentTab == index,
                    onClick = { onTabSelected(index) },
                    colors = colors,
                )
            }
        }
    }
}

@Composable
private fun PillNavItem(
    icon: ImageVector,
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    colors: com.viecz.vieczandroid.ui.theme.MetroColors,
) {
    val horizontalPadding by animateDpAsState(
        targetValue = if (selected) 16.dp else 12.dp,
        animationSpec = tween(250),
        label = "pillPadding",
    )

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(24.dp))
            .background(if (selected) colors.fg else colors.card)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            )
            .padding(horizontal = horizontalPadding, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (selected) colors.bg else colors.muted,
                modifier = Modifier.size(22.dp),
            )
            AnimatedVisibility(
                visible = selected,
                enter = fadeIn(tween(200)) + expandHorizontally(tween(250)),
                exit = fadeOut(tween(150)) + shrinkHorizontally(tween(200)),
            ) {
                Text(
                    text = label,
                    color = colors.bg,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(start = 6.dp),
                )
            }
        }
    }
}

private fun hasLocationPermission(context: Context): Boolean {
    val hasFine = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACCESS_FINE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED
    val hasCoarse = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACCESS_COARSE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED
    return hasFine || hasCoarse
}

@SuppressLint("MissingPermission")
private fun fetchCurrentLocation(
    context: Context,
    onSuccess: (latitude: Double, longitude: Double) -> Unit,
    onFailure: () -> Unit
) {
    val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        ?: run {
            onFailure()
            return
        }

    val provider = when {
        locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
        locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) -> LocationManager.GPS_PROVIDER
        else -> null
    }

    if (provider == null) {
        onFailure()
        return
    }

    try {
        val lastKnown = locationManager.getLastKnownLocation(provider)
        if (lastKnown != null) {
            onSuccess(lastKnown.latitude, lastKnown.longitude)
            return
        }

        locationManager.getCurrentLocation(provider, null, context.mainExecutor) { location ->
            if (location != null) {
                onSuccess(location.latitude, location.longitude)
            } else {
                onFailure()
            }
        }
    } catch (_: SecurityException) {
        onFailure()
    } catch (_: IllegalArgumentException) {
        onFailure()
    }
}
