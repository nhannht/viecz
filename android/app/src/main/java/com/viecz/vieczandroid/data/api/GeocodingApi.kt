package com.viecz.vieczandroid.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import retrofit2.http.GET
import retrofit2.http.Query

@JsonClass(generateAdapter = true)
data class NominatimResult(
    @Json(name = "place_id") val placeId: Long,
    @Json(name = "display_name") val displayName: String,
    @Json(name = "lat") val lat: String,
    @Json(name = "lon") val lon: String,
    @Json(name = "type") val type: String,
    @Json(name = "name") val name: String? = null
)

interface GeocodingApi {
    @GET("geocode/search")
    suspend fun search(
        @Query("q") query: String,
        @Query("limit") limit: Int = 5,
        @Query("countrycodes") countryCodes: String = "VN",
        @Query("language") language: String = "vi,en",
        @Query("viewbox") viewbox: String? = null,
        @Query("bounded") bounded: String? = null
    ): List<NominatimResult>

    @GET("geocode/reverse")
    suspend fun reverse(
        @Query("lat") lat: Double,
        @Query("lon") lon: Double,
        @Query("language") language: String = "vi,en"
    ): NominatimResult
}
