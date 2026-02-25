package com.viecz.vieczandroid.ui.components.metro

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.theme.VieczTheme

/**
 * nhannht-metro-meow Card.
 *
 * White background, 1px border, no elevation, no radius (from theme).
 * Featured variant uses fg border color.
 */
@Composable
fun MetroCard(
    modifier: Modifier = Modifier,
    featured: Boolean = false,
    onClick: (() -> Unit)? = null,
    contentPadding: PaddingValues = PaddingValues(24.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = MetroTheme.colors
    val borderColor = if (featured) colors.fg else colors.border

    if (onClick != null) {
        OutlinedCard(
            onClick = onClick,
            modifier = modifier.fillMaxWidth(),
            shape = RoundedCornerShape(0.dp),
            colors = CardDefaults.outlinedCardColors(
                containerColor = colors.card,
            ),
            border = BorderStroke(1.dp, borderColor),
            elevation = CardDefaults.outlinedCardElevation(0.dp),
        ) {
            Column(modifier = Modifier.padding(contentPadding)) {
                content()
            }
        }
    } else {
        OutlinedCard(
            modifier = modifier.fillMaxWidth(),
            shape = RoundedCornerShape(0.dp),
            colors = CardDefaults.outlinedCardColors(
                containerColor = colors.card,
            ),
            border = BorderStroke(1.dp, borderColor),
            elevation = CardDefaults.outlinedCardElevation(0.dp),
        ) {
            Column(modifier = Modifier.padding(contentPadding)) {
                content()
            }
        }
    }
}

// ── Previews ────────────────────────────────────────────────────────

@Preview(name = "MetroCard — Default", group = "Metro Components")
@Composable
internal fun MetroCardDefaultPreview() {
    VieczTheme {
        MetroCard {
            Text("Card content", style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Preview(name = "MetroCard — Featured", group = "Metro Components")
@Composable
internal fun MetroCardFeaturedPreview() {
    VieczTheme {
        MetroCard(featured = true) {
            Text("Featured card", style = MaterialTheme.typography.titleLarge)
        }
    }
}
