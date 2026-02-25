package com.viecz.vieczandroid.ui.components.metro

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.theme.VieczTheme

data class MetroTab(val value: String, val label: String)

/**
 * nhannht-metro-meow Tabs.
 *
 * Horizontal tab row. Active tab: fg text + 2dp fg underline.
 * Inactive: muted text. No background.
 */
@Composable
fun MetroTabs(
    tabs: List<MetroTab>,
    activeTab: String,
    onTabChanged: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = MetroTheme.colors
    val selectedIndex = tabs.indexOfFirst { it.value == activeTab }.coerceAtLeast(0)

    Column(modifier = modifier.fillMaxWidth()) {
        ScrollableTabRow(
            selectedTabIndex = selectedIndex,
            containerColor = colors.bg,
            contentColor = colors.fg,
            edgePadding = 0.dp,
            indicator = { tabPositions ->
                if (selectedIndex < tabPositions.size) {
                    TabRowDefaults.SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[selectedIndex]),
                        height = 2.dp,
                        color = colors.fg,
                    )
                }
            },
            divider = { HorizontalDivider(thickness = 1.dp, color = colors.border) },
        ) {
            tabs.forEachIndexed { index, tab ->
                Tab(
                    selected = index == selectedIndex,
                    onClick = { onTabChanged(tab.value) },
                    text = {
                        Text(
                            text = tab.label,
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (index == selectedIndex) colors.fg else colors.muted,
                        )
                    },
                )
            }
        }
    }
}

@Preview(name = "MetroTabs — Default", group = "Metro Components")
@Composable
internal fun MetroTabsPreview() {
    VieczTheme {
        MetroTabs(
            tabs = listOf(
                MetroTab("posted", "POSTED"),
                MetroTab("applied", "APPLIED"),
                MetroTab("completed", "COMPLETED"),
            ),
            activeTab = "posted",
            onTabChanged = {},
        )
    }
}
