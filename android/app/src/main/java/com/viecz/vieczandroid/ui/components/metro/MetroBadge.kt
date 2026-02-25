package com.viecz.vieczandroid.ui.components.metro

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.theme.VieczTheme

/**
 * nhannht-metro-meow Badge.
 *
 * Status badges: open (solid fg), in_progress (outlined fg),
 * completed (solid muted), cancelled (outlined muted + strikethrough).
 */
@Composable
fun MetroBadge(
    label: String,
    status: MetroBadgeStatus = MetroBadgeStatus.Default,
    modifier: Modifier = Modifier,
) {
    val colors = MetroTheme.colors
    val (bg, fg, borderColor, strikethrough) = when (status) {
        MetroBadgeStatus.Open -> BadgeStyle(colors.fg, colors.bg, colors.fg, false)
        MetroBadgeStatus.InProgress -> BadgeStyle(Color.Transparent, colors.fg, colors.fg, false)
        MetroBadgeStatus.Completed -> BadgeStyle(colors.muted, colors.bg, colors.muted, false)
        MetroBadgeStatus.Cancelled -> BadgeStyle(Color.Transparent, colors.muted, colors.border, true)
        MetroBadgeStatus.Default -> BadgeStyle(Color.Transparent, colors.fg, colors.border, false)
    }

    Surface(
        modifier = modifier.border(BorderStroke(1.dp, borderColor)),
        color = bg,
    ) {
        Text(
            text = label.uppercase(),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = fg,
            textDecoration = if (strikethrough) TextDecoration.LineThrough else TextDecoration.None,
        )
    }
}

private data class BadgeStyle(
    val bg: Color,
    val fg: Color,
    val border: Color,
    val strikethrough: Boolean,
)

enum class MetroBadgeStatus { Open, InProgress, Completed, Cancelled, Default }

// ── Previews ────────────────────────────────────────────────────────

@Preview(name = "MetroBadge — Open", group = "Metro Components")
@Composable
internal fun MetroBadgeOpenPreview() {
    VieczTheme { MetroBadge(label = "OPEN", status = MetroBadgeStatus.Open) }
}

@Preview(name = "MetroBadge — In Progress", group = "Metro Components")
@Composable
internal fun MetroBadgeInProgressPreview() {
    VieczTheme { MetroBadge(label = "IN PROGRESS", status = MetroBadgeStatus.InProgress) }
}

@Preview(name = "MetroBadge — Completed", group = "Metro Components")
@Composable
internal fun MetroBadgeCompletedPreview() {
    VieczTheme { MetroBadge(label = "COMPLETED", status = MetroBadgeStatus.Completed) }
}

@Preview(name = "MetroBadge — Cancelled", group = "Metro Components")
@Composable
internal fun MetroBadgeCancelledPreview() {
    VieczTheme { MetroBadge(label = "CANCELLED", status = MetroBadgeStatus.Cancelled) }
}
