package com.viecz.vieczandroid.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.viecz.vieczandroid.R
import com.viecz.vieczandroid.data.models.Conversation
import com.viecz.vieczandroid.data.models.TaskStatus
import com.viecz.vieczandroid.ui.components.EmptyState
import com.viecz.vieczandroid.ui.components.ErrorState
import com.viecz.vieczandroid.ui.components.metro.MetroCard
import com.viecz.vieczandroid.ui.components.metro.MetroLoadingState
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.viewmodels.ConversationListViewModel
import com.viecz.vieczandroid.utils.formatDateTime

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConversationListContent(
    onNavigateToChat: (Long) -> Unit,
    onNavigateToMarketplace: () -> Unit = {},
    viewModel: ConversationListViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val pullToRefreshState = rememberPullToRefreshState()

    PullToRefreshBox(
        state = pullToRefreshState,
        isRefreshing = uiState.isLoading && uiState.conversations.isNotEmpty(),
        onRefresh = { viewModel.refresh() },
        modifier = Modifier.fillMaxSize()
    ) {
        when {
            uiState.isLoading && uiState.conversations.isEmpty() -> {
                MetroLoadingState()
            }
            uiState.error != null && uiState.conversations.isEmpty() -> {
                ErrorState(
                    message = uiState.error ?: stringResource(R.string.chat_error_occurred),
                    onRetry = { viewModel.refresh() }
                )
            }
            uiState.conversations.isEmpty() -> {
                EmptyState(
                    icon = Icons.Default.ChatBubbleOutline,
                    title = stringResource(R.string.conversations_empty),
                    message = stringResource(R.string.conversations_empty_subtitle),
                    actionLabel = stringResource(R.string.conversations_browse),
                    onAction = onNavigateToMarketplace
                )
            }
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(uiState.conversations, key = { it.id }) { conversation ->
                        ConversationCard(
                            conversation = conversation,
                            currentUserId = uiState.currentUserId,
                            onClick = { onNavigateToChat(conversation.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ConversationCard(
    conversation: Conversation,
    currentUserId: Long?,
    onClick: () -> Unit
) {
    val colors = MetroTheme.colors
    val otherUser = if (conversation.posterId == currentUserId) {
        conversation.tasker
    } else {
        conversation.poster
    }
    val otherUserName = otherUser?.name ?: "Unknown"
    val taskTitle = conversation.task?.title ?: stringResource(R.string.conversations_task_id, conversation.taskId)
    val isFinished = conversation.task?.status == TaskStatus.COMPLETED ||
            conversation.task?.status == TaskStatus.CANCELLED

    MetroCard(
        onClick = onClick,
        contentPadding = PaddingValues(16.dp),
        modifier = if (isFinished) Modifier.alpha(0.6f) else Modifier,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = if (isFinished) colors.muted.copy(alpha = 0.5f) else colors.fg
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = otherUserName,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = if (isFinished) colors.muted else colors.fg
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = taskTitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isFinished) colors.muted.copy(alpha = 0.7f) else colors.fg,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    if (isFinished) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (conversation.task?.status == TaskStatus.COMPLETED) stringResource(R.string.conversations_status_completed) else stringResource(R.string.conversations_status_cancelled),
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.muted.copy(alpha = 0.6f)
                        )
                    }
                }
                if (conversation.lastMessage != null) {
                    Text(
                        text = conversation.lastMessage,
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.muted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            if (conversation.lastMessageAt != null) {
                Text(
                    text = formatDateTime(conversation.lastMessageAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.muted
                )
            }
        }
    }
}
