package com.viecz.vieczandroid.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.PointF
import android.location.LocationManager
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.zIndex
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.google.gson.JsonObject
import com.google.gson.JsonArray
import com.viecz.vieczandroid.BuildConfig
import com.viecz.vieczandroid.R
import com.viecz.vieczandroid.data.api.NominatimResult
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
import com.viecz.vieczandroid.ui.viewmodels.TaskListUiState
import kotlinx.coroutines.launch
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.style.expressions.Expression
import org.maplibre.android.style.layers.CircleLayer
import org.maplibre.android.style.layers.PropertyFactory
import org.maplibre.android.style.sources.GeoJsonSource
import kotlin.math.*

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

    if (taskUiState.isMapView) {
        // Map view: render TaskMapView directly (no PullToRefresh wrapping)
        TaskMapView(
            uiState = taskUiState,
            onMarkerSelected = { taskId -> taskListViewModel.selectTaskOnMap(taskId) },
            onTaskClick = onNavigateToTaskDetail,
            onCameraMoved = { center -> taskListViewModel.onMapCameraMoved(center) },
            onSearchArea = { lat, lng, radius -> taskListViewModel.searchArea(lat, lng, radius) },
            onMapSearchQueryChanged = { taskListViewModel.updateMapSearchQuery(it) },
            onClearGeocodeSuggestions = { taskListViewModel.clearGeocodeSuggestions() },
            onToggleSearchBar = { taskListViewModel.toggleMapSearchBar() },
            modifier = modifier.fillMaxSize()
        )
    } else {
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
}

