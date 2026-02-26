package com.viecz.vieczandroid.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.viecz.vieczandroid.BuildConfig
import com.viecz.vieczandroid.R
import com.viecz.vieczandroid.data.models.Category
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.ui.components.ErrorState
import com.viecz.vieczandroid.ui.components.TaskCard
import com.viecz.vieczandroid.ui.components.metro.MetroCard
import com.viecz.vieczandroid.ui.components.metro.MetroFab
import com.viecz.vieczandroid.ui.components.metro.MetroInput
import com.viecz.vieczandroid.ui.components.metro.MetroLoadingState
import com.viecz.vieczandroid.ui.components.metro.MetroSpinner
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.viewmodels.CategoryViewModel
import com.viecz.vieczandroid.ui.viewmodels.NotificationViewModel
import com.viecz.vieczandroid.ui.viewmodels.TaskListViewModel
import org.maplibre.android.MapLibre
import org.maplibre.android.annotations.MarkerOptions
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView

private const val HCMC_DEFAULT_LAT = 10.7769
private const val HCMC_DEFAULT_LNG = 106.7009
private const val MAP_DEFAULT_ZOOM = 13.0

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToTaskDetail: (Long) -> Unit,
    onNavigateToCreateTask: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToWallet: () -> Unit = {},
    onNavigateToNotifications: () -> Unit = {},
    refreshTrigger: Boolean = false,
    taskListViewModel: TaskListViewModel = hiltViewModel(),
    categoryViewModel: CategoryViewModel = hiltViewModel(),
    notificationViewModel: NotificationViewModel = hiltViewModel()
) {
    val notificationUiState by notificationViewModel.uiState.collectAsState()

    LaunchedEffect(refreshTrigger) {
        if (refreshTrigger) {
            taskListViewModel.refresh()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.home_title)) },
                actions = {
                    IconButton(onClick = onNavigateToNotifications) {
                        BadgedBox(
                            badge = {
                                if (notificationUiState.unreadCount > 0) {
                                    Badge { Text("${notificationUiState.unreadCount}") }
                                }
                            }
                        ) {
                            Icon(Icons.Default.Notifications, contentDescription = stringResource(R.string.home_notifications))
                        }
                    }
                    IconButton(onClick = onNavigateToWallet) {
                        Icon(Icons.Default.AccountBalanceWallet, contentDescription = stringResource(R.string.home_wallet))
                    }
                    IconButton(onClick = onNavigateToProfile) {
                        Icon(Icons.Default.Person, contentDescription = stringResource(R.string.home_profile))
                    }
                }
            )
        },
        floatingActionButton = {
            MetroFab(
                onClick = onNavigateToCreateTask,
                modifier = Modifier.testTag("fab_create_task"),
                contentDescription = stringResource(R.string.home_create_task),
            )
        }
    ) { paddingValues ->
        HomeContent(
            onNavigateToTaskDetail = onNavigateToTaskDetail,
            taskListViewModel = taskListViewModel,
            categoryViewModel = categoryViewModel,
            modifier = Modifier.padding(paddingValues)
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeContent(
    onNavigateToTaskDetail: (Long) -> Unit,
    taskListViewModel: TaskListViewModel = hiltViewModel(),
    categoryViewModel: CategoryViewModel = hiltViewModel(),
    modifier: Modifier = Modifier,
    showSearchBar: Boolean = false
) {
    val colors = MetroTheme.colors
    val taskUiState by taskListViewModel.uiState.collectAsState()
    val categoryUiState by categoryViewModel.uiState.collectAsState()
    val searchQuery by taskListViewModel.searchQueryText.collectAsState()
    val listState = rememberLazyListState()
    val pullToRefreshState = rememberPullToRefreshState()

    // Load more when reaching end of list
    LaunchedEffect(listState.layoutInfo.visibleItemsInfo, taskUiState.isMapView) {
        if (taskUiState.isMapView) return@LaunchedEffect
        val lastVisibleItem = listState.layoutInfo.visibleItemsInfo.lastOrNull()
        if (lastVisibleItem != null && lastVisibleItem.index >= taskUiState.tasks.size - 2) {
            taskListViewModel.loadMore()
        }
    }

    PullToRefreshBox(
        state = pullToRefreshState,
        isRefreshing = taskUiState.isLoading && taskUiState.tasks.isNotEmpty(),
        onRefresh = { taskListViewModel.refresh() },
        modifier = modifier.fillMaxSize()
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Search bar with debounced auto-search
            if (showSearchBar) {
                MetroInput(
                    value = searchQuery,
                    onValueChange = { taskListViewModel.updateSearchQuery(it) },
                    placeholder = stringResource(R.string.home_search_placeholder),
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = colors.muted) },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { taskListViewModel.clearSearch() }) {
                                Icon(Icons.Default.Close, contentDescription = stringResource(R.string.home_clear_search), tint = colors.muted)
                            }
                        }
                    },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }

            // Category filter chips
            if (!categoryUiState.isLoading && categoryUiState.categories.isNotEmpty()) {
                CategoryFilterRow(
                    categories = categoryUiState.categories,
                    selectedCategoryId = taskUiState.selectedCategoryId,
                    onCategorySelected = { categoryId ->
                        taskListViewModel.filterByCategory(categoryId)
                    }
                )
            }

            if (taskUiState.locationStatusMessage != null) {
                MetroCard(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = taskUiState.locationStatusMessage ?: "",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.muted,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(
                            onClick = { taskListViewModel.clearLocationStatusMessage() },
                            modifier = Modifier.size(20.dp)
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = stringResource(R.string.home_dismiss_location),
                                tint = colors.muted
                            )
                        }
                    }
                }
            }

            if (taskUiState.nearMeEnabled) {
                NearMeRadiusFilterRow(
                    selectedRadiusMeters = taskUiState.selectedRadiusMeters,
                    onRadiusSelected = { radiusMeters ->
                        taskListViewModel.updateNearMeRadius(radiusMeters)
                    }
                )
            }

            // Task list
            if (taskUiState.isLoading && taskUiState.tasks.isEmpty()) {
                // Show shimmer loading
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(5) {
                        TaskCardShimmer()
                    }
                }
            } else if (taskUiState.error != null && taskUiState.tasks.isEmpty()) {
                ErrorState(
                    message = taskUiState.error ?: stringResource(R.string.common_error),
                    onRetry = { taskListViewModel.refresh() }
                )
            } else if (taskUiState.tasks.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = stringResource(R.string.home_no_tasks),
                        style = MaterialTheme.typography.bodyLarge,
                        color = colors.muted
                    )
                }
            } else if (taskUiState.isMapView) {
                TaskMapView(
                    tasks = taskUiState.tasks,
                    currentUserId = taskUiState.currentUserId,
                    selectedTaskId = taskUiState.selectedMapTaskId,
                    centerLatitude = taskUiState.latitude,
                    centerLongitude = taskUiState.longitude,
                    onMarkerSelected = { taskId ->
                        taskListViewModel.selectTaskOnMap(taskId)
                    },
                    onTaskClick = onNavigateToTaskDetail,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(taskUiState.tasks, key = { it.id }) { task ->
                        TaskCard(
                            task = task,
                            isOwnTask = taskUiState.currentUserId != null && task.requesterId == taskUiState.currentUserId,
                            onClick = { onNavigateToTaskDetail(task.id) }
                        )
                    }

                    // Loading indicator at the bottom
                    if (taskUiState.isLoading && taskUiState.tasks.isNotEmpty()) {
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

@Composable
fun TaskMapView(
    tasks: List<Task>,
    currentUserId: Long?,
    selectedTaskId: Long?,
    centerLatitude: Double?,
    centerLongitude: Double?,
    onMarkerSelected: (Long?) -> Unit,
    onTaskClick: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val markerSelectedState by rememberUpdatedState(onMarkerSelected)
    val mapStyleUrl = remember {
        if (BuildConfig.MAPTILER_API_KEY.isBlank()) {
            "https://demotiles.maplibre.org/style.json"
        } else {
            "https://api.maptiler.com/maps/streets/style.json?key=${BuildConfig.MAPTILER_API_KEY}"
        }
    }

    val geoTasks = remember(tasks) {
        tasks.filter { it.latitude != null && it.longitude != null }
    }
    val selectedTask = remember(tasks, selectedTaskId) {
        tasks.firstOrNull { it.id == selectedTaskId }
    }

    val mapView = remember {
        MapLibre.getInstance(context)
        MapView(context)
    }
    var map by remember { mutableStateOf<MapLibreMap?>(null) }
    var mapReady by remember { mutableStateOf(false) }

    DisposableEffect(mapView) {
        mapView.getMapAsync { maplibreMap ->
            map = maplibreMap
            maplibreMap.uiSettings.setCompassEnabled(false)
            maplibreMap.uiSettings.setLogoEnabled(false)
            maplibreMap.uiSettings.setAttributionEnabled(false)
            maplibreMap.setOnMarkerClickListener { marker ->
                val taskId = marker.snippet?.toLongOrNull()
                if (taskId != null) {
                    markerSelectedState(taskId)
                    true
                } else {
                    false
                }
            }
            maplibreMap.addOnMapClickListener {
                markerSelectedState(null)
                false
            }
            maplibreMap.setStyle(mapStyleUrl) {
                mapReady = true
            }
        }

        onDispose {
            mapReady = false
            map = null
        }
    }

    DisposableEffect(lifecycleOwner, mapView) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> mapView.onStart()
                Lifecycle.Event.ON_RESUME -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                Lifecycle.Event.ON_STOP -> mapView.onStop()
                Lifecycle.Event.ON_DESTROY -> mapView.onDestroy()
                else -> Unit
            }
        }

        lifecycleOwner.lifecycle.addObserver(observer)

        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            mapView.onStop()
            mapView.onDestroy()
        }
    }

    val targetLat = centerLatitude ?: HCMC_DEFAULT_LAT
    val targetLng = centerLongitude ?: HCMC_DEFAULT_LNG

    LaunchedEffect(map, mapReady, targetLat, targetLng) {
        val maplibreMap = map ?: return@LaunchedEffect
        if (!mapReady) return@LaunchedEffect
        maplibreMap.cameraPosition = CameraPosition.Builder()
            .target(LatLng(targetLat, targetLng))
            .zoom(MAP_DEFAULT_ZOOM)
            .build()
    }

    LaunchedEffect(map, mapReady, geoTasks) {
        val maplibreMap = map ?: return@LaunchedEffect
        if (!mapReady) return@LaunchedEffect

        maplibreMap.clear()
        geoTasks.forEach { task ->
            maplibreMap.addMarker(
                MarkerOptions()
                    .position(LatLng(task.latitude!!, task.longitude!!))
                    .title(task.title)
                    .snippet(task.id.toString())
            )
        }
    }

    Box(modifier = modifier) {
        AndroidView(
            factory = { mapView },
            modifier = Modifier.fillMaxSize()
        )

        if (!mapReady) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                MetroLoadingState()
            }
        }

        if (geoTasks.isEmpty() && mapReady) {
            MetroCard(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(16.dp)
            ) {
                Text(
                    text = stringResource(R.string.home_no_tasks_map),
                    style = MaterialTheme.typography.bodySmall,
                    color = MetroTheme.colors.muted
                )
            }
        }

        AnimatedVisibility(
            visible = selectedTask != null,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp)
        ) {
            selectedTask?.let { task ->
                TaskCard(
                    task = task,
                    isOwnTask = currentUserId != null && task.requesterId == currentUserId,
                    onClick = { onTaskClick(task.id) }
                )
            }
        }
    }
}

