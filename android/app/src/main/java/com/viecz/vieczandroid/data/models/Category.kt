package com.viecz.vieczandroid.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Category(
    @Json(name = "id") val id: Int,
    @Json(name = "name") val name: String,
    @Json(name = "name_vi") val nameVi: String,
    @Json(name = "icon") val icon: String? = null,
    @Json(name = "is_active") val isActive: Boolean = true
)

@JsonClass(generateAdapter = true)
data class CategoriesResponse(
    @Json(name = "categories") val categories: List<Category>
)
