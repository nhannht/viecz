package com.viecz.vieczandroid.ui.components.metro

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.theme.VieczTheme

/**
 * nhannht-metro-meow Textarea.
 *
 * Multi-line input. Same styling as MetroInput but taller, min 100dp.
 */
@Composable
fun MetroTextarea(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String = "",
    placeholder: String = "",
    error: String = "",
    enabled: Boolean = true,
    minLines: Int = 4,
) {
    val colors = MetroTheme.colors
    val isError = error.isNotEmpty()
    val errorColor = Color(0xFFDC2626)

    Column(modifier = modifier.fillMaxWidth()) {
        if (label.isNotEmpty()) {
            Text(
                text = label,
                style = MaterialTheme.typography.titleSmall,
                color = colors.fg,
            )
            Spacer(modifier = Modifier.height(4.dp))
        }

        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 100.dp),
            enabled = enabled,
            singleLine = false,
            minLines = minLines,
            isError = isError,
            shape = RoundedCornerShape(0.dp),
            placeholder = if (placeholder.isNotEmpty()) {
                { Text(placeholder, style = MaterialTheme.typography.bodyMedium, color = colors.muted) }
            } else null,
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = colors.fg),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = if (isError) errorColor else colors.fg,
                unfocusedBorderColor = if (isError) errorColor else colors.border,
                cursorColor = colors.fg,
                focusedContainerColor = colors.card,
                unfocusedContainerColor = colors.card,
            ),
        )

        if (isError) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = error,
                style = MaterialTheme.typography.bodySmall,
                color = errorColor,
            )
        }
    }
}

@Preview(name = "MetroTextarea — Default", group = "Metro Components")
@Composable
internal fun MetroTextareaPreview() {
    VieczTheme {
        MetroTextarea(value = "", onValueChange = {}, label = "DESCRIPTION", placeholder = "Describe the task...")
    }
}
