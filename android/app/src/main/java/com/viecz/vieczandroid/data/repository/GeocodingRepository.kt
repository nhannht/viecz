package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.GeocodingApi
import com.viecz.vieczandroid.data.api.NominatimResult

class GeocodingRepository(private val api: GeocodingApi) {
    companion object {
        private const val TAG = "GeocodingRepository"
        // HCMC bias box (~50km around center)
        private const val HCMC_LAT = 10.7769
        private const val HCMC_LNG = 106.7009
        private const val BIAS_DELTA = 0.5
    }

    suspend fun search(query: String): Result<List<NominatimResult>> {
        return try {
            val viewbox = "${HCMC_LNG - BIAS_DELTA},${HCMC_LAT - BIAS_DELTA},${HCMC_LNG + BIAS_DELTA},${HCMC_LAT + BIAS_DELTA}"
            val results = api.search(query = query, viewbox = viewbox, bounded = "0")
            Result.success(results)
        } catch (e: Exception) {
            Log.e(TAG, "Geocode search failed", e)
            Result.failure(e)
        }
    }

    suspend fun reverse(lat: Double, lon: Double): Result<NominatimResult> {
        return try {
            val result = api.reverse(lat = lat, lon = lon)
            Result.success(result)
        } catch (e: Exception) {
            Log.e(TAG, "Reverse geocode failed", e)
            Result.failure(e)
        }
    }
}
