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
fun SecondScreen(
    onPreviousClick: () -> Unit,
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
                text = "Second Screen",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = "Welcome to the second screen! Material 3 provides beautiful, adaptive design.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(48.dp))

            Button(
                onClick = onPreviousClick,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Previous")
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun SecondScreenPreview() {
    VieczTheme {
        SecondScreen(onPreviousClick = {})
    }
}
