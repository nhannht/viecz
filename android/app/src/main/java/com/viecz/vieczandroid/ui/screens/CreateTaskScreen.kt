package com.viecz.vieczandroid.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.viecz.vieczandroid.data.models.Category
import com.viecz.vieczandroid.ui.components.metro.MetroButton
import com.viecz.vieczandroid.ui.components.metro.MetroButtonVariant
import com.viecz.vieczandroid.ui.components.metro.MetroCard
import com.viecz.vieczandroid.ui.components.metro.MetroDialog
import com.viecz.vieczandroid.ui.components.metro.MetroInput
import com.viecz.vieczandroid.ui.components.metro.MetroTextarea
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.viewmodels.CategoryViewModel
import com.viecz.vieczandroid.ui.viewmodels.CreateTaskViewModel
import com.viecz.vieczandroid.utils.formatCurrency
import java.util.Calendar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateTaskScreen(
    onNavigateBack: () -> Unit,
    onTaskCreated: (Long) -> Unit,
    taskId: Long? = null,
    createTaskViewModel: CreateTaskViewModel = hiltViewModel(),
    categoryViewModel: CategoryViewModel = hiltViewModel()
) {
    val colors = MetroTheme.colors
    val uiState by createTaskViewModel.uiState.collectAsState()
    val categoryUiState by categoryViewModel.uiState.collectAsState()
    var showCategoryDialog by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }
    var showTimePicker by remember { mutableStateOf(false) }
    var selectedDateMillis by remember { mutableLongStateOf(0L) }

    LaunchedEffect(taskId) {
        if (taskId != null) {
            createTaskViewModel.loadTaskForEdit(taskId)
        }
    }

    LaunchedEffect(uiState.createdTask) {
        uiState.createdTask?.let { task ->
            onTaskCreated(task.id)
            createTaskViewModel.resetForm()
        }
    }

    LaunchedEffect(uiState.updatedTask) {
        uiState.updatedTask?.let { task ->
            onTaskCreated(task.id)
            createTaskViewModel.resetForm()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (uiState.isEditMode) "Edit Task" else "Create New Task") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(
                    text = if (uiState.isEditMode) "Update your task details"
                           else "Post a new task and find skilled taskers",
                    style = MaterialTheme.typography.bodyLarge,
                    color = colors.muted
                )
            }

            // Title field
            item {
                MetroInput(
                    value = uiState.title,
                    onValueChange = { createTaskViewModel.updateTitle(it) },
                    label = "TASK TITLE *",
                    placeholder = "What do you need help with?",
                    error = uiState.titleError ?: "",
                )
            }

            // Description field
            item {
                MetroTextarea(
                    value = uiState.description,
                    onValueChange = { createTaskViewModel.updateDescription(it) },
                    label = "DESCRIPTION *",
                    placeholder = "Describe the task in detail...",
                    error = uiState.descriptionError ?: "",
                )
            }

            // Category selector
            item {
                MetroButton(
                    label = uiState.categoryId?.let { id ->
                        categoryUiState.categories.find { it.id.toLong() == id }?.nameVi
                    } ?: "Select Category *",
                    onClick = { showCategoryDialog = true },
                    variant = MetroButtonVariant.Secondary,
                    fullWidth = true,
                )
                uiState.categoryError?.let {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(start = 16.dp, top = 4.dp)
                    )
                }
            }

            // Available balance info
            item {
                val available = uiState.availableBalance
                val priceValue = uiState.price.toLongOrNull() ?: 0L
                val isInsufficient = available != null && priceValue > available

                MetroCard(
                    contentPadding = PaddingValues(12.dp),
                    featured = isInsufficient,
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.AccountBalanceWallet,
                            contentDescription = null,
                            tint = if (isInsufficient) MaterialTheme.colorScheme.error else colors.fg
                        )
                        Column {
                            Text(
                                text = "Available Balance",
                                style = MaterialTheme.typography.labelMedium,
                                color = colors.muted
                            )
                            if (uiState.isLoadingBalance) {
                                Text(
                                    text = "Loading...",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = colors.muted
                                )
                            } else if (available != null) {
                                Text(
                                    text = formatCurrency(available),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isInsufficient) MaterialTheme.colorScheme.error else colors.fg
                                )
                            } else {
                                Text(
                                    text = "Could not load balance",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = colors.muted
                                )
                            }
                        }
                    }
                }
            }

            // Price field
            item {
                MetroInput(
                    value = uiState.price,
                    onValueChange = { createTaskViewModel.updatePrice(it) },
                    label = "PRICE (VND) *",
                    error = uiState.priceError ?: "",
                    keyboardType = KeyboardType.Number,
                    prefix = { Text("₫ ", color = colors.muted) },
                )
            }

            // Location field
            item {
                MetroInput(
                    value = uiState.location,
                    onValueChange = { createTaskViewModel.updateLocation(it) },
                    label = "LOCATION *",
                    placeholder = "Where is this task?",
                    error = uiState.locationError ?: "",
                )
            }

            // Deadline picker (optional) — DatePicker/TimePicker stays Material3
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    MetroButton(
                        label = if (uiState.deadlineDisplayText.isNotEmpty())
                            uiState.deadlineDisplayText
                        else
                            "Set Deadline (Optional)",
                        onClick = { showDatePicker = true },
                        variant = MetroButtonVariant.Secondary,
                    )
                    if (uiState.deadlineMillis != null) {
                        IconButton(onClick = { createTaskViewModel.clearDeadline() }) {
                            Icon(
                                Icons.Default.Clear,
                                contentDescription = "Clear deadline",
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                }
                uiState.deadlineError?.let {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(start = 16.dp, top = 4.dp)
                    )
                }
            }

            // Error message
            uiState.error?.let { error ->
                item {
                    MetroCard(contentPadding = PaddingValues(16.dp)) {
                        Text(
                            text = error,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }

            // Submit button
            item {
                val priceValue = uiState.price.toLongOrNull() ?: 0L
                val isInsufficient = uiState.availableBalance != null && priceValue > uiState.availableBalance!!
                MetroButton(
                    label = if (uiState.isEditMode) "SAVE CHANGES" else "CREATE TASK",
                    onClick = { createTaskViewModel.submitTask() },
                    fullWidth = true,
                    enabled = !uiState.isLoading && !isInsufficient,
                    isLoading = uiState.isLoading,
                )
            }
        }
    }

    // Category selection dialog
    if (showCategoryDialog) {
        CategorySelectionDialog(
            categories = categoryUiState.categories,
            onDismiss = { showCategoryDialog = false },
            onCategorySelected = { category ->
                createTaskViewModel.updateCategory(category.id.toLong())
                showCategoryDialog = false
            }
        )
    }

    // Date picker dialog — stays Material3 (complex widget, low ROI)
    if (showDatePicker) {
        val datePickerState = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            selectedDateMillis = millis
                            showDatePicker = false
                            showTimePicker = true
                        }
                    }
                ) { Text("Next") }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text("Cancel") }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    // Time picker dialog — stays Material3
    if (showTimePicker) {
        val timePickerState = rememberTimePickerState()
        MetroDialog(
            open = true,
            onDismiss = { showTimePicker = false },
            title = "Select Time",
            confirmLabel = "Confirm",
            cancelLabel = "Cancel",
            onConfirm = {
                val cal = Calendar.getInstance().apply {
                    timeInMillis = selectedDateMillis
                    set(Calendar.HOUR_OF_DAY, timePickerState.hour)
                    set(Calendar.MINUTE, timePickerState.minute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                createTaskViewModel.updateDeadline(cal.timeInMillis)
                showTimePicker = false
            },
            onCancel = { showTimePicker = false },
        ) {
            TimePicker(state = timePickerState)
        }
    }
}

@Composable
fun CategorySelectionDialog(
    categories: List<Category>,
    onDismiss: () -> Unit,
    onCategorySelected: (Category) -> Unit
) {
    MetroDialog(
        open = true,
        onDismiss = onDismiss,
        title = "Select Category",
        confirmLabel = "Cancel",
        onConfirm = onDismiss,
        cancelLabel = "",
        onCancel = onDismiss,
    ) {
        LazyColumn {
            items(categories, key = { it.id }) { category ->
                MetroButton(
                    label = category.nameVi,
                    onClick = { onCategorySelected(category) },
                    variant = MetroButtonVariant.Secondary,
                    fullWidth = true,
                )
            }
        }
    }
}
