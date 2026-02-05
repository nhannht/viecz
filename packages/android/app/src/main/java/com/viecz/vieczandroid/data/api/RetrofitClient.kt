package com.viecz.vieczandroid.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

object RetrofitClient {
    // Using ADB reverse port forwarding: adb reverse tcp:8080 tcp:8080
    // This works for both emulator and physical devices
    private const val BASE_URL = "http://localhost:8080/api/v1/"

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .build()

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    val paymentApi: PaymentApi = retrofit.create(PaymentApi::class.java)
    val authApi: AuthApi = retrofit.create(AuthApi::class.java)
    val taskApi: TaskApi = retrofit.create(TaskApi::class.java)
    val categoryApi: CategoryApi = retrofit.create(CategoryApi::class.java)
    val userApi: UserApi = retrofit.create(UserApi::class.java)
}
