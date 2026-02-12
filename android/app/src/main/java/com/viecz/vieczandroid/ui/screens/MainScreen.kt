package com.viecz.vieczandroid.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.NavHostController
import com.viecz.vieczandroid.R
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

    // ViewModels scoped to MainScreen
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

    // Auto-refresh wallet when on wallet tab and returning from browser
    LaunchedEffect(lifecycleOwner, currentTab) {
        if (currentTab == 4) {
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
    val taskListViewModel: TaskListViewModel = hiltViewModel()
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
                    taskListViewModel = taskListViewModel
                )
                1 -> {
                    val snackbarHostState = remember { SnackbarHostState() }

                    LaunchedEffect(profileUiState.becomeTaskerSuccess) {
                        if (profileUiState.becomeTaskerSuccess) {
                            snackbarHostState.showSnackbar("You are now registered as a tasker!")
                            profileViewModel.clearBecomeTaskerSuccess()
                        }
                    }

                    Box(modifier = Modifier.fillMaxSize()) {
                        when {
                            profileUiState.isLoading && profileUiState.user == null -> {
                                CircularProgressIndicator(
                                    modifier = Modifier.align(Alignment.Center)
                                )
                            }
                            profileUiState.error != null -> {
                                Column(
                                    modifier = Modifier.align(Alignment.Center),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = profileUiState.error ?: "An error occurred",
                                        color = MaterialTheme.colorScheme.error
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Button(onClick = { profileViewModel.loadProfile() }) {
                                        Text("Retry")
                                    }
                                }
                            }
                            profileUiState.user != null -> {
                                ProfileContent(
                                    user = profileUiState.user!!,
                                    onBecomeTasker = { profileViewModel.becomeTasker() },
                                    onNavigateToMyPostedJobs = {
                                        navController.navigate(NavigationRoutes.myJobs("posted"))
                                    },
                                    onNavigateToMyAppliedJobs = {
                                        navController.navigate(NavigationRoutes.myJobs("applied"))
                                    },
                                    onNavigateToMyCompletedJobs = {
                                        navController.navigate(NavigationRoutes.myJobs("completed"))
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
                }
                2 -> MascotPlaceholder()
                3 -> ConversationListContent(
                    onNavigateToChat = { conversationId ->
                        navController.navigate(NavigationRoutes.chat(conversationId))
                    }
                )
                4 -> WalletContent(viewModel = walletViewModel)
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
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Logout") },
            text = { Text("Are you sure you want to logout?") },
            confirmButton = {
                Button(
                    onClick = {
                        kotlinx.coroutines.MainScope().launch {
                            profileViewModel.logout()
                            navController.navigate(NavigationRoutes.LOGIN) {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                        showLogoutDialog = false
                    }
                ) {
                    Text("Logout")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VieczTopBar(
    currentTab: Int,
    unreadCount: Int,
    onAddJob: () -> Unit,
    onDeposit: () -> Unit,
    onNotifications: () -> Unit
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
                    IconButton(onClick = onAddJob) {
                        Icon(Icons.Default.Add, contentDescription = "Add Job")
                    }
                }
                4 -> {
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
            icon = {
                Image(
                    painter = painterResource(R.drawable.mascot),
                    contentDescription = "Viecz",
                    modifier = Modifier.size(32.dp)
                )
            },
            label = { Text("Viecz") }
        )
        NavigationBarItem(
            selected = currentTab == 3,
            onClick = { onTabSelected(3) },
            icon = { Icon(Icons.AutoMirrored.Filled.Chat, contentDescription = "Messages") },
            label = { Text("Messages") }
        )
        NavigationBarItem(
            selected = currentTab == 4,
            onClick = { onTabSelected(4) },
            icon = { Icon(Icons.Default.AccountBalanceWallet, contentDescription = "Wallet") },
            label = { Text("Wallet") }
        )
    }
}

@Composable
fun MascotPlaceholder() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Image(
                painter = painterResource(R.drawable.mascot),
                contentDescription = "Viecz Mascot",
                modifier = Modifier.size(120.dp)
            )
            Text(
                text = "Coming Soon!",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Stay tuned for new features",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