// ── TaskMapView with bottom sheet, search bar, re-search button, user location dot ──

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskMapView(
    uiState: TaskListUiState,
    onMarkerSelected: (Long?) -> Unit,
    onTaskClick: (Long) -> Unit,
    onCameraMoved: (LatLng) -> Unit,
    onSearchArea: (Double, Double, Int) -> Unit,
    onMapSearchQueryChanged: (String) -> Unit,
    onClearGeocodeSuggestions: () -> Unit,
    onToggleSearchBar: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val coroutineScope = rememberCoroutineScope()
    val markerSelectedState by rememberUpdatedState(onMarkerSelected)
    val onCameraMovedState by rememberUpdatedState(onCameraMoved)

    val mapStyleUrl = remember {
        if (BuildConfig.MAPTILER_API_KEY.isBlank()) {
            "https://demotiles.maplibre.org/style.json"
        } else {
            "https://api.maptiler.com/maps/streets/style.json?key=${BuildConfig.MAPTILER_API_KEY}"
        }
    }

    val geoTasks = remember(uiState.tasks) {
        uiState.tasks.filter { it.latitude != null && it.longitude != null }
    }

    val mapView = remember {
        MapLibre.getInstance(context)
        MapView(context)
    }
    var map by remember { mutableStateOf<MapLibreMap?>(null) }
    var mapReady by remember { mutableStateOf(false) }
    // Track whether initial camera has been set to avoid re-centering on every recomposition
    var initialCameraSet by remember { mutableStateOf(false) }
    // Suppress camera-moved callback when programmatically moving the camera
    var suppressCameraCallback by remember { mutableStateOf(false) }

    // User location state
    var userLocation by remember { mutableStateOf<LatLng?>(null) }

    // Bottom sheet
    val sheetState = rememberBottomSheetScaffoldState(
        bottomSheetState = rememberStandardBottomSheetState(
            initialValue = SheetValue.PartiallyExpanded
        )
    )
    val sheetListState = rememberLazyListState()

    // Map initialization
    DisposableEffect(mapView) {
        mapView.getMapAsync { maplibreMap ->
            map = maplibreMap
            maplibreMap.uiSettings.setCompassEnabled(false)
            maplibreMap.uiSettings.setLogoEnabled(false)
            maplibreMap.uiSettings.setAttributionEnabled(false)

            // Click on map: query task marker layers, or deselect
            maplibreMap.addOnMapClickListener { latLng ->
                val screenPoint = maplibreMap.projection.toScreenLocation(latLng)
                // Query a 40px tap area around the click point for easier tapping
                val halfTap = 40f
                val rect = android.graphics.RectF(
                    screenPoint.x - halfTap, screenPoint.y - halfTap,
                    screenPoint.x + halfTap, screenPoint.y + halfTap
                )
                val features = maplibreMap.queryRenderedFeatures(
                    rect, "task-markers-layer", "task-markers-ring"
                )
                if (features.isNotEmpty()) {
                    val props = features[0].properties()
                    val taskId = props?.get("taskId")?.asString?.toLongOrNull()
                    if (taskId != null) {
                        markerSelectedState(taskId)
                    } else {
                        markerSelectedState(null)
                    }
                } else {
                    markerSelectedState(null)
                }
                true
            }
            // Camera idle listener for "re-search this area"
            maplibreMap.addOnCameraIdleListener {
                if (!suppressCameraCallback) {
                    val center = maplibreMap.cameraPosition.target
                    if (center != null) {
                        onCameraMovedState(center)
                    }
                }
                suppressCameraCallback = false
            }
            maplibreMap.setStyle(mapStyleUrl) { style ->
                val emptyGeoJson = JsonObject().apply {
                    addProperty("type", "FeatureCollection")
                    add("features", JsonArray())
                }
                val emptyJson = emptyGeoJson.toString()

                // ── Task markers source + layers ──
                style.addSource(GeoJsonSource("task-markers-source", emptyJson))

                // Outer ring (selected highlight)
                style.addLayer(
                    CircleLayer("task-markers-ring", "task-markers-source").withProperties(
                        PropertyFactory.circleRadius(14f),
                        PropertyFactory.circleColor("#FF6B35"),
                        PropertyFactory.circleOpacity(0.25f)
                    )
                )
                // Main marker dot
                style.addLayer(
                    CircleLayer("task-markers-layer", "task-markers-source").withProperties(
                        PropertyFactory.circleRadius(9f),
                        PropertyFactory.circleColor("#FF6B35"),
                        PropertyFactory.circleStrokeColor("#FFFFFF"),
                        PropertyFactory.circleStrokeWidth(2.5f)
                    )
                )

                // ── User location source + layers ──
                style.addSource(GeoJsonSource("user-location-source", emptyJson))

                // Outer pulse circle (translucent)
                style.addLayer(
                    CircleLayer("user-location-pulse", "user-location-source").withProperties(
                        PropertyFactory.circleRadius(16f),
                        PropertyFactory.circleColor("#4285F4"),
                        PropertyFactory.circleOpacity(0.2f)
                    )
                )
                // Inner solid dot
                style.addLayer(
                    CircleLayer("user-location-layer", "user-location-source").withProperties(
                        PropertyFactory.circleRadius(8f),
                        PropertyFactory.circleColor("#4285F4"),
                        PropertyFactory.circleStrokeColor("#FFFFFF"),
                        PropertyFactory.circleStrokeWidth(2.5f)
                    )
                )
                mapReady = true
            }
        }

        onDispose {
            mapReady = false
            map = null
        }
    }

    // Lifecycle
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

    // Initial camera position (only once)
    LaunchedEffect(map, mapReady) {
        val maplibreMap = map ?: return@LaunchedEffect
        if (!mapReady || initialCameraSet) return@LaunchedEffect

        val targetLat = uiState.latitude ?: HCMC_DEFAULT_LAT
        val targetLng = uiState.longitude ?: HCMC_DEFAULT_LNG
        suppressCameraCallback = true
        maplibreMap.cameraPosition = CameraPosition.Builder()
            .target(LatLng(targetLat, targetLng))
            .zoom(MAP_DEFAULT_ZOOM)
            .build()
        initialCameraSet = true
    }

    // Update task markers via GeoJsonSource (stable, no flicker)
    LaunchedEffect(map, mapReady, geoTasks) {
        val maplibreMap = map ?: return@LaunchedEffect
        if (!mapReady) return@LaunchedEffect
        val style = maplibreMap.style ?: return@LaunchedEffect

        val features = JsonArray()
        geoTasks.forEach { task ->
            val point = JsonObject().apply {
                addProperty("type", "Point")
                add("coordinates", JsonArray().apply {
                    add(task.longitude!!)
                    add(task.latitude!!)
                })
            }
            val props = JsonObject().apply {
                addProperty("taskId", task.id.toString())
                addProperty("title", task.title)
            }
            features.add(JsonObject().apply {
                addProperty("type", "Feature")
                add("geometry", point)
                add("properties", props)
            })
        }
        val featureCollection = JsonObject().apply {
            addProperty("type", "FeatureCollection")
            add("features", features)
        }
        val source = style.getSourceAs<GeoJsonSource>("task-markers-source")
        source?.setGeoJson(featureCollection.toString())
    }

    // Update user location dot
    LaunchedEffect(map, mapReady, userLocation) {
        val maplibreMap = map ?: return@LaunchedEffect
        if (!mapReady) return@LaunchedEffect
        val loc = userLocation ?: return@LaunchedEffect
        val style = maplibreMap.style ?: return@LaunchedEffect

        val point = JsonObject().apply {
            addProperty("type", "Point")
            add("coordinates", JsonArray().apply {
                add(loc.longitude)
                add(loc.latitude)
            })
        }
        val feature = JsonObject().apply {
            addProperty("type", "Feature")
            add("geometry", point)
            add("properties", JsonObject())
        }
        val featureCollection = JsonObject().apply {
            addProperty("type", "FeatureCollection")
            add("features", JsonArray().apply { add(feature) })
        }
        val source = style.getSourceAs<GeoJsonSource>("user-location-source")
        source?.setGeoJson(featureCollection.toString())
    }

    // When a task is selected via marker, scroll the bottom sheet list
    val selectedTaskIndex = remember(geoTasks, uiState.selectedMapTaskId) {
        if (uiState.selectedMapTaskId != null) {
            geoTasks.indexOfFirst { it.id == uiState.selectedMapTaskId }
        } else -1
    }

    LaunchedEffect(selectedTaskIndex) {
        if (selectedTaskIndex >= 0) {
            // Expand sheet so task list is visible, then scroll to the selected task
            sheetState.bottomSheetState.expand()
            sheetListState.animateScrollToItem(selectedTaskIndex)
        }
    }

    // ── UI Layout ──

    BottomSheetScaffold(
        scaffoldState = sheetState,
        sheetPeekHeight = 72.dp,
        sheetContainerColor = MetroTheme.colors.card,
        sheetContentColor = MetroTheme.colors.fg,
        sheetContent = {
            // Drag handle is automatic with BottomSheetScaffold
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                // Header: task count
                Text(
                    text = stringResource(R.string.map_tasks_count, geoTasks.size),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                if (geoTasks.isEmpty()) {
                    Text(
                        text = stringResource(R.string.map_no_tasks_in_area),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MetroTheme.colors.muted,
                        modifier = Modifier.padding(vertical = 16.dp)
                    )
                } else {
                    LazyColumn(
                        state = sheetListState,
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 400.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(bottom = 16.dp)
                    ) {
                        items(geoTasks, key = { it.id }) { task ->
                            val isSelected = task.id == uiState.selectedMapTaskId
                            Surface(
                                color = if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                else Color.Transparent,
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                TaskCard(
                                    task = task,
                                    isOwnTask = uiState.currentUserId != null && task.requesterId == uiState.currentUserId,
                                    onClick = { onTaskClick(task.id) }
                                )
                            }
                        }
                    }
                }
            }
        },
        modifier = modifier
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Map
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

            // Search bar overlay at top
            AnimatedVisibility(
                visible = uiState.showMapSearchBar,
                enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 8.dp, start = 16.dp, end = 16.dp)
                    .zIndex(10f)
            ) {
                Column {
                    MetroInput(
                        value = uiState.mapSearchQuery,
                        onValueChange = { onMapSearchQueryChanged(it) },
                        placeholder = stringResource(R.string.map_search_placeholder),
                        leadingIcon = {
                            Icon(Icons.Default.Search, contentDescription = null, tint = MetroTheme.colors.muted)
                        },
                        trailingIcon = {
                            IconButton(onClick = { onClearGeocodeSuggestions() }) {
                                Icon(Icons.Default.Close, contentDescription = stringResource(R.string.home_clear_search), tint = MetroTheme.colors.muted)
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(4.dp, RoundedCornerShape(4.dp))
                    )

                    // Geocode suggestions dropdown
                    if (uiState.geocodeSuggestions.isNotEmpty()) {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .shadow(4.dp, RoundedCornerShape(4.dp)),
                            color = MetroTheme.colors.card,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Column {
                                uiState.geocodeSuggestions.forEach { result ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                val lat = result.lat.toDoubleOrNull() ?: return@clickable
                                                val lng = result.lon.toDoubleOrNull() ?: return@clickable
                                                // Animate camera to suggestion
                                                map?.let { maplibreMap ->
                                                    suppressCameraCallback = true
                                                    maplibreMap.animateCamera(
                                                        CameraUpdateFactory.newLatLngZoom(
                                                            LatLng(lat, lng), 15.0
                                                        ),
                                                        1000
                                                    )
                                                }
                                                // Search area at suggestion location
                                                onSearchArea(lat, lng, 5000)
                                                onClearGeocodeSuggestions()
                                                onToggleSearchBar()
                                            }
                                            .padding(horizontal = 12.dp, vertical = 10.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            Icons.Default.Search,
                                            contentDescription = null,
                                            tint = MetroTheme.colors.muted,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = result.displayName,
                                            style = MaterialTheme.typography.bodySmall,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis,
                                            color = MetroTheme.colors.fg
                                        )
                                    }
                                    if (result != uiState.geocodeSuggestions.last()) {
                                        HorizontalDivider(color = MetroTheme.colors.border)
                                    }
                                }
                            }
                        }
                    }

                    if (uiState.isGeocodingLoading) {
                        LinearProgressIndicator(
                            modifier = Modifier.fillMaxWidth(),
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            // Search bar toggle FAB (top-left, below status bar)
            if (!uiState.showMapSearchBar) {
                SmallFloatingActionButton(
                    onClick = { onToggleSearchBar() },
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(start = 16.dp, top = 12.dp)
                        .zIndex(5f),
                    containerColor = MetroTheme.colors.card,
                    contentColor = MetroTheme.colors.fg
                ) {
                    Icon(Icons.Default.Search, contentDescription = stringResource(R.string.main_search))
                }
            }

            // "Re-search this area" button
            AnimatedVisibility(
                visible = uiState.mapCameraMoved && mapReady,
                enter = fadeIn(),
                exit = fadeOut(),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = if (uiState.showMapSearchBar) 80.dp else 12.dp)
                    .zIndex(5f)
            ) {
                Button(
                    onClick = {
                        map?.let { maplibreMap ->
                            val center = maplibreMap.cameraPosition.target ?: return@let
                            val bounds = maplibreMap.projection.visibleRegion.latLngBounds
                            val ne = bounds.northEast
                            val sw = bounds.southWest
                            val diagonalMeters = haversineDistance(
                                ne.latitude, ne.longitude,
                                sw.latitude, sw.longitude
                            )
                            val radius = (diagonalMeters / 2).toInt().coerceAtMost(50000)
                            onSearchArea(center.latitude, center.longitude, radius)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MetroTheme.colors.fg,
                        contentColor = MetroTheme.colors.card
                    ),
                    shape = RoundedCornerShape(4.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
                ) {
                    Text(
                        text = stringResource(R.string.map_search_this_area),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // My-location FAB (bottom-right, above bottom sheet peek)
            SmallFloatingActionButton(
                onClick = {
                    // Get current location and animate camera
                    val hasFine = ContextCompat.checkSelfPermission(
                        context, Manifest.permission.ACCESS_FINE_LOCATION
                    ) == PackageManager.PERMISSION_GRANTED
                    val hasCoarse = ContextCompat.checkSelfPermission(
                        context, Manifest.permission.ACCESS_COARSE_LOCATION
                    ) == PackageManager.PERMISSION_GRANTED

                    if (hasFine || hasCoarse) {
                        val locationManager = context.getSystemService(android.content.Context.LOCATION_SERVICE) as? LocationManager
                        val lastKnown = locationManager?.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                            ?: locationManager?.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                        if (lastKnown != null) {
                            val loc = LatLng(lastKnown.latitude, lastKnown.longitude)
                            userLocation = loc
                            suppressCameraCallback = true
                            map?.animateCamera(
                                CameraUpdateFactory.newLatLngZoom(loc, 15.0),
                                1000
                            )
                        }
                    }
                },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 16.dp, bottom = 80.dp)
                    .zIndex(5f),
                containerColor = MetroTheme.colors.card,
                contentColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.MyLocation, contentDescription = stringResource(R.string.map_my_location))
            }

            // Loading overlay
            if (uiState.isLoading && mapReady) {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter)
                        .zIndex(15f),
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

/** Haversine distance in meters between two lat/lng points. */
private fun haversineDistance(
    lat1: Double, lon1: Double,
    lat2: Double, lon2: Double
): Double {
    val r = 6371000.0 // Earth radius in meters
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = sin(dLat / 2).pow(2) +
            cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
            sin(dLon / 2).pow(2)
    val c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c
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
