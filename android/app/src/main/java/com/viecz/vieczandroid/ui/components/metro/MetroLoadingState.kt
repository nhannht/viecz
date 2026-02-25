package com.viecz.vieczandroid.ui.components.metro

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.viecz.vieczandroid.ui.theme.VieczTheme

/**
 * nhannht-metro-meow Loading State.
 *
 * Full-size centered spinner — replaces the common
 * `Box(fillMaxSize, center) { CircularProgressIndicator() }` pattern.
 */
@Composable
fun MetroLoadingState(
    modifier: Modifier = Modifier,
    label: String = "Loading",
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        MetroSpinner(size = MetroSpinnerSize.Large, label = label)
    }
}

@Preview(name = "MetroLoadingState", group = "Metro Components")
@Composable
internal fun MetroLoadingStatePreview() {
    VieczTheme { MetroLoadingState() }
}
