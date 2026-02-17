package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.models.User
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import retrofit2.http.*

interface UserApi {
    @GET("users/{id}")
    suspend fun getUserProfile(@Path("id") userId: Long): User

    @GET("users/me")
    suspend fun getMyProfile(): User

    @PUT("users/me")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): User

    @POST("users/become-tasker")
    suspend fun becomeTasker(): User
}

@JsonClass(generateAdapter = true)
data class UpdateProfileRequest(
    @Json(name = "name") val name: String? = null,
    @Json(name = "avatar_url") val avatarUrl: String? = null,
    @Json(name = "phone") val phone: String? = null,
    @Json(name = "bio") val bio: String? = null
)
