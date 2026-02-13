package com.viecz.vieczandroid

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.rememberNavController
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.viecz.vieczandroid.data.auth.AuthEvent
import com.viecz.vieczandroid.data.auth.AuthEventManager
import com.viecz.vieczandroid.ui.navigation.NavigationRoutes
import com.viecz.vieczandroid.ui.navigation.VieczNavHost
import com.viecz.vieczandroid.ui.theme.VieczTheme
import javax.inject.Inject

data class PaymentResult(
    val success: Boolean,
    val orderCode: String?,
    val message: String?
)

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    companion object {
        private const val TAG = "MainActivity"
    }

    @Inject
    lateinit var authEventManager: AuthEventManager

    private val _paymentResult = MutableStateFlow<PaymentResult?>(null)
    val paymentResult: StateFlow<PaymentResult?> = _paymentResult.asStateFlow()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Handle initial deep link
        handleDeepLink(intent)

        setContent {
            VieczTheme {
                VieczApp(paymentResult, authEventManager.authEvents)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        if (intent?.action == Intent.ACTION_VIEW) {
            val uri = intent.data
            Log.d(TAG, "Deep link received: $uri")

            uri?.let {
                // Extract query parameters
                val status = it.getQueryParameter("status")
                val orderCode = it.getQueryParameter("orderCode")
                val message = it.getQueryParameter("message")

                Log.d(TAG, "Payment status: $status, orderCode: $orderCode, message: $message")

                when (status) {
                    "success", "PAID" -> {
                        _paymentResult.value = PaymentResult(
                            success = true,
                            orderCode = orderCode,
                            message = message ?: "Payment successful"
                        )
                    }
                    "cancel", "CANCELLED" -> {
                        _paymentResult.value = PaymentResult(
                            success = false,
                            orderCode = orderCode,
                            message = message ?: "Payment cancelled"
                        )
                    }
                    else -> {
                        _paymentResult.value = PaymentResult(
                            success = false,
                            orderCode = orderCode,
                            message = message ?: "Unknown payment status"
                        )
                    }
                }
            }
        }
    }

    fun clearPaymentResult() {
        _paymentResult.value = null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VieczApp(
    paymentResultFlow: StateFlow<PaymentResult?>,
    authEvents: SharedFlow<AuthEvent> = MutableSharedFlow()
) {
    val navController = rememberNavController()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val paymentResult by paymentResultFlow.collectAsStateWithLifecycle()

    // Handle 401 Unauthorized — redirect to login
    LaunchedEffect(Unit) {
        authEvents.collect { event ->
            when (event) {
                is AuthEvent.Unauthorized -> {
                    navController.navigate(NavigationRoutes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                    snackbarHostState.showSnackbar(
                        message = "Session expired. Please log in again.",
                        duration = SnackbarDuration.Short,
                        withDismissAction = true
                    )
                }
            }
        }
    }

    // Handle payment result
    LaunchedEffect(paymentResult) {
        paymentResult?.let { result ->
            scope.launch {
                val message = if (result.success) {
                    "✅ ${result.message}"
                } else {
                    "❌ ${result.message}"
                }
                snackbarHostState.showSnackbar(
                    message = message,
                    duration = SnackbarDuration.Long,
                    withDismissAction = true
                )
            }
        }
    }

    Scaffold(
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState)
        }
    ) { innerPadding ->
        VieczNavHost(
            navController = navController,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        )
    }
}
