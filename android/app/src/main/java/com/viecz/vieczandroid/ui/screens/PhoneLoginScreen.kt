package com.viecz.vieczandroid.ui.screens

import android.app.Activity
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
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
import com.viecz.vieczandroid.ui.viewmodels.PhoneAuthState
import com.viecz.vieczandroid.ui.viewmodels.PhoneAuthStep
import com.viecz.vieczandroid.ui.viewmodels.PhoneLoginViewModel

@Composable
fun PhoneLoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToEmailLogin: () -> Unit,
    viewModel: PhoneLoginViewModel = hiltViewModel()
) {
    val colors = MetroTheme.colors
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val activity = context as Activity

    var phoneNumber by remember { mutableStateOf("") }
    var otpCode by remember { mutableStateOf("") }

    // Navigate on success
    LaunchedEffect(state) {
        if (state is PhoneAuthState.Success) {
            onLoginSuccess()
        }
    }

    val showCodeInput = state is PhoneAuthState.CodeSent
            || state is PhoneAuthState.VerifyingCode
            || (state is PhoneAuthState.Error && (state as PhoneAuthState.Error).step == PhoneAuthStep.CODE_INPUT)

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
                text = "Sign In",
                style = MaterialTheme.typography.headlineMedium,
                color = colors.fg
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Enter your phone number to continue",
                style = MaterialTheme.typography.bodyLarge,
                color = colors.muted
            )

            Spacer(modifier = Modifier.height(48.dp))

            if (!showCodeInput) {
                // Step 1: Phone number input
                PhoneInputStep(
                    phoneNumber = phoneNumber,
                    onPhoneChange = { phoneNumber = it },
                    onContinue = { viewModel.sendCode(phoneNumber, activity) },
                    isLoading = state is PhoneAuthState.SendingCode,
                    errorMessage = if (state is PhoneAuthState.Error && (state as PhoneAuthState.Error).step == PhoneAuthStep.PHONE_INPUT) {
                        (state as PhoneAuthState.Error).message
                    } else null
                )
            } else {
                // Step 2: OTP code input
                CodeInputStep(
                    normalizedPhone = viewModel.getNormalizedPhone(),
                    otpCode = otpCode,
                    onCodeChange = { otpCode = it },
                    onVerify = { viewModel.verifyCode(otpCode) },
                    onResend = { viewModel.resendCode(activity) },
                    onBack = {
                        otpCode = ""
                        viewModel.resetState()
                    },
                    isLoading = state is PhoneAuthState.VerifyingCode,
                    errorMessage = if (state is PhoneAuthState.Error && (state as PhoneAuthState.Error).step == PhoneAuthStep.CODE_INPUT) {
                        (state as PhoneAuthState.Error).message
                    } else null
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            MetroButton(
                label = "Sign in with email",
                onClick = onNavigateToEmailLogin,
                variant = MetroButtonVariant.Secondary,
                enabled = state !is PhoneAuthState.SendingCode && state !is PhoneAuthState.VerifyingCode,
            )
        }
    }
}

@Composable
private fun PhoneInputStep(
    phoneNumber: String,
    onPhoneChange: (String) -> Unit,
    onContinue: () -> Unit,
    isLoading: Boolean,
    errorMessage: String?
) {
    MetroInput(
        value = phoneNumber,
        onValueChange = onPhoneChange,
        label = "PHONE NUMBER",
        placeholder = "0371234567",
        keyboardType = KeyboardType.Phone,
        enabled = !isLoading,
    )

    if (errorMessage != null) {
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = errorMessage,
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodySmall
        )
    }

    Spacer(modifier = Modifier.height(32.dp))

    MetroButton(
        label = "CONTINUE",
        onClick = onContinue,
        enabled = phoneNumber.isNotBlank() && !isLoading,
        fullWidth = true,
        isLoading = isLoading,
    )
}

@Composable
private fun CodeInputStep(
    normalizedPhone: String,
    otpCode: String,
    onCodeChange: (String) -> Unit,
    onVerify: () -> Unit,
    onResend: () -> Unit,
    onBack: () -> Unit,
    isLoading: Boolean,
    errorMessage: String?
) {
    val colors = MetroTheme.colors

    Text(
        text = "Code sent to $normalizedPhone",
        style = MaterialTheme.typography.bodyMedium,
        color = colors.muted
    )

    Spacer(modifier = Modifier.height(24.dp))

    MetroInput(
        value = otpCode,
        onValueChange = onCodeChange,
        label = "VERIFICATION CODE",
        placeholder = "123456",
        keyboardType = KeyboardType.Number,
        enabled = !isLoading,
    )

    if (errorMessage != null) {
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = errorMessage,
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodySmall
        )
    }

    Spacer(modifier = Modifier.height(32.dp))

    MetroButton(
        label = "SIGN IN",
        onClick = onVerify,
        enabled = otpCode.length >= 6 && !isLoading,
        fullWidth = true,
        isLoading = isLoading,
    )

    Spacer(modifier = Modifier.height(16.dp))

    MetroButton(
        label = "Resend code",
        onClick = onResend,
        variant = MetroButtonVariant.Secondary,
        enabled = !isLoading,
    )

    Spacer(modifier = Modifier.height(8.dp))

    MetroButton(
        label = "Change phone number",
        onClick = onBack,
        variant = MetroButtonVariant.Secondary,
        enabled = !isLoading,
    )
}
