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
import com.viecz.vieczandroid.ui.viewmodels.PaymentUiState
import com.viecz.vieczandroid.ui.viewmodels.PaymentViewModel

@Composable
fun PaymentScreen(
    viewModel: PaymentViewModel = hiltViewModel()
) {
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
        color = MaterialTheme.colorScheme.background
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
                style = MaterialTheme.typography.headlineMedium
            )

            Spacer(modifier = Modifier.height(32.dp))

            when (uiState) {
                is PaymentUiState.Idle -> {
                    Button(
                        onClick = { viewModel.createPayment() },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Pay 2000 VND")
                    }
                }

                is PaymentUiState.Loading -> {
                    CircularProgressIndicator()
                    Text("Creating payment link...", Modifier.padding(top = 16.dp))
                }

                is PaymentUiState.Success -> {
                    Text("Opening payment page...")
                    Button(
                        onClick = { viewModel.resetState() },
                        modifier = Modifier.padding(top = 16.dp)
                    ) {
                        Text("Back")
                    }
                }

                is PaymentUiState.Error -> {
                    Text(
                        text = "Error: ${uiState.message}",
                        color = MaterialTheme.colorScheme.error
                    )
                    Button(
                        onClick = { viewModel.resetState() },
                        modifier = Modifier.padding(top = 16.dp)
                    ) {
                        Text("Try Again")
                    }
                }
            }
        }
    }
}
