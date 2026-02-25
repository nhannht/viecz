package com.viecz.vieczandroid.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.viecz.vieczandroid.ui.components.metro.MetroButton
import com.viecz.vieczandroid.ui.components.metro.MetroSpinner
import com.viecz.vieczandroid.ui.components.metro.MetroSpinnerSize
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.viewmodels.PaymentUiState
import com.viecz.vieczandroid.ui.viewmodels.PaymentViewModel

@Composable
fun PaymentScreen(
    viewModel: PaymentViewModel = hiltViewModel()
) {
    val colors = MetroTheme.colors
    val context = LocalContext.current
    val uiState = viewModel.uiState

    // Launch browser when payment link is created
    LaunchedEffect(uiState) {
        if (uiState is PaymentUiState.Success) {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uiState.checkoutUrl))
            context.startActivity(intent)
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = colors.bg
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "PayOS Payment",
                style = MaterialTheme.typography.headlineMedium,
                color = colors.fg
            )

            Spacer(modifier = Modifier.height(32.dp))

            when (uiState) {
                is PaymentUiState.Idle -> {
                    MetroButton(
                        label = "Pay 2000 VND",
                        onClick = { viewModel.createPayment() },
                        fullWidth = true,
                    )
                }

                is PaymentUiState.Loading -> {
                    MetroSpinner(size = MetroSpinnerSize.Large)
                    Text(
                        "Creating payment link...",
                        modifier = Modifier.padding(top = 16.dp),
                        color = colors.muted,
                    )
                }

                is PaymentUiState.Success -> {
                    Text("Opening payment page...", color = colors.fg)
                    Spacer(modifier = Modifier.height(16.dp))
                    MetroButton(
                        label = "Back",
                        onClick = { viewModel.resetState() },
                    )
                }

                is PaymentUiState.Error -> {
                    Text(
                        text = "Error: ${uiState.message}",
                        color = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    MetroButton(
                        label = "Try Again",
                        onClick = { viewModel.resetState() },
                    )
                }
            }
        }
    }
}