@Composable
fun NearMeRadiusFilterRow(
    selectedRadiusMeters: Int?,
    onRadiusSelected: (Int?) -> Unit
) {
    val radiusOptions = listOf(
        null to stringResource(R.string.home_filter_all),
        1000 to stringResource(R.string.home_filter_1km),
        3000 to stringResource(R.string.home_filter_3km),
        5000 to stringResource(R.string.home_filter_5km),
        10000 to stringResource(R.string.home_filter_10km)
    )

    val metroChipColors = FilterChipDefaults.filterChipColors(
        containerColor = MetroTheme.colors.card,
        labelColor = MetroTheme.colors.fg,
        selectedContainerColor = MetroTheme.colors.fg,
        selectedLabelColor = MetroTheme.colors.card,
    )
    val metroChipBorder = FilterChipDefaults.filterChipBorder(
        borderColor = MetroTheme.colors.border,
        selectedBorderColor = MetroTheme.colors.fg,
        borderWidth = 1.dp,
        selectedBorderWidth = 1.dp,
        enabled = true,
        selected = false,
    )
    val metroChipBorderSelected = FilterChipDefaults.filterChipBorder(
        borderColor = MetroTheme.colors.border,
        selectedBorderColor = MetroTheme.colors.fg,
        borderWidth = 1.dp,
        selectedBorderWidth = 1.dp,
        enabled = true,
        selected = true,
    )

    LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(radiusOptions, key = { option -> option.first ?: 0 }) { option ->
            val isSelected = selectedRadiusMeters == option.first
            FilterChip(
                selected = isSelected,
                onClick = { onRadiusSelected(option.first) },
                label = { Text(option.second) },
                shape = RoundedCornerShape(0.dp),
                colors = metroChipColors,
                border = if (isSelected) metroChipBorderSelected else metroChipBorder,
                elevation = null,
            )
        }
    }
}

