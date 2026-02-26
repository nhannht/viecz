package com.viecz.vieczandroid.ui.screens

import com.viecz.vieczandroid.R
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
import androidx.compose.ui.res.stringResource
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
import com.viecz.vieczandroid.ui.components.metro.MetroLocationPicker
import com.viecz.vieczandroid.ui.components.metro.LocationPickerValue
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
                title = { Text(if (uiState.isEditMode) stringResource(R.string.create_task_title_edit) else stringResource(R.string.create_task_title_new)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.create_task_back))
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
                    text = if (uiState.isEditMode) stringResource(R.string.create_task_subtitle_edit)
                           else stringResource(R.string.create_task_subtitle_new),
                    style = MaterialTheme.typography.bodyLarge,
                    color = colors.muted
                )
            }

            // Title field
            item {
                MetroInput(
                    value = uiState.title,
                    onValueChange = { createTaskViewModel.updateTitle(it) },
                    label = stringResource(R.string.create_task_name_label),
                    placeholder = stringResource(R.string.create_task_name_placeholder),
                    error = uiState.titleError ?: "",
                )
            }

            // Description field
            item {
                MetroTextarea(
                    value = uiState.description,
                    onValueChange = { createTaskViewModel.updateDescription(it) },
                    label = stringResource(R.string.create_task_description_label),
                    placeholder = stringResource(R.string.create_task_description_placeholder),
                    error = uiState.descriptionError ?: "",
                )
            }

            // Category selector
            item {
                MetroButton(
                    label = uiState.categoryId?.let { id ->
                        categoryUiState.categories.find { it.id.toLong() == id }?.nameVi
                    } ?: stringResource(R.string.create_task_category_label),
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
                                text = stringResource(R.string.create_task_available_balance),
                                style = MaterialTheme.typography.labelMedium,
                                color = colors.muted
                            )
                            if (uiState.isLoadingBalance) {
                                Text(
                                    text = stringResource(R.string.create_task_loading_balance),
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
                                    text = stringResource(R.string.create_task_balance_error),
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
                    label = stringResource(R.string.create_task_price_label),
                    error = uiState.priceError ?: "",
                    keyboardType = KeyboardType.Number,
                    prefix = { Text("₫ ", color = colors.muted) },
                )
            }

            // Location picker with map
            item {
                MetroLocationPicker(
                    value = LocationPickerValue(
                        location = uiState.location,
                        latitude = uiState.latitude,
                        longitude = uiState.longitude
                    ),
                    onValueChange = { pickerValue ->
                        createTaskViewModel.updateLocation(
                            pickerValue.location,
                            pickerValue.latitude,
                            pickerValue.longitude
                        )
                    },
                    onSearch = { query -> createTaskViewModel.searchLocation(query) },
                    onReverseGeocode = { lat, lon -> createTaskViewModel.reverseGeocode(lat, lon) },
                    label = stringResource(R.string.create_task_location_label),
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
                            stringResource(R.string.create_task_deadline_label),
                        onClick = { showDatePicker = true },
                        variant = MetroButtonVariant.Secondary,
                    )
                    if (uiState.deadlineMillis != null) {
                        IconButton(onClick = { createTaskViewModel.clearDeadline() }) {
                            Icon(
                                Icons.Default.Clear,
                                contentDescription = stringResource(R.string.create_task_clear_deadline),
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
                    label = if (uiState.isEditMode) stringResource(R.string.create_task_save) else stringResource(R.string.create_task_submit),
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

    // Date picker dialog — Metro-themed
    if (showDatePicker) {
        val datePickerState = rememberDatePickerState()
        val metroDatePickerColors = DatePickerDefaults.colors(
            containerColor = colors.card,
            titleContentColor = colors.fg,
            headlineContentColor = colors.fg,
            weekdayContentColor = colors.muted,
            subheadContentColor = colors.muted,
            navigationContentColor = colors.fg,
            yearContentColor = colors.fg,
            currentYearContentColor = colors.fg,
            selectedYearContentColor = colors.card,
            selectedYearContainerColor = colors.fg,
            dayContentColor = colors.fg,
            selectedDayContentColor = colors.card,
            selectedDayContainerColor = colors.fg,
            todayContentColor = colors.fg,
            todayDateBorderColor = colors.fg,
            dividerColor = colors.border,
        )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            colors = metroDatePickerColors,
            confirmButton = {
                MetroButton(
                    label = stringResource(R.string.create_task_date_next),
                    onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            selectedDateMillis = millis
                            showDatePicker = false
                            showTimePicker = true
                        }
                    },
                )
            },
            dismissButton = {
                MetroButton(
                    label = stringResource(R.string.create_task_date_cancel),
                    onClick = { showDatePicker = false },
                    variant = MetroButtonVariant.Secondary,
                )
            }
        ) {
            DatePicker(state = datePickerState, colors = metroDatePickerColors)
        }
    }

    // Time picker dialog — Metro-themed
    if (showTimePicker) {
        val timePickerState = rememberTimePickerState()
        val metroTimePickerColors = TimePickerDefaults.colors(
            clockDialColor = colors.bg,
            clockDialSelectedContentColor = colors.card,
            clockDialUnselectedContentColor = colors.fg,
            selectorColor = colors.fg,
            containerColor = colors.card,
            periodSelectorBorderColor = colors.border,
            periodSelectorSelectedContainerColor = colors.fg,
            periodSelectorSelectedContentColor = colors.card,
            periodSelectorUnselectedContainerColor = colors.card,
            periodSelectorUnselectedContentColor = colors.fg,
            timeSelectorSelectedContainerColor = colors.fg,
            timeSelectorSelectedContentColor = colors.card,
            timeSelectorUnselectedContainerColor = colors.bg,
            timeSelectorUnselectedContentColor = colors.fg,
        )
        MetroDialog(
            open = true,
            onDismiss = { showTimePicker = false },
            title = stringResource(R.string.create_task_time_title),
            confirmLabel = stringResource(R.string.create_task_time_confirm),
            cancelLabel = stringResource(R.string.create_task_time_cancel),
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
            TimePicker(state = timePickerState, colors = metroTimePickerColors)
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
        title = stringResource(R.string.create_task_category_title),
        confirmLabel = stringResource(R.string.create_task_category_cancel),
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
