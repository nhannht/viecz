package com.viecz.vieczandroid.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.viecz.vieczandroid.ui.theme.VieczTheme

@Composable
fun FirstScreen(
    onNextClick: () -> Unit,
    onPaymentClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxSize(),
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
                text = "First Screen",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = "This is the first screen built with Jetpack Compose and Material 3",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(48.dp))

            Button(
                onClick = onPaymentClick,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Make Payment (2000 VND)")
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = onNextClick,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Next")
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun FirstScreenPreview() {
    VieczTheme {
        FirstScreen(onNextClick = {})
    }
}
