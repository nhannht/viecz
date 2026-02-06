package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.models.Category
import retrofit2.http.GET

interface CategoryApi {
    @GET("categories")
    suspend fun getCategories(): List<Category>
}
