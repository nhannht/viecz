package com.viecz.vieczandroid.ui.components.metro

import android.util.Log
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.viecz.vieczandroid.BuildConfig
import com.viecz.vieczandroid.R
import com.viecz.vieczandroid.data.api.NominatimResult
import com.viecz.vieczandroid.ui.theme.MetroTheme
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.style.layers.CircleLayer
import org.maplibre.android.style.layers.PropertyFactory
import org.maplibre.android.style.sources.GeoJsonSource
import org.maplibre.geojson.Feature
import org.maplibre.geojson.FeatureCollection
import org.maplibre.geojson.Point

private const val TAG = "MetroLocationPicker"
private const val HCMC_LAT = 10.7769
private const val HCMC_LNG = 106.7009
private const val MARKER_SOURCE_ID = "marker-source"
private const val MARKER_LAYER_ID = "marker-layer"

data class LocationPickerValue(
    val location: String = "",
    val latitude: Double? = null,
    val longitude: Double? = null
)

/**
 * nhannht-metro-meow Location Picker.
 *
 * Autocomplete search field + MapLibre map with tap-to-place marker.
 * Tapping the map places a marker and reverse-geocodes the address.
 * Selecting a search result flies the map to that location.
 */
@Composable
fun MetroLocationPicker(
    value: LocationPickerValue,
    onValueChange: (LocationPickerValue) -> Unit,
    onSearch: suspend (String) -> List<NominatimResult>,
    onReverseGeocode: suspend (Double, Double) -> String?,
    modifier: Modifier = Modifier,
    label: String = "",
    error: String = "",
) {
    val colors = MetroTheme.colors
    val scope = rememberCoroutineScope()
    var searchQuery by remember { mutableStateOf(value.location) }
    var searchResults by remember { mutableStateOf<List<NominatimResult>>(emptyList()) }
    var showResults by remember { mutableStateOf(false) }
    var searchJob by remember { mutableStateOf<Job?>(null) }

    // Sync external value changes into the search field
    LaunchedEffect(value.location) {
        if (value.location != searchQuery && value.location.isNotEmpty()) {
            searchQuery = value.location
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        // Search input
        MetroInput(
            value = searchQuery,
            onValueChange = { query ->
                searchQuery = query
                if (query.length >= 2) {
                    searchJob?.cancel()
                    searchJob = scope.launch {
                        delay(300)
                        try {
                            val results = onSearch(query)
                            searchResults = results
                            showResults = results.isNotEmpty()
                        } catch (e: Exception) {
                            Log.e(TAG, "Search failed", e)
                            searchResults = emptyList()
                        }
                    }
                } else {
                    showResults = false
                    searchResults = emptyList()
                }
            },
            label = label,
            placeholder = stringResource(R.string.location_picker_search_placeholder),
            error = error,
            leadingIcon = {
                Icon(Icons.Default.Search, contentDescription = null, tint = colors.muted)
            },
            trailingIcon = if (searchQuery.isNotEmpty()) {
                {
                    IconButton(onClick = {
                        searchQuery = ""
                        showResults = false
                        searchResults = emptyList()
                        onValueChange(LocationPickerValue())
                    }) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = colors.muted)
                    }
                }
            } else null,
        )

        // Search results dropdown
        AnimatedVisibility(visible = showResults) {
            MetroCard(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(0.dp),
            ) {
                LazyColumn(
                    modifier = Modifier.heightIn(max = 200.dp)
                ) {
                    items(searchResults, key = { it.placeId }) { result ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    val lat = result.lat.toDoubleOrNull() ?: return@clickable
                                    val lng = result.lon.toDoubleOrNull() ?: return@clickable
                                    searchQuery = result.displayName
                                    showResults = false
                                    onValueChange(
                                        LocationPickerValue(
                                            location = result.displayName,
                                            latitude = lat,
                                            longitude = lng
                                        )
                                    )
                                }
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.LocationOn,
                                contentDescription = null,
                                tint = colors.muted,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = result.displayName,
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.fg,
                                maxLines = 2
                            )
                        }
                        HorizontalDivider(color = colors.border)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Map with tap-to-place
        LocationPickerMap(
            latitude = value.latitude,
            longitude = value.longitude,
            onMapTap = { lat, lng ->
                onValueChange(value.copy(latitude = lat, longitude = lng))
                scope.launch {
                    val address = onReverseGeocode(lat, lng)
                    if (address != null) {
                        searchQuery = address
                        onValueChange(
                            LocationPickerValue(
                                location = address,
                                latitude = lat,
                                longitude = lng
                            )
                        )
                    }
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
        )

        // Coordinates label
        if (value.latitude != null && value.longitude != null) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "${String.format("%.6f", value.latitude)}, ${String.format("%.6f", value.longitude)}",
                style = MaterialTheme.typography.labelSmall,
                color = colors.muted,
            )
        }
    }
}

