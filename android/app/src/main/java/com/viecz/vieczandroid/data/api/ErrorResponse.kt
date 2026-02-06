package com.viecz.vieczandroid.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ErrorResponse(
    @Json(name = "error") val error: String
)
