package com.viecz.vieczandroid.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.viecz.vieczandroid.ui.screens.*

// Navigation routes
object NavigationRoutes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val HOME = "home"
    const val FIRST_SCREEN = "first_screen"
    const val SECOND_SCREEN = "second_screen"
    const val PAYMENT_SCREEN = "payment_screen"
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
                    navController.navigate(NavigationRoutes.HOME) {
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
                    navController.navigate(NavigationRoutes.HOME) {
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
                    navController.navigate(NavigationRoutes.HOME) {
                        popUpTo(NavigationRoutes.REGISTER) { inclusive = true }
                    }
                }
            )
        }

        // Home screen (placeholder - reusing FirstScreen for now)
        composable(NavigationRoutes.HOME) {
            FirstScreen(
                onNextClick = {
                    navController.navigate(NavigationRoutes.SECOND_SCREEN)
                },
                onPaymentClick = {
                    navController.navigate(NavigationRoutes.PAYMENT_SCREEN)
                }
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
