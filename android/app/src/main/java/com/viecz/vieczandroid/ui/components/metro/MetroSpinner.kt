package com.viecz.vieczandroid.ui.components.metro

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.theme.VieczTheme

/**
 * nhannht-metro-meow Spinner.
 *
 * Simple circular progress in fg color. Sizes: sm (20dp), md (32dp), lg (48dp).
 */
@Composable
fun MetroSpinner(
    modifier: Modifier = Modifier,
    size: MetroSpinnerSize = MetroSpinnerSize.Medium,
    label: String = "Loading",
) {
    val (dimension, strokeWidth) = when (size) {
        MetroSpinnerSize.Small -> 20.dp to 2.dp
        MetroSpinnerSize.Medium -> 32.dp to 3.dp
        MetroSpinnerSize.Large -> 48.dp to 4.dp
    }

    Box(
        modifier = modifier.semantics { contentDescription = label },
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(dimension),
            color = MetroTheme.colors.fg,
            trackColor = MetroTheme.colors.border,
            strokeWidth = strokeWidth,
        )
    }
}

enum class MetroSpinnerSize { Small, Medium, Large }

@Preview(name = "MetroSpinner — Small", group = "Metro Components")
@Composable
internal fun MetroSpinnerSmallPreview() {
    VieczTheme { MetroSpinner(size = MetroSpinnerSize.Small) }
}

@Preview(name = "MetroSpinner — Medium", group = "Metro Components")
@Composable
internal fun MetroSpinnerMediumPreview() {
    VieczTheme { MetroSpinner() }
}

@Preview(name = "MetroSpinner — Large", group = "Metro Components")
@Composable
internal fun MetroSpinnerLargePreview() {
    VieczTheme { MetroSpinner(size = MetroSpinnerSize.Large) }
}
