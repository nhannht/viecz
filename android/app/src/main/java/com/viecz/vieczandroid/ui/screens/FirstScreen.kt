package com.viecz.vieczandroid.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.viecz.vieczandroid.ui.components.metro.MetroButton
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.theme.VieczTheme

@Composable
fun FirstScreen(
    onNextClick: () -> Unit,
    onPaymentClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val colors = MetroTheme.colors

    Surface(
        modifier = modifier.fillMaxSize(),
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
                text = "First Screen",
                style = MaterialTheme.typography.headlineMedium,
                color = colors.fg
            )

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = "This is the first screen built with Jetpack Compose and Material 3",
                style = MaterialTheme.typography.bodyLarge,
                color = colors.muted
            )

            Spacer(modifier = Modifier.height(48.dp))

            MetroButton(
                label = "Make Payment (2000 VND)",
                onClick = onPaymentClick,
                fullWidth = true,
            )

            Spacer(modifier = Modifier.height(16.dp))

            MetroButton(
                label = "Next",
                onClick = onNextClick,
                fullWidth = true,
            )
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
