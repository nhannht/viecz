package com.viecz.vieczandroid.utils

import java.text.NumberFormat
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.*

/**
 * Formats a long amount as Vietnamese currency (VND)
 */
fun formatCurrency(amount: Long): String {
    val formatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"))
    return formatter.format(amount)
}

/**
 * Formats an ISO 8601 datetime string to a readable format
 */
fun formatDateTime(isoString: String): String {
    return try {
        val instant = Instant.parse(isoString)
        val formatter = DateTimeFormatter
            .ofPattern("MMM dd, yyyy HH:mm")
            .withZone(ZoneId.systemDefault())
        formatter.format(instant)
    } catch (e: Exception) {
        isoString
    }
}
