package com.viecz.vieczandroid.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.viecz.vieczandroid.ui.viewmodels.AuthViewModel

@Composable
fun SplashScreen(
    onNavigateToLogin: () -> Unit,
    onNavigateToHome: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val isLoggedIn by viewModel.isLoggedIn.collectAsStateWithLifecycle(initialValue = false)

    // Check login status and navigate
    LaunchedEffect(isLoggedIn) {
        // Small delay for splash effect
        kotlinx.coroutines.delay(1000)

        if (isLoggedIn) {
            onNavigateToHome()
        } else {
            onNavigateToLogin()
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "MiniJob",
                style = MaterialTheme.typography.displayMedium,
                color = MaterialTheme.colorScheme.primary
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Dịch Vụ Nhỏ Cho Sinh Viên",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(32.dp))

            CircularProgressIndicator()
        }
    }
}
