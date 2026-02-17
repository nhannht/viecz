package com.viecz.vieczandroid.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.ui.screens.*

// Navigation routes
object NavigationRoutes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val HOME = "home"
    const val MAIN = "main"
    const val TASK_DETAIL = "task_detail/{taskId}"
    const val CREATE_TASK = "create_task"
    const val APPLY_TASK = "apply_task/{taskId}/{price}"
    const val PROFILE = "profile"
    const val WALLET = "wallet"
    const val CHAT = "chat/{conversationId}"
    const val NOTIFICATIONS = "notifications"
    const val MY_JOBS = "my_jobs/{mode}"
    const val EDIT_TASK = "edit_task/{taskId}"
    const val FIRST_SCREEN = "first_screen"
    const val SECOND_SCREEN = "second_screen"
    const val PAYMENT_SCREEN = "payment_screen"

    fun taskDetail(taskId: Long) = "task_detail/$taskId"
    fun editTask(taskId: Long) = "edit_task/$taskId"
    fun applyTask(taskId: Long, price: Long) = "apply_task/$taskId/$price"
    fun chat(conversationId: Long) = "chat/$conversationId"
    fun myJobs(mode: String) = "my_jobs/$mode"
}

@Composable
fun VieczNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = NavigationRoutes.SPLASH,
        modifier = modifier
    ) {
        // Splash screen
        composable(NavigationRoutes.SPLASH) {
            SplashScreen(
                onNavigateToLogin = {
                    navController.navigate(NavigationRoutes.LOGIN) {
                        popUpTo(NavigationRoutes.SPLASH) { inclusive = true }
                    }
                },
                onNavigateToHome = {
                    navController.navigate(NavigationRoutes.MAIN) {
                        popUpTo(NavigationRoutes.SPLASH) { inclusive = true }
                    }
                }
            )
        }

        // Login screen
        composable(NavigationRoutes.LOGIN) {
            LoginScreen(
                onNavigateToRegister = {
                    navController.navigate(NavigationRoutes.REGISTER)
                },
                onLoginSuccess = {
                    navController.navigate(NavigationRoutes.MAIN) {
                        popUpTo(NavigationRoutes.LOGIN) { inclusive = true }
                    }
                }
            )
        }

        // Register screen
        composable(NavigationRoutes.REGISTER) {
            RegisterScreen(
                onNavigateToLogin = {
                    navController.popBackStack()
                },
                onRegisterSuccess = {
                    navController.navigate(NavigationRoutes.MAIN) {
                        popUpTo(NavigationRoutes.REGISTER) { inclusive = true }
                    }
                }
            )
        }

        // Main screen — persistent bottom nav with tabs
        composable(NavigationRoutes.MAIN) { backStackEntry ->
            MainScreen(
                navController = navController,
                refreshTrigger = backStackEntry.savedStateHandle.get<Boolean>("refresh") == true
            )

            // Consume the flag so it doesn't re-trigger
            backStackEntry.savedStateHandle.remove<Boolean>("refresh")
        }

        // Legacy Home screen route (kept for backward compatibility)
        composable(NavigationRoutes.HOME) { backStackEntry ->
            val context = LocalContext.current
            val tokenManager = TokenManager(context)

            HomeScreen(
                onNavigateToTaskDetail = { taskId ->
                    navController.navigate(NavigationRoutes.taskDetail(taskId))
                },
                onNavigateToCreateTask = {
                    navController.navigate(NavigationRoutes.CREATE_TASK)
                },
                onNavigateToProfile = {
                    navController.navigate(NavigationRoutes.PROFILE)
                },
                onNavigateToWallet = {
                    navController.navigate(NavigationRoutes.WALLET)
                },
                onNavigateToNotifications = {
                    navController.navigate(NavigationRoutes.NOTIFICATIONS)
                },
                refreshTrigger = backStackEntry.savedStateHandle.get<Boolean>("refresh") == true
            )

            // Consume the flag so it doesn't re-trigger
            backStackEntry.savedStateHandle.remove<Boolean>("refresh")
        }

        // Notifications screen
        composable(NavigationRoutes.NOTIFICATIONS) {
            NotificationScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToTaskDetail = { taskId ->
                    navController.navigate(NavigationRoutes.taskDetail(taskId))
                }
            )
        }

        // Task detail screen
        composable(
            route = NavigationRoutes.TASK_DETAIL,
            arguments = listOf(navArgument("taskId") { type = NavType.LongType })
        ) { backStackEntry ->
            val taskId = backStackEntry.arguments?.getLong("taskId") ?: return@composable
            TaskDetailScreen(
                taskId = taskId,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToApply = { taskId, price ->
                    navController.navigate(NavigationRoutes.applyTask(taskId, price))
                },
                onNavigateToChat = { conversationId ->
                    navController.navigate(NavigationRoutes.chat(conversationId))
                },
                onNavigateToProfile = {
                    navController.navigate(NavigationRoutes.PROFILE)
                },
                onNavigateToEdit = { taskId ->
                    navController.navigate(NavigationRoutes.editTask(taskId))
                }
            )
        }

        // Create task screen
        composable(NavigationRoutes.CREATE_TASK) {
            CreateTaskScreen(
                onNavigateBack = { navController.popBackStack() },
                onTaskCreated = { taskId ->
                    // Set refresh on MAIN's savedStateHandle
                    navController.getBackStackEntry(NavigationRoutes.MAIN)
                        .savedStateHandle["refresh"] = true
                    navController.navigate(NavigationRoutes.taskDetail(taskId)) {
                        popUpTo(NavigationRoutes.MAIN)
                    }
                }
            )
        }

        // Edit task screen
        composable(
            route = NavigationRoutes.EDIT_TASK,
            arguments = listOf(navArgument("taskId") { type = NavType.LongType })
        ) { backStackEntry ->
            val editTaskId = backStackEntry.arguments?.getLong("taskId") ?: return@composable
            CreateTaskScreen(
                onNavigateBack = { navController.popBackStack() },
                onTaskCreated = { taskId ->
                    // Pop back to task detail and refresh
                    navController.popBackStack()
                },
                taskId = editTaskId
            )
        }

        // Apply task screen
        composable(
            route = NavigationRoutes.APPLY_TASK,
            arguments = listOf(
                navArgument("taskId") { type = NavType.LongType },
                navArgument("price") { type = NavType.LongType }
            )
        ) { backStackEntry ->
            val taskId = backStackEntry.arguments?.getLong("taskId") ?: return@composable
            val price = backStackEntry.arguments?.getLong("price") ?: 0L

            ApplyTaskScreen(
                taskId = taskId,
                originalPrice = price,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // Profile screen (standalone, pushed from detail screens)
        composable(NavigationRoutes.PROFILE) {
            ProfileScreen(
                onNavigateBack = { navController.popBackStack() },
                onLogout = {
                    navController.navigate(NavigationRoutes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onNavigateToMyPostedJobs = {
                    navController.navigate(NavigationRoutes.myJobs("posted"))
                },
                onNavigateToMyAppliedJobs = {
                    navController.navigate(NavigationRoutes.myJobs("applied"))
                },
                onNavigateToMyCompletedJobs = {
                    navController.navigate(NavigationRoutes.myJobs("completed"))
                }
            )
        }

        // My Jobs screen
        composable(
            route = NavigationRoutes.MY_JOBS,
            arguments = listOf(navArgument("mode") { type = NavType.StringType })
        ) { backStackEntry ->
            val mode = backStackEntry.arguments?.getString("mode") ?: "posted"
            MyJobsScreen(
                mode = mode,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToTaskDetail = { taskId ->
                    navController.navigate(NavigationRoutes.taskDetail(taskId))
                }
            )
        }

        // Wallet screen (standalone, pushed from detail screens)
        composable(NavigationRoutes.WALLET) {
            WalletScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // Chat screen
        composable(
            route = NavigationRoutes.CHAT,
            arguments = listOf(navArgument("conversationId") { type = NavType.LongType })
        ) { backStackEntry ->
            val conversationId = backStackEntry.arguments?.getLong("conversationId") ?: return@composable
            ChatScreen(
                conversationId = conversationId,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(NavigationRoutes.FIRST_SCREEN) {
            FirstScreen(
                onNextClick = {
                    navController.navigate(NavigationRoutes.SECOND_SCREEN)
                },
                onPaymentClick = {
                    navController.navigate(NavigationRoutes.PAYMENT_SCREEN)
                }
            )
        }

        composable(NavigationRoutes.SECOND_SCREEN) {
            SecondScreen(
                onPreviousClick = {
                    navController.popBackStack()
                }
            )
        }

        composable(NavigationRoutes.PAYMENT_SCREEN) {
            PaymentScreen()
        }
    }
}
