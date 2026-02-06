package com.viecz.vieczandroid.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.viecz.vieczandroid.data.models.Category
import com.viecz.vieczandroid.ui.viewmodels.CategoryViewModel
import com.viecz.vieczandroid.ui.viewmodels.CreateTaskViewModel

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
                Button(
                    onClick = { createTaskViewModel.createTask() },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !uiState.isLoading
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
