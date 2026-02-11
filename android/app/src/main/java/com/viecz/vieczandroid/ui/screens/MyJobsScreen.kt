package com.viecz.vieczandroid.ui.screens

import android.util.Log
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.data.repository.TaskRepository
import com.viecz.vieczandroid.ui.components.TaskCard
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MyJobsUiState(
    val tasks: List<Task> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentPage: Int = 1,
    val hasMore: Boolean = true
)

@HiltViewModel
class MyJobsViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
    private val tokenManager: TokenManager,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val mode: String = savedStateHandle.get<String>("mode") ?: "posted"

    private val _uiState = MutableStateFlow(MyJobsUiState())
    val uiState: StateFlow<MyJobsUiState> = _uiState.asStateFlow()

    companion object {
        private const val TAG = "MyJobsViewModel"
    }

    init {
        loadJobs()
    }

    fun loadJobs(refresh: Boolean = false) {
        viewModelScope.launch {
            if (refresh) {
                _uiState.value = _uiState.value.copy(
                    currentPage = 1,
                    tasks = emptyList(),
                    hasMore = true
                )
            }

            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val userId = tokenManager.userId.firstOrNull()
            if (userId == null) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Not logged in"
                )
                return@launch
            }

            val result = when (mode) {
                "posted" -> taskRepository.getTasks(
                    page = _uiState.value.currentPage,
                    requesterId = userId
                )
                "applied" -> taskRepository.getTasks(
                    page = _uiState.value.currentPage,
                    taskerId = userId,
                    status = "in_progress"
                )
                "completed" -> taskRepository.getTasks(
                    page = _uiState.value.currentPage,
                    taskerId = userId,
                    status = "completed"
                )
                else -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Unknown mode: $mode"
                    )
                    return@launch
                }
            }

            result.fold(
                onSuccess = { response ->
                    Log.d(TAG, "Jobs loaded ($mode): ${response.data.size} tasks")
                    val currentTasks = if (refresh) emptyList() else _uiState.value.tasks
                    _uiState.value = _uiState.value.copy(
                        tasks = currentTasks + response.data,
                        isLoading = false,
                        error = null,
                        hasMore = response.data.size >= response.limit
                    )
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to load jobs ($mode)", error)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to load jobs"
                    )
                }
            )
        }
    }

    fun loadMore() {
        if (!_uiState.value.isLoading && _uiState.value.hasMore) {
            _uiState.value = _uiState.value.copy(currentPage = _uiState.value.currentPage + 1)
            loadJobs()
        }
    }

    fun refresh() {
        loadJobs(refresh = true)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyJobsScreen(
    mode: String,
    onNavigateBack: () -> Unit,
    onNavigateToTaskDetail: (Long) -> Unit,
    viewModel: MyJobsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    val pullToRefreshState = rememberPullToRefreshState()

    val title = when (mode) {
        "posted" -> "My Posted Jobs"
        "applied" -> "My Applied Jobs"
        "completed" -> "My Completed Jobs"
        else -> "My Jobs"
    }

    // Load more when reaching end of list
    LaunchedEffect(listState.layoutInfo.visibleItemsInfo) {
        val lastVisibleItem = listState.layoutInfo.visibleItemsInfo.lastOrNull()
        if (lastVisibleItem != null && lastVisibleItem.index >= uiState.tasks.size - 2) {
            viewModel.loadMore()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        PullToRefreshBox(
            state = pullToRefreshState,
            isRefreshing = uiState.isLoading && uiState.tasks.isNotEmpty(),
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading && uiState.tasks.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                uiState.error != null && uiState.tasks.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = uiState.error ?: "An error occurred",
                                color = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(onClick = { viewModel.refresh() }) {
                                Text("Retry")
                            }
                        }
                    }
                }
                uiState.tasks.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = when (mode) {
                                "posted" -> "You haven't posted any jobs yet"
                                "applied" -> "You haven't applied to any jobs yet"
                                "completed" -> "You haven't completed any jobs yet"
                                else -> "No jobs found"
                            },
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                else -> {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.tasks, key = { it.id }) { task ->
                            TaskCard(
                                task = task,
                                onClick = { onNavigateToTaskDetail(task.id) }
                            )
                        }

                        if (uiState.isLoading && uiState.tasks.isNotEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