@Composable
fun CategoryFilterRow(
    categories: List<Category>,
    selectedCategoryId: Long?,
    onCategorySelected: (Long?) -> Unit
) {
    val metroChipColors = FilterChipDefaults.filterChipColors(
        containerColor = MetroTheme.colors.card,
        labelColor = MetroTheme.colors.fg,
        selectedContainerColor = MetroTheme.colors.fg,
        selectedLabelColor = MetroTheme.colors.card,
    )
    val metroChipBorder = FilterChipDefaults.filterChipBorder(
        borderColor = MetroTheme.colors.border,
        selectedBorderColor = MetroTheme.colors.fg,
        borderWidth = 1.dp,
        selectedBorderWidth = 1.dp,
        enabled = true,
        selected = false,
    )
    val metroChipBorderSelected = FilterChipDefaults.filterChipBorder(
        borderColor = MetroTheme.colors.border,
        selectedBorderColor = MetroTheme.colors.fg,
        borderWidth = 1.dp,
        selectedBorderWidth = 1.dp,
        enabled = true,
        selected = true,
    )
    LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            FilterChip(
                selected = selectedCategoryId == null,
                onClick = { onCategorySelected(null) },
                label = { Text(stringResource(R.string.home_filter_all)) },
                shape = RoundedCornerShape(0.dp),
                colors = metroChipColors,
                border = if (selectedCategoryId == null) metroChipBorderSelected else metroChipBorder,
                elevation = null,
            )
        }
        items(categories, key = { it.id }) { category ->
            val isSelected = selectedCategoryId == category.id.toLong()
            FilterChip(
                selected = isSelected,
                onClick = { onCategorySelected(category.id.toLong()) },
                label = { Text(category.nameVi) },
                shape = RoundedCornerShape(0.dp),
                colors = metroChipColors,
                border = if (isSelected) metroChipBorderSelected else metroChipBorder,
                elevation = null,
            )
        }
    }
}

