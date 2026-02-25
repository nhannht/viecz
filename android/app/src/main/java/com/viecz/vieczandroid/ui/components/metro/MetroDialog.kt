package com.viecz.vieczandroid.ui.components.metro

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.theme.VieczTheme

/**
 * nhannht-metro-meow Dialog.
 *
 * Modal with backdrop. White card, 1px border, confirm/cancel buttons.
 */
@Composable
fun MetroDialog(
    open: Boolean,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    title: String = "",
    confirmLabel: String = "Confirm",
    cancelLabel: String = "Cancel",
    onConfirm: () -> Unit = {},
    onCancel: () -> Unit = onDismiss,
    content: @Composable () -> Unit,
) {
    if (!open) return

    val colors = MetroTheme.colors

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                modifier = modifier
                    .widthIn(max = 480.dp)
                    .fillMaxWidth()
                    .background(colors.card)
                    .border(1.dp, colors.border)
                    .padding(24.dp),
            ) {
                if (title.isNotEmpty()) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleLarge,
                        color = colors.fg,
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                }

                Box(modifier = Modifier.padding(bottom = 24.dp)) {
                    content()
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                ) {
                    if (cancelLabel.isNotEmpty()) {
                        MetroButton(
                            label = cancelLabel,
                            onClick = onCancel,
                            variant = MetroButtonVariant.Secondary,
                        )
                    }
                    if (confirmLabel.isNotEmpty()) {
                        MetroButton(
                            label = confirmLabel,
                            onClick = onConfirm,
                        )
                    }
                }
            }
        }
    }
}

@Preview(name = "MetroDialog — Open", group = "Metro Components")
@Composable
internal fun MetroDialogPreview() {
    // Render dialog content inline (no Dialog wrapper) to avoid blocking Showkase UI
    VieczTheme {
        val colors = MetroTheme.colors
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.card)
                .border(1.dp, colors.border)
                .padding(24.dp),
        ) {
            Text(
                text = "CANCEL TASK",
                style = MaterialTheme.typography.titleLarge,
                color = colors.fg,
            )
            Spacer(modifier = Modifier.height(16.dp))
            Box(modifier = Modifier.padding(bottom = 24.dp)) {
                Text(
                    "Are you sure you want to cancel this task?",
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.muted,
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                MetroButton(
                    label = "No, keep it",
                    onClick = {},
                    variant = MetroButtonVariant.Secondary,
                )
                MetroButton(
                    label = "YES, CANCEL",
                    onClick = {},
                )
            }
        }
    }
}
