package com.viecz.vieczandroid.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.viecz.vieczandroid.ui.viewmodels.AuthState
import com.viecz.vieczandroid.ui.viewmodels.AuthViewModel

@Composable
fun LoginScreen(
    onNavigateToRegister: () -> Unit,
    onLoginSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val authState by viewModel.authState.collectAsStateWithLifecycle()

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
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "Welcome Back",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Login to your account",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(48.dp))

            // Email field
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
                enabled = authState !is AuthState.Loading
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Password field
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                            contentDescription = if (passwordVisible) "Hide password" else "Show password"
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = authState !is AuthState.Loading
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
            Button(
                onClick = {
                    viewModel.login(email, password)
                },
                enabled = email.isNotBlank() &&
                         password.isNotBlank() &&
                         authState !is AuthState.Loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                if (authState is AuthState.Loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text("Login")
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Navigate to register
            TextButton(
                onClick = onNavigateToRegister,
                enabled = authState !is AuthState.Loading
            ) {
                Text("Don't have an account? Register")
            }
        }
    }
}