@Composable
fun TaskCardShimmer() {
    val colors = MetroTheme.colors

    MetroCard(contentPadding = PaddingValues(16.dp)) {
        // Title shimmer
        Box(
            modifier = Modifier
                .fillMaxWidth(0.7f)
                .height(20.dp)
                .clip(RoundedCornerShape(0.dp))
                .shimmerEffect()
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Description shimmer
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(16.dp)
                .clip(RoundedCornerShape(0.dp))
                .shimmerEffect()
        )

        Spacer(modifier = Modifier.height(4.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .height(16.dp)
                .clip(RoundedCornerShape(0.dp))
                .shimmerEffect()
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Bottom row shimmer
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Box(
                modifier = Modifier
                    .width(100.dp)
                    .height(16.dp)
                    .clip(RoundedCornerShape(0.dp))
                    .shimmerEffect()
            )

            Box(
                modifier = Modifier
                    .width(80.dp)
                    .height(20.dp)
                    .clip(RoundedCornerShape(0.dp))
                    .shimmerEffect()
            )
        }
    }
}

@Composable
fun Modifier.shimmerEffect(): Modifier {
    val shimmerColors = listOf(
        Color.LightGray.copy(alpha = 0.6f),
        Color.LightGray.copy(alpha = 0.2f),
        Color.LightGray.copy(alpha = 0.6f)
    )

    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer"
    )

    val brush = Brush.linearGradient(
        colors = shimmerColors,
        start = androidx.compose.ui.geometry.Offset(translateAnim, translateAnim),
        end = androidx.compose.ui.geometry.Offset(translateAnim + 200f, translateAnim + 200f)
    )

    return this.background(brush)
}
