package com.viecz.vieczandroid.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.viecz.vieczandroid.R
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.data.models.computeIsOverdue
import com.viecz.vieczandroid.ui.components.metro.MetroBadge
import com.viecz.vieczandroid.ui.components.metro.MetroBadgeStatus
import com.viecz.vieczandroid.ui.components.metro.MetroCard
import com.viecz.vieczandroid.ui.theme.MetroTheme
import java.text.NumberFormat
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.*

@Composable
fun TaskCard(
    task: Task,
    isOwnTask: Boolean = false,
    onClick: () -> Unit
) {
    val colors = MetroTheme.colors

    MetroCard(
        onClick = onClick,
        contentPadding = PaddingValues(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = colors.fg,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = task.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.muted,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                MetroBadge(
                    label = task.status.name.replace("_", " "),
                    status = when (task.status.name.uppercase()) {
                        "OPEN" -> MetroBadgeStatus.Open
                        "IN_PROGRESS" -> MetroBadgeStatus.InProgress
                        "COMPLETED" -> MetroBadgeStatus.Completed
                        "CANCELLED" -> MetroBadgeStatus.Cancelled
                        else -> MetroBadgeStatus.Default
                    },
                )
                if (isOwnTask) {
                    MetroBadge(label = stringResource(R.string.task_card_your_task))
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = colors.muted
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = task.location,
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.muted
                )
            }

            Text(
                text = formatPrice(task.price),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = colors.fg
            )
        }

        // Deadline row
        if (task.deadline != null) {
            Spacer(modifier = Modifier.height(4.dp))
            val overdue = task.computeIsOverdue()
            val formattedDeadline = try {
                val instant = Instant.parse(task.deadline)
                instant.atZone(ZoneId.systemDefault())
                    .format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
            } catch (_: Exception) {
                task.deadline
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.DateRange,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = if (overdue) MaterialTheme.colorScheme.error else colors.muted
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = formattedDeadline,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (overdue) MaterialTheme.colorScheme.error else colors.muted
                )
                if (overdue) {
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = stringResource(R.string.task_card_overdue),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.error,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun TaskStatusBadge(status: String) {
    MetroBadge(
        label = status,
        status = when (status.uppercase()) {
            "OPEN" -> MetroBadgeStatus.Open
            "IN_PROGRESS" -> MetroBadgeStatus.InProgress
            "COMPLETED" -> MetroBadgeStatus.Completed
            "CANCELLED" -> MetroBadgeStatus.Cancelled
            else -> MetroBadgeStatus.Default
        },
    )
}

fun formatPrice(price: Long): String {
    val formatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"))
    return formatter.format(price)
}
