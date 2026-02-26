package com.viecz.vieczandroid.ui.screens

import android.content.Context
import android.util.Log
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.WorkOutline
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.data.repository.TaskRepository
import com.viecz.vieczandroid.ui.components.EmptyState
import com.viecz.vieczandroid.ui.components.ErrorState
import com.viecz.vieczandroid.ui.components.TaskCard
import com.viecz.vieczandroid.ui.components.metro.MetroLoadingState
import com.viecz.vieczandroid.ui.components.metro.MetroSpinner
import com.viecz.vieczandroid.ui.components.metro.MetroTab
import com.viecz.vieczandroid.ui.components.metro.MetroTabs
import com.viecz.vieczandroid.R
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
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
    @ApplicationContext private val context: Context
) : ViewModel() {

    private var currentMode: String = "posted"

    private val _uiState = MutableStateFlow(MyJobsUiState())
    val uiState: StateFlow<MyJobsUiState> = _uiState.asStateFlow()

    companion object {
        private const val TAG = "MyJobsViewModel"
    }

    init {
        loadJobs()
    }

    fun switchMode(mode: String) {
        if (mode == currentMode && _uiState.value.tasks.isNotEmpty()) return
        currentMode = mode
        loadJobs(refresh = true)
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
                    error = context.getString(R.string.my_jobs_not_logged_in)
                )
                return@launch
            }

            val result = when (currentMode) {
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
                        error = "Unknown mode: $currentMode"
                    )
                    return@launch
                }
            }

            result.fold(
                onSuccess = { response ->
                    Log.d(TAG, "Jobs loaded ($currentMode): ${response.data.size} tasks")
                    val currentTasks = if (refresh) emptyList() else _uiState.value.tasks
                    _uiState.value = _uiState.value.copy(
                        tasks = currentTasks + response.data,
                        isLoading = false,
                        error = null,
                        hasMore = response.data.size >= response.limit
                    )
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to load jobs ($currentMode)", error)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: context.getString(R.string.my_jobs_load_failed)
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

private val TAB_MODES = listOf("posted", "applied", "completed")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyJobsScreen(
    onNavigateBack: () -> Unit,
    onNavigateToTaskDetail: (Long) -> Unit,
    onNavigateToCreateTask: () -> Unit = {},
    onNavigateToMarketplace: () -> Unit = {},
    viewModel: MyJobsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableStateOf("posted") }
    val tabPosted = stringResource(R.string.my_jobs_tab_posted)
    val tabApplied = stringResource(R.string.my_jobs_tab_applied)
    val tabCompleted = stringResource(R.string.my_jobs_tab_completed)
    val metroTabs = remember(tabPosted, tabApplied, tabCompleted) {
        listOf(
            MetroTab("posted", tabPosted),
            MetroTab("applied", tabApplied),
            MetroTab("completed", tabCompleted),
        )
    }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = { Text(stringResource(R.string.my_jobs_title)) },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.my_jobs_back))
                        }
                    }
                )
                MetroTabs(
                    tabs = metroTabs,
                    activeTab = selectedTab,
                    onTabChanged = { tab ->
                        selectedTab = tab
                        viewModel.switchMode(tab)
                    },
                )
            }
        }
    ) { paddingValues ->
        MyJobsTabContent(
            mode = selectedTab,
            uiState = uiState,
            onRefresh = { viewModel.refresh() },
            onLoadMore = { viewModel.loadMore() },
            onNavigateToTaskDetail = onNavigateToTaskDetail,
            onNavigateToCreateTask = onNavigateToCreateTask,
            onNavigateToMarketplace = onNavigateToMarketplace,
            modifier = Modifier.padding(paddingValues)
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MyJobsTabContent(
    mode: String,
    uiState: MyJobsUiState,
    onRefresh: () -> Unit,
    onLoadMore: () -> Unit,
    onNavigateToTaskDetail: (Long) -> Unit,
    onNavigateToCreateTask: () -> Unit,
    onNavigateToMarketplace: () -> Unit,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()
    val pullToRefreshState = rememberPullToRefreshState()

    // Load more when reaching end of list
    LaunchedEffect(listState.layoutInfo.visibleItemsInfo) {
        val lastVisibleItem = listState.layoutInfo.visibleItemsInfo.lastOrNull()
        if (lastVisibleItem != null && lastVisibleItem.index >= uiState.tasks.size - 2) {
            onLoadMore()
        }
    }

    PullToRefreshBox(
        state = pullToRefreshState,
        isRefreshing = uiState.isLoading && uiState.tasks.isNotEmpty(),
        onRefresh = onRefresh,
        modifier = modifier.fillMaxSize()
    ) {
        when {
            uiState.isLoading && uiState.tasks.isEmpty() -> {
                MetroLoadingState()
            }
            uiState.error != null && uiState.tasks.isEmpty() -> {
                ErrorState(
                    message = uiState.error ?: stringResource(R.string.my_jobs_error),
                    onRetry = onRefresh
                )
            }
            uiState.tasks.isEmpty() -> {
                when (mode) {
                    "posted" -> EmptyState(
                        icon = Icons.Default.Assignment,
                        title = stringResource(R.string.my_jobs_no_posted),
                        message = stringResource(R.string.my_jobs_no_posted_subtitle),
                        actionLabel = stringResource(R.string.my_jobs_post_task),
                        onAction = onNavigateToCreateTask
                    )
                    "applied" -> EmptyState(
                        icon = Icons.Default.WorkOutline,
                        title = stringResource(R.string.my_jobs_no_applied),
                        message = stringResource(R.string.my_jobs_no_applied_subtitle),
                        actionLabel = stringResource(R.string.my_jobs_browse),
                        onAction = onNavigateToMarketplace
                    )
                    else -> EmptyState(
                        icon = Icons.Default.DoneAll,
                        title = stringResource(R.string.my_jobs_no_completed),
                        message = stringResource(R.string.my_jobs_no_completed_subtitle)
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
                                MetroSpinner()
                            }
                        }
                    }
                }
            }
        }
    }
}
