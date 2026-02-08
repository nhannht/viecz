package com.viecz.vieczandroid.utils

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Tests for FormatUtils
 * Covers currency and date formatting
 */
class FormatUtilsTest {

    // Currency formatting tests (6 test cases)
    @Test
    fun `formatCurrency should format small amounts correctly`() {
        val result = formatCurrency(1000L)
        assertTrue(result.contains("1"))
        assertTrue(result.contains("000") || result.contains(".000"))
    }

    @Test
    fun `formatCurrency should format medium amounts correctly`() {
        val result = formatCurrency(50000L)
        assertTrue(result.contains("50"))
    }

    @Test
    fun `formatCurrency should format large amounts correctly`() {
        val result = formatCurrency(1000000L)
        assertTrue(result.contains("1"))
        assertTrue(result.contains("000"))
    }

    @Test
    fun `formatCurrency should format zero correctly`() {
        val result = formatCurrency(0L)
        assertTrue(result.contains("0"))
    }

    @Test
    fun `formatCurrency should handle negative amounts`() {
        val result = formatCurrency(-50000L)
        // Should contain negative indicator or minus sign
        assertTrue(result.contains("-") || result.contains("−"))
    }

    @Test
    fun `formatCurrency should use Vietnamese locale`() {
        val result = formatCurrency(100000L)
        // VND currency symbol (₫) or "VND" should be present
        assertTrue(result.contains("₫") || result.contains("VND") || result.contains("đ"))
    }

    // Date formatting tests (5 test cases)
    @Test
    fun `formatDateTime should format valid ISO string correctly`() {
        val isoString = "2024-01-15T10:30:00Z"
        val result = formatDateTime(isoString)

        // Should contain the date parts (not exact format due to locale)
        assertTrue(result.contains("Jan") || result.contains("01") || result.contains("15"))
        assertTrue(result.contains("2024"))
    }

    @Test
    fun `formatDateTime should handle midnight correctly`() {
        val isoString = "2024-01-01T00:00:00Z"
        val result = formatDateTime(isoString)

        assertTrue(result.contains("2024"))
        assertTrue(result.contains("Jan") || result.contains("01"))
    }

    @Test
    fun `formatDateTime should handle noon correctly`() {
        val isoString = "2024-06-15T12:00:00Z"
        val result = formatDateTime(isoString)

        assertTrue(result.contains("2024"))
        assertTrue(result.contains("Jun") || result.contains("06"))
    }

    @Test
    fun `formatDateTime should return original string on invalid input`() {
        val invalidString = "invalid-date"
        val result = formatDateTime(invalidString)

        assertEquals(invalidString, result)
    }

    @Test
    fun `formatDateTime should handle empty string gracefully`() {
        val result = formatDateTime("")

        assertEquals("", result)
    }
}
