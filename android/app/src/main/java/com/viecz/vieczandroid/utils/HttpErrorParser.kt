package com.viecz.vieczandroid.utils

import com.squareup.moshi.Moshi
import com.viecz.vieczandroid.data.api.ErrorResponse
import com.viecz.vieczandroid.data.api.ProfileIncompleteException
import com.viecz.vieczandroid.data.api.ProfileIncompleteResponse
import retrofit2.HttpException

/**
 * Parse HTTP error response to extract the error message.
 * For 403 profile_incomplete responses, throws [ProfileIncompleteException]
 * so callers can show the profile completion bottom sheet.
 */
fun HttpException.parseErrorMessage(): String {
    return try {
        val errorBody = response()?.errorBody()?.string()
        if (errorBody != null) {
            // Check for profile_incomplete structured response (HTTP 403)
            if (code() == 403) {
                val moshi = Moshi.Builder().build()
                val profileAdapter = moshi.adapter(ProfileIncompleteResponse::class.java)
                val profileResponse = profileAdapter.fromJson(errorBody)
                if (profileResponse != null && profileResponse.error == "profile_incomplete") {
                    throw ProfileIncompleteException(
                        missingFields = profileResponse.missingFields,
                        action = profileResponse.action,
                        message = profileResponse.message,
                    )
                }
            }
            val moshi = Moshi.Builder().build()
            val adapter = moshi.adapter(ErrorResponse::class.java)
            val errorResponse = adapter.fromJson(errorBody)
            errorResponse?.error ?: message()
        } else {
            message()
        }
    } catch (e: ProfileIncompleteException) {
        throw e // Re-throw — don't swallow this
    } catch (e: Exception) {
        // If parsing fails, return the HTTP status message
        message()
    }
}
