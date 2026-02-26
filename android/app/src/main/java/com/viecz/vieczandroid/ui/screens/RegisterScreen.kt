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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.viecz.vieczandroid.R
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

    // Pre-resolve strings for use in non-composable lambdas
    val emailInvalidStr = stringResource(R.string.register_email_invalid)
    val passwordMinLengthStr = stringResource(R.string.register_password_min_length)
    val passwordUppercaseStr = stringResource(R.string.register_password_uppercase)
    val passwordLowercaseStr = stringResource(R.string.register_password_lowercase)
    val passwordDigitStr = stringResource(R.string.register_password_digit)

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
                text = stringResource(R.string.register_title),
                style = MaterialTheme.typography.headlineMedium,
                color = colors.fg
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Name field
            MetroInput(
                value = name,
                onValueChange = { name = it },
                label = stringResource(R.string.register_name_label),
                placeholder = stringResource(R.string.register_name_placeholder),
                enabled = authState !is AuthState.Loading,
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Email field
            MetroInput(
                value = email,
                onValueChange = {
                    email = it
                    emailError = if (!isValidEmail(it) && it.isNotEmpty()) {
                        emailInvalidStr
                    } else null
                },
                label = stringResource(R.string.register_email_label),
                placeholder = stringResource(R.string.register_email_placeholder),
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
                        it.length < 8 -> passwordMinLengthStr
                        !it.any { c -> c.isUpperCase() } -> passwordUppercaseStr
                        !it.any { c -> c.isLowerCase() } -> passwordLowercaseStr
                        !it.any { c -> c.isDigit() } -> passwordDigitStr
                        else -> null
                    }
                },
                label = stringResource(R.string.register_password_label),
                isPassword = !passwordVisible,
                keyboardType = KeyboardType.Password,
                error = passwordError ?: if (password.isEmpty()) stringResource(R.string.register_password_hint) else "",
                enabled = authState !is AuthState.Loading,
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                            contentDescription = if (passwordVisible) stringResource(R.string.register_hide_password) else stringResource(R.string.register_show_password),
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
                label = stringResource(R.string.register_button),
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
                label = stringResource(R.string.register_have_account),
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
