package com.viecz.vieczandroid.ui.screens

import com.viecz.vieczandroid.R
import com.viecz.vieczandroid.ui.components.ErrorState
import com.viecz.vieczandroid.ui.components.TaskStatusBadge
import com.viecz.vieczandroid.ui.components.formatPrice
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.viecz.vieczandroid.data.models.ApplicationStatus
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.data.models.TaskApplication
import com.viecz.vieczandroid.data.models.TaskStatus
import com.viecz.vieczandroid.ui.components.metro.MetroBadge
import com.viecz.vieczandroid.ui.components.metro.MetroBadgeStatus
import com.viecz.vieczandroid.ui.components.metro.MetroButton
import com.viecz.vieczandroid.ui.components.metro.MetroButtonVariant
import com.viecz.vieczandroid.ui.components.metro.MetroCard
import com.viecz.vieczandroid.ui.components.metro.MetroDialog
import com.viecz.vieczandroid.ui.components.metro.MetroLoadingState
import com.viecz.vieczandroid.ui.components.metro.MetroLocationPreview
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.viewmodels.TaskDetailViewModel
import com.viecz.vieczandroid.utils.formatDateTime
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskDetailScreen(
    taskId: Long,
    onNavigateBack: () -> Unit,
    onNavigateToApply: (Long, Long) -> Unit,
    onNavigateToChat: (Long) -> Unit = {},
    onNavigateToProfile: () -> Unit = {},
    onNavigateToEdit: (Long) -> Unit = {},
    viewModel: TaskDetailViewModel = hiltViewModel()
) {
    val colors = MetroTheme.colors
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var showAcceptDialog by remember { mutableStateOf<TaskApplication?>(null) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showCancelOverdueDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(taskId) {
        viewModel.loadTask(taskId)
    }

    // Handle delete success — navigate back
    LaunchedEffect(uiState.deleteSuccess) {
        if (uiState.deleteSuccess) {
            viewModel.clearDeleteSuccess()
            onNavigateBack()
        }
    }

    // Handle payment checkout URL (real PayOS mode)
    LaunchedEffect(uiState.paymentCheckoutUrl) {
        uiState.paymentCheckoutUrl?.let { url ->
            // Open PayOS checkout URL in browser
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            context.startActivity(intent)
            viewModel.clearPaymentCheckoutUrl()
        }
    }

    // Handle payment success
    LaunchedEffect(uiState.paymentSuccess) {
        if (uiState.paymentSuccess) {
            snackbarHostState.showSnackbar(
                message = context.getString(R.string.task_detail_payment_success),
                duration = SnackbarDuration.Short,
                withDismissAction = true
            )
            viewModel.clearPaymentSuccess()
        }
    }

    // Handle payment error
    LaunchedEffect(uiState.paymentError) {
        uiState.paymentError?.let { error ->
            snackbarHostState.showSnackbar(
                message = context.getString(R.string.task_detail_payment_failed, error),
                duration = SnackbarDuration.Long,
                withDismissAction = true
            )
            viewModel.clearPaymentError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.task_detail_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.task_detail_back))
                    }
                },
                actions = {
                    if (uiState.isOwnTask && uiState.task?.status == TaskStatus.OPEN) {
                        IconButton(onClick = { onNavigateToEdit(taskId) }) {
                            Icon(
                                Icons.Default.Edit,
                                contentDescription = stringResource(R.string.task_detail_edit)
                            )
                        }
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = stringResource(R.string.task_detail_delete_icon),
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading && uiState.task == null -> {
                    MetroLoadingState()
                }
                uiState.error != null -> {
                    ErrorState(
                        message = uiState.error ?: stringResource(R.string.task_detail_error),
                        onRetry = { viewModel.loadTask(taskId) }
                    )
                }
                uiState.task != null -> {
                    TaskDetailContent(
                        task = uiState.task!!,
                        applications = uiState.applications,
                        conversationId = uiState.conversationId,
                        isOwnTask = uiState.isOwnTask,
                        onApply = { onNavigateToApply(taskId, uiState.task!!.price) },
                        onNavigateToProfile = onNavigateToProfile,
                        onAcceptApplication = { application ->
                            showAcceptDialog = application
                        },
                        onCompleteTask = { viewModel.completeTask(taskId) },
                        onCancelOverdue = { showCancelOverdueDialog = true },
                        onMessageClick = {
                            if (uiState.conversationId != null) {
                                onNavigateToChat(uiState.conversationId!!)
                            } else {
                                viewModel.getOrCreateConversation()
                            }
                        }
                    )
                }
            }
        }
    }

    // Accept application confirmation dialog
    showAcceptDialog?.let { application ->
        val task = uiState.task
        val escrowAmount = application.proposedPrice ?: task?.price ?: 0L
        val isAboveTaskPrice = task != null && application.proposedPrice != null
                && application.proposedPrice > task.price

        MetroDialog(
            open = true,
            onDismiss = { showAcceptDialog = null },
            title = stringResource(R.string.task_detail_accept_dialog_title),
            confirmLabel = stringResource(R.string.task_detail_accept_dialog_confirm),
            cancelLabel = stringResource(R.string.task_detail_accept_dialog_cancel),
            onConfirm = {
                viewModel.acceptApplication(application.id)
                showAcceptDialog = null
            },
            onCancel = { showAcceptDialog = null },
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = stringResource(R.string.task_detail_accept_dialog_message),
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.muted,
                )
                Text(
                    text = stringResource(R.string.task_detail_escrow_amount, formatPrice(escrowAmount)),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = colors.fg,
                )
                if (isAboveTaskPrice) {
                    val diff = application.proposedPrice!! - task!!.price
                    Text(
                        text = stringResource(R.string.task_detail_price_above, formatPrice(diff), formatPrice(task.price)),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        fontWeight = FontWeight.Bold
                    )
                }
                Text(
                    text = stringResource(R.string.task_detail_accept_bullets),
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.muted,
                )
            }
        }
    }

    // Delete task confirmation dialog
    if (showDeleteDialog) {
        MetroDialog(
            open = true,
            onDismiss = { showDeleteDialog = false },
            title = stringResource(R.string.task_detail_delete_dialog_title),
            confirmLabel = stringResource(R.string.task_detail_delete_dialog_confirm),
            cancelLabel = stringResource(R.string.task_detail_delete_dialog_cancel),
            onConfirm = {
                viewModel.deleteTask(taskId)
                showDeleteDialog = false
            },
            onCancel = { showDeleteDialog = false },
        ) {
            Text(
                text = stringResource(R.string.task_detail_delete_dialog_message),
                style = MaterialTheme.typography.bodyMedium,
                color = colors.muted,
            )
        }
    }

    // Cancel overdue task confirmation dialog
    if (showCancelOverdueDialog) {
        MetroDialog(
            open = true,
            onDismiss = { showCancelOverdueDialog = false },
            title = stringResource(R.string.task_detail_cancel_overdue_title),
            confirmLabel = stringResource(R.string.task_detail_cancel_overdue_confirm),
            cancelLabel = stringResource(R.string.task_detail_cancel_overdue_cancel),
            onConfirm = {
                viewModel.cancelOverdueTask(taskId)
                showCancelOverdueDialog = false
            },
            onCancel = { showCancelOverdueDialog = false },
        ) {
            Text(
                text = stringResource(R.string.task_detail_cancel_overdue_message),
                style = MaterialTheme.typography.bodyMedium,
                color = colors.muted,
            )
        }
    }
}