/**
 * Read-only map preview for task detail screen.
 * Shows a single marker at the given coordinates.
 */
@Composable
fun MetroLocationPreview(
    latitude: Double,
    longitude: Double,
    modifier: Modifier = Modifier
) {
    LocationPickerMap(
        latitude = latitude,
        longitude = longitude,
        onMapTap = null,
        modifier = modifier
    )
}

@Composable
private fun LocationPickerMap(
    latitude: Double?,
    longitude: Double?,
    onMapTap: ((Double, Double) -> Unit)?,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val mapTapState by rememberUpdatedState(onMapTap)
    val mapStyleUrl = remember {
        if (BuildConfig.MAPTILER_API_KEY.isBlank()) {
            "https://demotiles.maplibre.org/style.json"
        } else {
            "https://api.maptiler.com/maps/streets/style.json?key=${BuildConfig.MAPTILER_API_KEY}"
        }
    }

    val mapView = remember {
        MapLibre.getInstance(context)
        MapView(context)
    }
    var map by remember { mutableStateOf<MapLibreMap?>(null) }
    var mapReady by remember { mutableStateOf(false) }

    // Initialize map
    DisposableEffect(mapView) {
        mapView.getMapAsync { maplibreMap ->
            map = maplibreMap
            maplibreMap.uiSettings.setCompassEnabled(false)
            maplibreMap.uiSettings.setLogoEnabled(false)
            maplibreMap.uiSettings.setAttributionEnabled(false)
            maplibreMap.addOnMapClickListener { latLng ->
                mapTapState?.invoke(latLng.latitude, latLng.longitude)
                mapTapState != null
            }
            maplibreMap.setStyle(mapStyleUrl) { style ->
                val source = GeoJsonSource(MARKER_SOURCE_ID, FeatureCollection.fromFeatures(emptyList()))
                style.addSource(source)
                val circleLayer = CircleLayer(MARKER_LAYER_ID, MARKER_SOURCE_ID).withProperties(
                    PropertyFactory.circleRadius(10f),
                    PropertyFactory.circleColor("#FF4444"),
                    PropertyFactory.circleStrokeColor("#FFFFFF"),
                    PropertyFactory.circleStrokeWidth(2f)
                )
                style.addLayer(circleLayer)
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

    // Camera + marker
    LaunchedEffect(map, mapReady, latitude, longitude) {
        val maplibreMap = map ?: return@LaunchedEffect
        if (!mapReady) return@LaunchedEffect

        val targetLat = latitude ?: HCMC_LAT
        val targetLng = longitude ?: HCMC_LNG
        val zoom = if (latitude != null) 16.0 else 13.0

        maplibreMap.animateCamera(
            CameraUpdateFactory.newCameraPosition(
                CameraPosition.Builder()
                    .target(LatLng(targetLat, targetLng))
                    .zoom(zoom)
                    .build()
            ),
            500
        )

        val source = maplibreMap.style?.getSourceAs<GeoJsonSource>(MARKER_SOURCE_ID)
        if (latitude != null && longitude != null) {
            val point = Point.fromLngLat(longitude, latitude)
            source?.setGeoJson(FeatureCollection.fromFeature(Feature.fromGeometry(point)))
        } else {
            source?.setGeoJson(FeatureCollection.fromFeatures(emptyList()))
        }
    }

    MetroCard(
        modifier = modifier,
        contentPadding = PaddingValues(0.dp),
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
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
        }
    }
}
