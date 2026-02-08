package com.viecz.vieczandroid.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class ErrorResponseTest {

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    @Test
    fun `ErrorResponse can be created with error message`() {
        val error = ErrorResponse(error = "Something went wrong")
        assertEquals("Something went wrong", error.error)
    }

    @Test
    fun `ErrorResponse can be deserialized from JSON`() {
        val json = """{"error":"Invalid credentials"}"""
        val adapter = moshi.adapter(ErrorResponse::class.java)
        val result = adapter.fromJson(json)

        assertNotNull(result)
        assertEquals("Invalid credentials", result.error)
    }

    @Test
    fun `ErrorResponse can be serialized to JSON`() {
        val error = ErrorResponse(error = "Not found")
        val adapter = moshi.adapter(ErrorResponse::class.java)
        val json = adapter.toJson(error)

        assert(json.contains("\"error\":\"Not found\""))
    }

    @Test
    fun `ErrorResponse supports copy`() {
        val original = ErrorResponse(error = "Original")
        val copy = original.copy(error = "Modified")
        assertEquals("Modified", copy.error)
        assertEquals("Original", original.error)
    }
}
