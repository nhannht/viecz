package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.models.CategoriesResponse
import retrofit2.http.GET

interface CategoryApi {
    @GET("categories")
    suspend fun getCategories(): CategoriesResponse
}
