package com.viecz.vieczandroid.utils

/**
 * Validation utilities for user input
 */
object ValidationUtils {

    /**
     * Validates email format
     * Returns true if the email is valid, false otherwise
     */
    fun isValidEmail(email: String): Boolean {
        if (email.isBlank()) return false
        val emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$".toRegex()
        return emailRegex.matches(email)
    }

    /**
     * Validates password strength
     * Must be at least 8 characters with uppercase, lowercase, and digit
     */
    fun isStrongPassword(password: String): Boolean {
        if (password.length < 8) return false

        val hasUppercase = password.any { it.isUpperCase() }
        val hasLowercase = password.any { it.isLowerCase() }
        val hasDigit = password.any { it.isDigit() }

        return hasUppercase && hasLowercase && hasDigit
    }

    /**
     * Validates price amount
     * Must be at least 1000 VND
     */
    fun isValidPrice(price: Long): Boolean {
        return price >= 1000
    }

    /**
     * Validates Vietnamese phone number
     * Must be 10-12 digits, optionally starting with +
     */
    fun isValidPhone(phone: String): Boolean {
        if (phone.isBlank()) return false
        if (phone.length < 10 || phone.length > 12) return false

        // Remove + prefix if present
        val cleanPhone = phone.removePrefix("+")

        // Check if all characters are digits
        return cleanPhone.all { it.isDigit() }
    }

    /**
     * Validates if a string is not blank
     */
    fun isNotBlank(value: String): Boolean {
        return value.isNotBlank()
    }

    /**
     * Validates if a value is within a range
     */
    fun isInRange(value: Long, min: Long, max: Long): Boolean {
        return value in min..max
    }
}
