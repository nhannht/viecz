package com.viecz.vieczandroid.ui.screens

import android.app.Activity
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.viecz.vieczandroid.ui.components.metro.MetroButton
import com.viecz.vieczandroid.ui.components.metro.MetroButtonVariant
import com.viecz.vieczandroid.ui.components.metro.MetroInput
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.viewmodels.AuthState
import com.viecz.vieczandroid.ui.viewmodels.AuthViewModel

@Composable
fun LoginScreen(
    onNavigateToRegister: () -> Unit,
    onLoginSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val colors = MetroTheme.colors
    val authState by viewModel.authState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    // Handle auth state changes
    LaunchedEffect(authState) {
        if (authState is AuthState.Success) {
            onLoginSuccess()
        }
    }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "Welcome Back",
                style = MaterialTheme.typography.headlineMedium,
                color = colors.fg
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Sign in to your account",
                style = MaterialTheme.typography.bodyLarge,
                color = colors.muted
            )

            Spacer(modifier = Modifier.height(48.dp))

            // Email field
            MetroInput(
                value = email,
                onValueChange = { email = it },
                label = "EMAIL",
                placeholder = "your@email.com",
                keyboardType = KeyboardType.Email,
                enabled = authState !is AuthState.Loading,
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Password field
            MetroInput(
                value = password,
                onValueChange = { password = it },
                label = "PASSWORD",
                isPassword = !passwordVisible,
                keyboardType = KeyboardType.Password,
                enabled = authState !is AuthState.Loading,
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                            contentDescription = if (passwordVisible) "Hide password" else "Show password",
                            tint = colors.muted,
                        )
                    }
                },
            )

            // Show error if login failed
            if (authState is AuthState.Error) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = (authState as AuthState.Error).message,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Login button
            MetroButton(
                label = "SIGN IN",
                onClick = { viewModel.login(email, password) },
                enabled = email.isNotBlank() &&
                         password.isNotBlank() &&
                         authState !is AuthState.Loading,
                fullWidth = true,
                isLoading = authState is AuthState.Loading,
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Navigate to register
            MetroButton(
                label = "Don't have an account? Create Account",
                onClick = onNavigateToRegister,
                variant = MetroButtonVariant.Secondary,
                enabled = authState !is AuthState.Loading,
            )
        }
    }
}
