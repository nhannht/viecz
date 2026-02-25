package com.viecz.vieczandroid.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner

import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.NavHostController
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
    var currentTab by remember { mutableIntStateOf(0) }
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

    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

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
                    val snackbarHostState = remember { SnackbarHostState() }
                    var showBecomeTaskerDialog by remember { mutableStateOf(false) }

                    LaunchedEffect(profileUiState.becomeTaskerSuccess) {
                        if (profileUiState.becomeTaskerSuccess) {
                            snackbarHostState.showSnackbar(
                                message = "You are now registered as a tasker!",
                                withDismissAction = true
                            )
                            profileViewModel.clearBecomeTaskerSuccess()
                        }
                    }

                    Box(modifier = Modifier.fillMaxSize()) {
                        when {
                            profileUiState.isLoading && profileUiState.user == null -> {
                                MetroLoadingState()
                            }
                            profileUiState.error != null -> {
                                ErrorState(
                                    message = profileUiState.error ?: "An error occurred",
                                    onRetry = { profileViewModel.loadProfile() }
                                )
                            }
                            profileUiState.user != null -> {
                                ProfileContent(
                                    user = profileUiState.user!!,
                                    onBecomeTasker = { showBecomeTaskerDialog = true },
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
                        SnackbarHost(
                            hostState = snackbarHostState,
                            modifier = Modifier.align(Alignment.BottomCenter)
                        )
                    }

                    if (showBecomeTaskerDialog) {
                        MetroDialog(
                            open = true,
                            onDismiss = { showBecomeTaskerDialog = false },
                            title = "Become a Tasker",
                            confirmLabel = "Yes, Register",
                            cancelLabel = "Cancel",
                            onConfirm = {
                                profileViewModel.becomeTasker()
                                showBecomeTaskerDialog = false
                            },
                            onCancel = { showBecomeTaskerDialog = false },
                        ) {
                            Text("Do you want to register as a tasker? This will allow you to apply for tasks posted by other users.")
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
            title = "Logout",
            confirmLabel = "Logout",
            cancelLabel = "Cancel",
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
            Text("Are you sure you want to logout?")
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
    onEditProfile: () -> Unit = {}
) {
    TopAppBar(
        title = {
            Text(
                text = "Viecz",
                fontWeight = FontWeight.Bold
            )
        },
        actions = {
            // Contextual action based on current tab
            when (currentTab) {
                0 -> {
                    IconButton(onClick = onSearchToggle) {
                        Icon(Icons.Default.Search, contentDescription = "Search")
                    }
                    IconButton(onClick = onAddJob) {
                        Icon(Icons.Default.Add, contentDescription = "Add Job")
                    }
                }
                1 -> {
                    IconButton(onClick = onEditProfile) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit Profile")
                    }
                }
                3 -> {
                    IconButton(onClick = onDeposit) {
                        Icon(Icons.Default.Add, contentDescription = "Deposit")
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
                    Icon(Icons.Default.Notifications, contentDescription = "Notifications")
                }
            }
        }
    )
}

@Composable
fun VieczBottomBar(
    currentTab: Int,
    onTabSelected: (Int) -> Unit
) {
    NavigationBar {
        NavigationBarItem(
            selected = currentTab == 0,
            onClick = { onTabSelected(0) },
            icon = { Icon(Icons.Default.Home, contentDescription = "Marketplace") },
            label = { Text("Marketplace") }
        )
        NavigationBarItem(
            selected = currentTab == 1,
            onClick = { onTabSelected(1) },
            icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
            label = { Text("Profile") }
        )
        NavigationBarItem(
            selected = currentTab == 2,
            onClick = { onTabSelected(2) },
            icon = { Icon(Icons.AutoMirrored.Filled.Chat, contentDescription = "Messages") },
            label = { Text("Messages") }
        )
        NavigationBarItem(
            selected = currentTab == 3,
            onClick = { onTabSelected(3) },
            icon = { Icon(Icons.Default.AccountBalanceWallet, contentDescription = "Wallet") },
            label = { Text("Wallet") }
        )
    }
}
