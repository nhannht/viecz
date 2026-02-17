package com.viecz.vieczandroid.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
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
import com.viecz.vieczandroid.ui.viewmodels.CategoryViewModel
import com.viecz.vieczandroid.ui.viewmodels.CreateTaskViewModel
import com.viecz.vieczandroid.utils.formatCurrency
import java.util.Calendar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateTaskScreen(
    onNavigateBack: () -> Unit,
    onTaskCreated: (Long) -> Unit,
    createTaskViewModel: CreateTaskViewModel = hiltViewModel(),
    categoryViewModel: CategoryViewModel = hiltViewModel()
) {
    val uiState by createTaskViewModel.uiState.collectAsState()
    val categoryUiState by categoryViewModel.uiState.collectAsState()
    var showCategoryDialog by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }
    var showTimePicker by remember { mutableStateOf(false) }
    var selectedDateMillis by remember { mutableLongStateOf(0L) }

    LaunchedEffect(uiState.createdTask) {
        uiState.createdTask?.let { task ->
            onTaskCreated(task.id)
            createTaskViewModel.resetForm()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create New Task") },
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
                    text = "Post a new task and find skilled taskers",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Title field
            item {
                OutlinedTextField(
                    value = uiState.title,
                    onValueChange = { createTaskViewModel.updateTitle(it) },
                    label = { Text("Task Title *") },
                    modifier = Modifier.fillMaxWidth(),
                    isError = uiState.titleError != null,
                    supportingText = {
                        uiState.titleError?.let { Text(it) }
                    },
                    singleLine = true
                )
            }

            // Description field
            item {
                OutlinedTextField(
                    value = uiState.description,
                    onValueChange = { createTaskViewModel.updateDescription(it) },
                    label = { Text("Description *") },
                    modifier = Modifier.fillMaxWidth(),
                    isError = uiState.descriptionError != null,
                    supportingText = {
                        uiState.descriptionError?.let { Text(it) }
                    },
                    minLines = 4,
                    maxLines = 8
                )
            }

            // Category selector
            item {
                OutlinedButton(
                    onClick = { showCategoryDialog = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = uiState.categoryId?.let { id ->
                            categoryUiState.categories.find { it.id.toLong() == id }?.nameVi
                        } ?: "Select Category *",
                        modifier = Modifier.weight(1f)
                    )
                }
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

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isInsufficient)
                            MaterialTheme.colorScheme.errorContainer
                        else
                            MaterialTheme.colorScheme.secondaryContainer
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.AccountBalanceWallet,
                            contentDescription = null,
                            tint = if (isInsufficient)
                                MaterialTheme.colorScheme.onErrorContainer
                            else
                                MaterialTheme.colorScheme.onSecondaryContainer
                        )
                        Column {
                            Text(
                                text = "Available Balance",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (isInsufficient)
                                    MaterialTheme.colorScheme.onErrorContainer
                                else
                                    MaterialTheme.colorScheme.onSecondaryContainer
                            )
                            if (uiState.isLoadingBalance) {
                                Text(
                                    text = "Loading...",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            } else if (available != null) {
                                Text(
                                    text = formatCurrency(available),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isInsufficient)
                                        MaterialTheme.colorScheme.error
                                    else
                                        MaterialTheme.colorScheme.onSecondaryContainer
                                )
                            } else {
                                Text(
                                    text = "Could not load balance",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }

            // Price field
            item {
                OutlinedTextField(
                    value = uiState.price,
                    onValueChange = { createTaskViewModel.updatePrice(it) },
                    label = { Text("Price (VND) *") },
                    modifier = Modifier.fillMaxWidth(),
                    isError = uiState.priceError != null,
                    supportingText = {
                        uiState.priceError?.let { Text(it) }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    prefix = { Text("₫ ") }
                )
            }

            // Location field
            item {
                OutlinedTextField(
                    value = uiState.location,
                    onValueChange = { createTaskViewModel.updateLocation(it) },
                    label = { Text("Location *") },
                    modifier = Modifier.fillMaxWidth(),
                    isError = uiState.locationError != null,
                    supportingText = {
                        uiState.locationError?.let { Text(it) }
                    },
                    singleLine = true
                )
            }

            // Deadline picker (optional)
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = { showDatePicker = true },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(
                            Icons.Default.DateRange,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (uiState.deadlineDisplayText.isNotEmpty())
                                uiState.deadlineDisplayText
                            else
                                "Set Deadline (Optional)"
                        )
                    }
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
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer
                        )
                    ) {
                        Text(
                            text = error,
                            modifier = Modifier.padding(16.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
            }

            // Create button
            item {
                val priceValue = uiState.price.toLongOrNull() ?: 0L
                val isInsufficient = uiState.availableBalance != null && priceValue > uiState.availableBalance!!
                Button(
                    onClick = { createTaskViewModel.createTask() },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !uiState.isLoading && !isInsufficient
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Text("Create Task")
                    }
                }
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

    // Date picker dialog
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

    // Time picker dialog
    if (showTimePicker) {
        val timePickerState = rememberTimePickerState()
        AlertDialog(
            onDismissRequest = { showTimePicker = false },
            title = { Text("Select Time") },
            text = { TimePicker(state = timePickerState) },
            confirmButton = {
                TextButton(
                    onClick = {
                        val cal = Calendar.getInstance().apply {
                            timeInMillis = selectedDateMillis
                            set(Calendar.HOUR_OF_DAY, timePickerState.hour)
                            set(Calendar.MINUTE, timePickerState.minute)
                            set(Calendar.SECOND, 0)
                            set(Calendar.MILLISECOND, 0)
                        }
                        createTaskViewModel.updateDeadline(cal.timeInMillis)
                        showTimePicker = false
                    }
                ) { Text("Confirm") }
            },
            dismissButton = {
                TextButton(onClick = { showTimePicker = false }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun CategorySelectionDialog(
    categories: List<Category>,
    onDismiss: () -> Unit,
    onCategorySelected: (Category) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Select Category") },
        text = {
            LazyColumn {
                items(categories, key = { it.id }) { category ->
                    TextButton(
                        onClick = { onCategorySelected(category) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = category.nameVi,
                            modifier = Modifier.weight(1f),
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
