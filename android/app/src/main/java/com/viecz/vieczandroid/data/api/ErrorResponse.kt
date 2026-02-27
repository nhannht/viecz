package com.viecz.vieczandroid.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ErrorResponse(
    @Json(name = "error") val error: String
)

/**
 * Structured error response when the server rejects an action because the
 * user's profile is missing required fields. HTTP 403 with error="profile_incomplete".
 */
@JsonClass(generateAdapter = true)
data class ProfileIncompleteResponse(
    @Json(name = "error") val error: String,
    @Json(name = "missing_fields") val missingFields: List<String>,
    @Json(name = "action") val action: String,
    @Json(name = "message") val message: String,
)

/**
 * Exception carrying structured profile-incomplete data.
 * ViewModels check for this type to show the profile completion bottom sheet
 * instead of a generic error message.
 */
class ProfileIncompleteException(
    val missingFields: List<String>,
    val action: String,
    override val message: String,
) : Exception(message)
