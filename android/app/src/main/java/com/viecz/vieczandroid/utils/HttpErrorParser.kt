package com.viecz.vieczandroid.utils

import com.squareup.moshi.Moshi
import com.viecz.vieczandroid.data.api.ErrorResponse
import retrofit2.HttpException

/**
 * Parse HTTP error response to extract the error message
 */
fun HttpException.parseErrorMessage(): String {
    return try {
        val errorBody = response()?.errorBody()?.string()
        if (errorBody != null) {
            val moshi = Moshi.Builder().build()
            val adapter = moshi.adapter(ErrorResponse::class.java)
            val errorResponse = adapter.fromJson(errorBody)
            errorResponse?.error ?: message()
        } else {
            message()
        }
    } catch (e: Exception) {
        // If parsing fails, return the HTTP status message
        message()
    }
}
