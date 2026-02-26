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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.theme.VieczTheme

data class MetroSelectOption(
    val value: String,
    val label: String,
    val supportingText: String = "",
    val imageUrl: String = "",
)

/**
 * nhannht-metro-meow Select.
 *
 * Tapping the field opens a bottom sheet with search and scrollable list.
 * For short lists (<8 items), searchable = false hides the search bar.
 */
@OptIn(ExperimentalMaterial3Api::class)
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
    searchable: Boolean = options.size > 7,
) {
    val colors = MetroTheme.colors
    val isError = error.isNotEmpty()
    val errorColor = Color(0xFFDC2626)
    var showSheet by remember { mutableStateOf(false) }

    val selectedOption = options.find { it.value == selected }
    val selectedLabel = selectedOption?.label.orEmpty()
    val selectedSupportingText = selectedOption?.supportingText.orEmpty()

    Column(modifier = modifier.fillMaxWidth()) {
        if (label.isNotEmpty()) {
            Text(
                text = label,
                style = MaterialTheme.typography.titleSmall,
                color = colors.fg,
            )
            Spacer(modifier = Modifier.height(4.dp))
        }

        // Trigger field
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .border(
                    BorderStroke(1.dp, if (isError) errorColor else colors.border)
                )
                .background(colors.card)
                .clickable(enabled = enabled) { showSheet = true }
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (selectedOption?.imageUrl?.isNotBlank() == true) {
                AsyncImage(
                    model = selectedOption.imageUrl,
                    contentDescription = "${selectedOption.label} logo",
                    modifier = Modifier.size(20.dp),
                    contentScale = ContentScale.Fit,
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = selectedLabel.ifEmpty { placeholder },
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (selectedLabel.isEmpty()) colors.muted else colors.fg,
                )
                if (selectedLabel.isNotEmpty() && selectedSupportingText.isNotEmpty()) {
                    Text(
                        text = selectedSupportingText,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.muted,
                    )
                }
            }
            Icon(
                imageVector = Icons.Default.ArrowDropDown,
                contentDescription = null,
                tint = colors.muted,
            )
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

    // Bottom sheet picker
    if (showSheet) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false)

        ModalBottomSheet(
            onDismissRequest = { showSheet = false },
            sheetState = sheetState,
            containerColor = colors.card,
            dragHandle = {
                // Drag indicator
                Box(
                    modifier = Modifier
                        .padding(top = 12.dp, bottom = 8.dp)
                        .size(width = 32.dp, height = 4.dp)
                        .background(colors.border, RoundedCornerShape(2.dp))
                )
            },
        ) {
            BottomSheetContent(
                options = options,
                selected = selected,
                searchable = searchable,
                title = label.ifEmpty { placeholder },
                onSelected = { value ->
                    onSelected(value)
                    showSheet = false
                },
                onDismiss = { showSheet = false },
            )
        }
    }
}

@Composable
private fun BottomSheetContent(
    options: List<MetroSelectOption>,
    selected: String,
    searchable: Boolean,
    title: String,
    onSelected: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = MetroTheme.colors
    var query by remember { mutableStateOf("") }

    val filtered = remember(query, options) {
        if (query.isBlank()) options
        else {
            val q = query.lowercase()
            options.filter {
                it.label.lowercase().contains(q) ||
                    it.supportingText.lowercase().contains(q) ||
                    it.value.lowercase().contains(q)
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 24.dp)
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = colors.fg,
                modifier = Modifier.weight(1f),
            )
            IconButton(onClick = onDismiss) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Close",
                    tint = colors.muted,
                )
            }
        }

        // Search bar
        if (searchable) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .border(BorderStroke(1.dp, colors.border), RoundedCornerShape(8.dp))
                    .background(colors.bg, RoundedCornerShape(8.dp))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = null,
                    tint = colors.muted,
                    modifier = Modifier.size(20.dp),
                )
                Spacer(modifier = Modifier.width(8.dp))
                androidx.compose.foundation.text.BasicTextField(
                    value = query,
                    onValueChange = { query = it },
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = colors.fg),
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                    decorationBox = { inner ->
                        if (query.isEmpty()) {
                            Text(
                                text = "Search...",
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.muted,
                            )
                        }
                        inner()
                    },
                )
                if (query.isNotEmpty()) {
                    IconButton(
                        onClick = { query = "" },
                        modifier = Modifier.size(20.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Clear",
                            tint = colors.muted,
                            modifier = Modifier.size(16.dp),
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // Options list
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 400.dp),
        ) {
            items(filtered, key = { it.value }) { option ->
                val isSelected = option.value == selected
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelected(option.value) }
                        .background(if (isSelected) colors.fg.copy(alpha = 0.06f) else Color.Transparent)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (option.imageUrl.isNotBlank()) {
                        AsyncImage(
                            model = option.imageUrl,
                            contentDescription = "${option.label} logo",
                            modifier = Modifier.size(28.dp),
                            contentScale = ContentScale.Fit,
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = option.label,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                            color = colors.fg,
                        )
                        if (option.supportingText.isNotEmpty()) {
                            Text(
                                text = option.supportingText,
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.muted,
                            )
                        }
                    }
                    if (isSelected) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Selected",
                            tint = colors.fg,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }
                HorizontalDivider(color = colors.border.copy(alpha = 0.3f))
            }

            if (filtered.isEmpty()) {
                item {
                    Text(
                        text = "No results",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.muted,
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }
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
