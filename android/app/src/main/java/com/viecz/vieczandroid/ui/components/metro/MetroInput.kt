package com.viecz.vieczandroid.ui.components.metro

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.theme.VieczTheme

/**
 * nhannht-metro-meow Input.
 *
 * Square outlined text field. Label above (display font 10sp).
 * Border: border color → fg on focus. Red on error.
 */
@Composable
fun MetroInput(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String = "",
    placeholder: String = "",
    error: String = "",
    enabled: Boolean = true,
    keyboardType: KeyboardType = KeyboardType.Text,
    isPassword: Boolean = false,
    singleLine: Boolean = true,
    leadingIcon: @Composable (() -> Unit)? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    prefix: @Composable (() -> Unit)? = null,
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
            modifier = Modifier.fillMaxWidth(),
            enabled = enabled,
            singleLine = singleLine,
            isError = isError,
            shape = RoundedCornerShape(0.dp),
            placeholder = if (placeholder.isNotEmpty()) {
                { Text(placeholder, style = MaterialTheme.typography.bodyMedium, color = colors.muted) }
            } else null,
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = colors.fg),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
            leadingIcon = leadingIcon,
            trailingIcon = trailingIcon,
            prefix = prefix,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = if (isError) errorColor else colors.fg,
                unfocusedBorderColor = if (isError) errorColor else colors.border,
                cursorColor = colors.fg,
                focusedContainerColor = colors.card,
                unfocusedContainerColor = colors.card,
                disabledContainerColor = colors.card.copy(alpha = 0.5f),
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

// ── Previews ────────────────────────────────────────────────────────

@Preview(name = "MetroInput — Default", group = "Metro Components")
@Composable
internal fun MetroInputDefaultPreview() {
    VieczTheme {
        MetroInput(value = "", onValueChange = {}, label = "EMAIL", placeholder = "your@email.com")
    }
}

@Preview(name = "MetroInput — With Error", group = "Metro Components")
@Composable
internal fun MetroInputErrorPreview() {
    VieczTheme {
        MetroInput(value = "bad", onValueChange = {}, label = "EMAIL", error = "Invalid email address")
    }
}

@Preview(name = "MetroInput — Password", group = "Metro Components")
@Composable
internal fun MetroInputPasswordPreview() {
    VieczTheme {
        MetroInput(value = "secret", onValueChange = {}, label = "PASSWORD", isPassword = true)
    }
}
