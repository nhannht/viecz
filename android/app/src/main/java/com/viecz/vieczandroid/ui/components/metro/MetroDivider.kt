package com.viecz.vieczandroid.ui.components.metro

import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.theme.VieczTheme

/**
 * nhannht-metro-meow Divider.
 *
 * 1px horizontal line in border color.
 */
@Composable
fun MetroDivider(modifier: Modifier = Modifier) {
    HorizontalDivider(
        modifier = modifier,
        thickness = 1.dp,
        color = MetroTheme.colors.border,
    )
}

@Preview(name = "MetroDivider", group = "Metro Components")
@Composable
internal fun MetroDividerPreview() {
    VieczTheme {
        MetroDivider()
    }
}
