package com.viecz.vieczandroid.ui.screens

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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.viecz.vieczandroid.data.models.ApplicationStatus
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.data.models.TaskApplication
import com.viecz.vieczandroid.data.models.TaskStatus
import com.viecz.vieczandroid.ui.viewmodels.TaskDetailViewModel
import com.viecz.vieczandroid.utils.formatDateTime
import java.text.NumberFormat

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskDetailScreen(
    taskId: Long,
    onNavigateBack: () -> Unit,
    onNavigateToApply: (Long) -> Unit,
    onNavigateToChat: (Long) -> Unit = {},
    onNavigateToProfile: () -> Unit = {},
    viewModel: TaskDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var showAcceptDialog by remember { mutableStateOf<TaskApplication?>(null) }
    var showDeleteDialog by remember { mutableStateOf(false) }
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
                message = "Payment processed successfully!",
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
                message = "Payment failed: $error",
                duration = SnackbarDuration.Long,
                withDismissAction = true
            )
            viewModel.clearPaymentError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Task Details") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (uiState.isOwnTask && uiState.task?.status == TaskStatus.OPEN) {
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = "Delete Task",
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
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                uiState.error != null -> {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = uiState.error ?: "An error occurred",
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadTask(taskId) }) {
                            Text("Retry")
                        }
                    }
                }
                uiState.task != null -> {
                    TaskDetailContent(
                        task = uiState.task!!,
                        applications = uiState.applications,
                        conversationId = uiState.conversationId,
                        isOwnTask = uiState.isOwnTask,
                        isCurrentUserTasker = uiState.isCurrentUserTasker,
                        onApply = { onNavigateToApply(taskId) },
                        onNavigateToProfile = onNavigateToProfile,
                        onAcceptApplication = { application ->
                            showAcceptDialog = application
                        },
                        onCompleteTask = { viewModel.completeTask(taskId) },
                        onMessageClick = {
                            // Get or create conversation, then navigate
                            if (uiState.conversationId != null) {
                                onNavigateToChat(uiState.conversationId!!)
                            } else {
                                // Trigger conversation creation
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

        AlertDialog(
            onDismissRequest = { showAcceptDialog = null },
            title = { Text("Accept Application & Create Payment") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Are you sure you want to accept this application?")
                    Text(
                        text = "Escrow amount: ${formatPrice(escrowAmount)}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold
                    )
                    if (isAboveTaskPrice) {
                        val diff = application.proposedPrice!! - task!!.price
                        Text(
                            text = "This is ${formatPrice(diff)} above your original task price (${formatPrice(task.price)})",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = "• This will assign the tasker to your task\n• Escrow payment will be created\n• Funds will be held until task completion",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.acceptApplication(application.id)
                        showAcceptDialog = null
                    }
                ) {
                    Text("Accept")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAcceptDialog = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Delete task confirmation dialog
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Task") },
            text = {
                Text("Are you sure you want to delete this task? This will cancel the task and reject all pending applications.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteTask(taskId)
                        showDeleteDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun TaskDetailContent(
    task: Task,
    applications: List<TaskApplication>,
    conversationId: Long?,
    isOwnTask: Boolean = false,
    isCurrentUserTasker: Boolean = false,
    onApply: () -> Unit,
    onNavigateToProfile: () -> Unit = {},
    onAcceptApplication: (TaskApplication) -> Unit,
    onCompleteTask: () -> Unit,
    onMessageClick: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Task header
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
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
                            modifier = Modifier.weight(1f)
                        )
                        TaskStatusBadge(status = task.status.name)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = formatPrice(task.price),
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }

        // Task description
        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Text(
                        text = "Description",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = task.description,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }

        // Location
        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = task.location,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            }
        }

        // Apply button or status (only if task is open and not own task)
        if (task.status == TaskStatus.OPEN && !isOwnTask) {
            item {
                if (!isCurrentUserTasker) {
                    // Non-tasker CTA: suggest registering as a tasker
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.tertiaryContainer
                        )
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "You need to be a tasker to apply for tasks.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onTertiaryContainer
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(onClick = onNavigateToProfile) {
                                Text("Register as Tasker")
                            }
                        }
                    }
                } else if (task.userHasApplied) {
                    // Show "Already Applied" status
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.secondary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Application Pending",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSecondaryContainer,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                } else {
                    // Show apply button
                    Button(
                        onClick = onApply,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Apply for this Task")
                    }
                }
            }
        }

        // Applications section (only for task requester)
        if (applications.isNotEmpty()) {
            item {
                Text(
                    text = "Applications (${applications.size})",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
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
                Button(
                    onClick = onMessageClick,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.tertiary
                    )
                ) {
                    Icon(Icons.Outlined.MailOutline, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Message")
                }
            }
        }

        // Complete button (only if task is in progress)
        if (task.status == TaskStatus.IN_PROGRESS) {
            item {
                Button(
                    onClick = onCompleteTask,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.secondary
                    )
                ) {
                    Icon(Icons.Default.Check, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Mark as Completed")
                }
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
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = when (application.status) {
                ApplicationStatus.ACCEPTED -> MaterialTheme.colorScheme.secondaryContainer
                ApplicationStatus.REJECTED -> MaterialTheme.colorScheme.errorContainer
                else -> MaterialTheme.colorScheme.surface
            }
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
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
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "Tasker #${application.taskerId}",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = formatDateTime(application.createdAt),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                ApplicationStatusBadge(status = application.status)
            }

            if (application.message != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = application.message,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            if (application.proposedPrice != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Proposed price: ${formatPrice(application.proposedPrice)}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (application.proposedPrice > taskPrice)
                        MaterialTheme.colorScheme.error
                    else
                        MaterialTheme.colorScheme.primary
                )
                if (application.proposedPrice > taskPrice) {
                    val diff = application.proposedPrice - taskPrice
                    Text(
                        text = "Above task price (${formatPrice(taskPrice)}) by ${formatPrice(diff)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                } else if (application.proposedPrice < taskPrice) {
                    Text(
                        text = "Below task price (${formatPrice(taskPrice)})",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            if (application.status == ApplicationStatus.PENDING) {
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onAccept,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Accept Application")
                }
            }
        }
    }
}

@Composable
fun ApplicationStatusBadge(status: ApplicationStatus) {
    val (color, text) = when (status) {
        ApplicationStatus.PENDING -> MaterialTheme.colorScheme.primary to "Pending"
        ApplicationStatus.ACCEPTED -> MaterialTheme.colorScheme.secondary to "Accepted"
        ApplicationStatus.REJECTED -> MaterialTheme.colorScheme.error to "Rejected"
    }

    Surface(
        color = color.copy(alpha = 0.1f),
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color
        )
    }
}