@Composable
fun TaskDetailContent(
    task: Task,
    applications: List<TaskApplication>,
    conversationId: Long?,
    isOwnTask: Boolean = false,
    onApply: () -> Unit,
    onNavigateToProfile: () -> Unit = {},
    onAcceptApplication: (TaskApplication) -> Unit,
    onCompleteTask: () -> Unit,
    onCancelOverdue: () -> Unit = {},
    onMessageClick: () -> Unit
) {
    val colors = MetroTheme.colors

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Task header
        item {
            MetroCard(
                featured = true,
                contentPadding = PaddingValues(16.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Text(
                        text = task.title,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = colors.fg,
                        modifier = Modifier.weight(1f)
                    )
                    TaskStatusBadge(status = task.status.name)
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = formatPrice(task.price),
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = colors.fg,
                )
            }
        }

        // Task description
        item {
            MetroCard(contentPadding = PaddingValues(16.dp)) {
                Text(
                    text = stringResource(R.string.task_detail_description),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = colors.fg,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = task.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.muted,
                )
            }
        }

        // Location
        item {
            MetroCard(contentPadding = PaddingValues(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = colors.fg
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = task.location,
                        style = MaterialTheme.typography.bodyLarge,
                        color = colors.fg,
                    )
                }
                // Map preview when coordinates are available
                if (task.latitude != null && task.longitude != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    MetroLocationPreview(
                        latitude = task.latitude,
                        longitude = task.longitude,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${String.format("%.6f", task.latitude)}, ${String.format("%.6f", task.longitude)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.muted,
                    )
                }
            }
        }

        // Deadline card
        if (task.deadline != null) {
            item {
                val isOverdue = task.isOverdue
                val formattedDeadline = try {
                    val instant = Instant.parse(task.deadline)
                    ZoneId.systemDefault().let { zone ->
                        instant.atZone(zone).format(
                            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
                        )
                    }
                } catch (_: Exception) {
                    task.deadline
                }

                MetroCard(
                    featured = isOverdue,
                    contentPadding = PaddingValues(16.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.DateRange,
                            contentDescription = null,
                            tint = if (isOverdue)
                                MaterialTheme.colorScheme.error
                            else
                                colors.fg
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = stringResource(R.string.task_detail_deadline),
                                style = MaterialTheme.typography.labelMedium,
                                color = colors.muted,
                            )
                            Text(
                                text = formattedDeadline,
                                style = MaterialTheme.typography.bodyLarge,
                                color = if (isOverdue)
                                    MaterialTheme.colorScheme.error
                                else
                                    colors.fg,
                            )
                        }
                        if (isOverdue) {
                            MetroBadge(
                                label = stringResource(R.string.task_detail_overdue),
                                status = MetroBadgeStatus.Cancelled,
                            )
                        }
                    }
                }
            }
        }

        // Cancel & refund button for own overdue in_progress tasks
        if (isOwnTask && task.status == TaskStatus.IN_PROGRESS && task.isOverdue) {
            item {
                MetroButton(
                    label = stringResource(R.string.task_detail_cancel_refund_button),
                    onClick = onCancelOverdue,
                    fullWidth = true,
                )
            }
        }

        // Apply button or status (only if task is open and not own task)
        if (task.status == TaskStatus.OPEN && !isOwnTask && task.isOverdue) {
            item {
                MetroCard(
                    featured = true,
                    contentPadding = PaddingValues(16.dp),
                ) {
                    Text(
                        text = stringResource(R.string.task_detail_deadline_passed),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        } else if (task.status == TaskStatus.OPEN && !isOwnTask) {
            item {
                if (task.userHasApplied) {
                    // Show "Already Applied" status
                    MetroCard(
                        featured = true,
                        contentPadding = PaddingValues(16.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = colors.fg
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = stringResource(R.string.task_detail_application_pending),
                                style = MaterialTheme.typography.titleMedium,
                                color = colors.fg,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                } else {
                    // Show apply button
                    MetroButton(
                        label = stringResource(R.string.task_detail_apply_button),
                        onClick = onApply,
                        fullWidth = true,
                    )
                }
            }
        }

        // Applications section (only for task requester)
        if (applications.isNotEmpty()) {
            item {
                Text(
                    text = stringResource(R.string.task_detail_applications_count, applications.size),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = colors.fg,
                )
            }

            items(applications, key = { it.id }) { application ->
                ApplicationCard(
                    application = application,
                    taskPrice = task.price,
                    onAccept = { onAcceptApplication(application) }
                )
            }
        }

        // Message button (only if task is in progress)
        if (task.status == TaskStatus.IN_PROGRESS) {
            item {
                MetroButton(
                    label = stringResource(R.string.task_detail_message),
                    onClick = onMessageClick,
                    variant = MetroButtonVariant.Secondary,
                    fullWidth = true,
                )
            }
        }

        // Complete button (only if task is in progress)
        if (task.status == TaskStatus.IN_PROGRESS) {
            item {
                MetroButton(
                    label = stringResource(R.string.task_detail_mark_completed),
                    onClick = onCompleteTask,
                    fullWidth = true,
                )
            }
        }
    }
}

@Composable
fun ApplicationCard(
    application: TaskApplication,
    taskPrice: Long,
    onAccept: () -> Unit
) {
    val colors = MetroTheme.colors

    MetroCard(
        featured = application.status == ApplicationStatus.ACCEPTED,
        contentPadding = PaddingValues(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = colors.fg,
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = stringResource(R.string.task_detail_tasker_id, application.taskerId),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = colors.fg,
                    )
                    Text(
                        text = formatDateTime(application.createdAt),
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.muted,
                    )
                }
            }
            ApplicationStatusBadge(status = application.status)
        }

        if (application.message != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = application.message,
                style = MaterialTheme.typography.bodyMedium,
                color = colors.fg,
            )
        }

        if (application.proposedPrice != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.task_detail_proposed_price, formatPrice(application.proposedPrice)),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = if (application.proposedPrice > taskPrice)
                    MaterialTheme.colorScheme.error
                else
                    colors.fg,
            )
            if (application.proposedPrice > taskPrice) {
                val diff = application.proposedPrice - taskPrice
                Text(
                    text = stringResource(R.string.task_detail_price_above_by, formatPrice(taskPrice), formatPrice(diff)),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            } else if (application.proposedPrice < taskPrice) {
                Text(
                    text = stringResource(R.string.task_detail_price_below, formatPrice(taskPrice)),
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.muted,
                )
            }
        }

        if (application.status == ApplicationStatus.PENDING) {
            Spacer(modifier = Modifier.height(12.dp))
            MetroButton(
                label = stringResource(R.string.task_detail_accept_application),
                onClick = onAccept,
                fullWidth = true,
            )
        }
    }
}

@Composable
fun ApplicationStatusBadge(status: ApplicationStatus) {
    val (badgeStatus, text) = when (status) {
        ApplicationStatus.PENDING -> MetroBadgeStatus.Open to stringResource(R.string.task_detail_status_pending)
        ApplicationStatus.ACCEPTED -> MetroBadgeStatus.Completed to stringResource(R.string.task_detail_status_accepted)
        ApplicationStatus.REJECTED -> MetroBadgeStatus.Cancelled to stringResource(R.string.task_detail_status_rejected)
    }

    MetroBadge(
        label = text,
        status = badgeStatus,
    )
}
