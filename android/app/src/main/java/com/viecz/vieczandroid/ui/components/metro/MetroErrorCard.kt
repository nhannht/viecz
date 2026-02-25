package com.viecz.vieczandroid.ui.components.metro

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.theme.VieczTheme

/**
 * nhannht-metro-meow Error Card.
 *
 * Centered error icon + message + optional retry button.
 */
@Composable
fun MetroErrorCard(
    message: String,
    modifier: Modifier = Modifier,
    onRetry: (() -> Unit)? = null,
) {
    val colors = MetroTheme.colors

    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(
                imageVector = Icons.Default.ErrorOutline,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = colors.fg.copy(alpha = 0.5f),
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = colors.fg,
            )
            if (onRetry != null) {
                Spacer(modifier = Modifier.height(8.dp))
                MetroButton(label = "Retry", onClick = onRetry)
            }
        }
    }
}

@Preview(name = "MetroErrorCard — with retry", group = "Metro Components")
@Composable
internal fun MetroErrorCardPreview() {
    VieczTheme { MetroErrorCard(message = "Something went wrong", onRetry = {}) }
}

@Preview(name = "MetroErrorCard — no retry", group = "Metro Components")
@Composable
internal fun MetroErrorCardNoRetryPreview() {
    VieczTheme { MetroErrorCard(message = "Something went wrong") }
}
