package com.viecz.vieczandroid.ui.screens

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
fun RegisterScreen(
    onNavigateToLogin: () -> Unit,
    onRegisterSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val colors = MetroTheme.colors
    val authState by viewModel.authState.collectAsStateWithLifecycle()

    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }

    // Handle auth state changes
    LaunchedEffect(authState) {
        if (authState is AuthState.Success) {
            onRegisterSuccess()
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
                text = "Create Account",
                style = MaterialTheme.typography.headlineMedium,
                color = colors.fg
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Name field
            MetroInput(
                value = name,
                onValueChange = { name = it },
                label = "FULL NAME",
                placeholder = "John Doe",
                enabled = authState !is AuthState.Loading,
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Email field
            MetroInput(
                value = email,
                onValueChange = {
                    email = it
                    emailError = if (!isValidEmail(it) && it.isNotEmpty()) {
                        "Invalid email format"
                    } else null
                },
                label = "EMAIL",
                placeholder = "your@email.com",
                keyboardType = KeyboardType.Email,
                error = emailError ?: "",
                enabled = authState !is AuthState.Loading,
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Password field
            MetroInput(
                value = password,
                onValueChange = {
                    password = it
                    passwordError = when {
                        it.isEmpty() -> null
                        it.length < 8 -> "Password must be at least 8 characters"
                        !it.any { c -> c.isUpperCase() } -> "Must contain uppercase letter"
                        !it.any { c -> c.isLowerCase() } -> "Must contain lowercase letter"
                        !it.any { c -> c.isDigit() } -> "Must contain number"
                        else -> null
                    }
                },
                label = "PASSWORD",
                isPassword = !passwordVisible,
                keyboardType = KeyboardType.Password,
                error = passwordError ?: if (password.isEmpty()) "Min 8 characters, 1 uppercase, 1 lowercase, 1 digit" else "",
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

            // Show error if registration failed
            if (authState is AuthState.Error) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = (authState as AuthState.Error).message,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Register button
            MetroButton(
                label = "CREATE ACCOUNT",
                onClick = {
                    if (emailError == null && passwordError == null) {
                        viewModel.register(email, password, name)
                    }
                },
                enabled = email.isNotBlank() &&
                         password.isNotBlank() &&
                         name.isNotBlank() &&
                         emailError == null &&
                         passwordError == null &&
                         authState !is AuthState.Loading,
                fullWidth = true,
                isLoading = authState is AuthState.Loading,
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Navigate to login
            MetroButton(
                label = "Already have an account? Sign In",
                onClick = onNavigateToLogin,
                variant = MetroButtonVariant.Secondary,
                enabled = authState !is AuthState.Loading,
            )
        }
    }
}

/**
 * Simple email validation
 */
private fun isValidEmail(email: String): Boolean {
    return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
}
