package com.viecz.vieczandroid.ui.components.metro

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.theme.VieczTheme

data class MetroSelectOption(val value: String, val label: String)

/**
 * nhannht-metro-meow Select.
 *
 * Dropdown select with square border. Same visual style as MetroInput.
 */
@Composable
fun MetroSelect(
    selected: String,
    onSelected: (String) -> Unit,
    options: List<MetroSelectOption>,
    modifier: Modifier = Modifier,
    label: String = "",
    placeholder: String = "",
    error: String = "",
    enabled: Boolean = true,
) {
    val colors = MetroTheme.colors
    val isError = error.isNotEmpty()
    val errorColor = Color(0xFFDC2626)
    var expanded by remember { mutableStateOf(false) }

    val selectedLabel = options.find { it.value == selected }?.label ?: ""

    Column(modifier = modifier.fillMaxWidth()) {
        if (label.isNotEmpty()) {
            Text(
                text = label,
                style = MaterialTheme.typography.titleSmall,
                color = colors.fg,
            )
            Spacer(modifier = Modifier.height(4.dp))
        }

        Box {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(
                        BorderStroke(1.dp, if (isError) errorColor else colors.border)
                    )
                    .background(colors.card)
                    .clickable(enabled = enabled) { expanded = true }
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = selectedLabel.ifEmpty { placeholder },
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (selectedLabel.isEmpty()) colors.muted else colors.fg,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    imageVector = Icons.Default.ArrowDropDown,
                    contentDescription = null,
                    tint = colors.muted,
                )
            }

            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
            ) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                text = option.label,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        },
                        onClick = {
                            onSelected(option.value)
                            expanded = false
                        },
                    )
                }
            }
        }

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

@Preview(name = "MetroSelect — Default", group = "Metro Components")
@Composable
internal fun MetroSelectPreview() {
    VieczTheme {
        MetroSelect(
            selected = "",
            onSelected = {},
            options = listOf(
                MetroSelectOption("1", "Cleaning"),
                MetroSelectOption("2", "Delivery"),
                MetroSelectOption("3", "Tutoring"),
            ),
            label = "CATEGORY",
            placeholder = "Select a category",
        )
    }
}
