package com.viecz.vieczandroid.ui.components.metro

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.theme.VieczTheme

/**
 * nhannht-metro-meow Button.
 *
 * Primary: solid fg background, inverts on press.
 * Secondary: text-only with ">" arrow suffix.
 */
@Composable
fun MetroButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: MetroButtonVariant = MetroButtonVariant.Primary,
    enabled: Boolean = true,
    fullWidth: Boolean = false,
    isLoading: Boolean = false,
) {
    val colors = MetroTheme.colors
    val widthMod = if (fullWidth) modifier.fillMaxWidth() else modifier
    val effectiveEnabled = enabled && !isLoading

    when (variant) {
        MetroButtonVariant.Primary -> {
            Button(
                onClick = onClick,
                enabled = effectiveEnabled,
                modifier = widthMod,
                shape = RoundedCornerShape(0.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.fg,
                    contentColor = colors.bg,
                    disabledContainerColor = colors.fg.copy(alpha = 0.4f),
                    disabledContentColor = colors.bg.copy(alpha = 0.4f),
                ),
                border = BorderStroke(1.dp, if (effectiveEnabled) colors.fg else colors.fg.copy(alpha = 0.4f)),
                elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        color = colors.bg,
                        strokeWidth = 2.dp,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        }

        MetroButtonVariant.Secondary -> {
            TextButton(
                onClick = onClick,
                enabled = effectiveEnabled,
                modifier = widthMod,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = colors.muted,
                    disabledContentColor = colors.muted.copy(alpha = 0.4f),
                ),
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = colors.muted,
                        strokeWidth = 2.dp,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    text = "$label >",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}

enum class MetroButtonVariant { Primary, Secondary }

// ── Showkase Previews ───────────────────────────────────────────────

@Preview(name = "MetroButton — Primary", group = "Metro Components")
@Composable
internal fun MetroButtonPrimaryPreview() {
    VieczTheme {
        MetroButton(label = "GET STARTED", onClick = {})
    }
}

@Preview(name = "MetroButton — Secondary", group = "Metro Components")
@Composable
internal fun MetroButtonSecondaryPreview() {
    VieczTheme {
        MetroButton(label = "Learn more", onClick = {}, variant = MetroButtonVariant.Secondary)
    }
}

@Preview(name = "MetroButton — Disabled", group = "Metro Components")
@Composable
internal fun MetroButtonDisabledPreview() {
    VieczTheme {
        MetroButton(label = "DISABLED", onClick = {}, enabled = false)
    }
}
