package com.viecz.vieczandroid.utils

import org.junit.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Simple utility tests that work immediately without refactoring
 *
 * These tests demonstrate basic unit testing and can be run right away.
 * Add this utility class to your project to validate user input.
 */
class ValidationUtilsTest {

    @Test
    fun `valid email should return true`() {
        assertTrue(isValidEmail("test@example.com"))
        assertTrue(isValidEmail("user.name@domain.co.uk"))
        assertTrue(isValidEmail("first+last@company.com"))
    }

    @Test
    fun `invalid email should return false`() {
        assertFalse(isValidEmail(""))
        assertFalse(isValidEmail("invalid"))
        assertFalse(isValidEmail("@example.com"))
        assertFalse(isValidEmail("test@"))
        assertFalse(isValidEmail("test.example.com"))
    }

    @Test
    fun `strong password should return true`() {
        // At least 8 chars, uppercase, lowercase, number
        assertTrue(isStrongPassword("Password123"))
        assertTrue(isStrongPassword("MyPass1word"))
        assertTrue(isStrongPassword("Abcdefg1"))
    }

    @Test
    fun `weak password should return false`() {
        assertFalse(isStrongPassword(""))
        assertFalse(isStrongPassword("short1A")) // Too short
        assertFalse(isStrongPassword("password123")) // No uppercase
        assertFalse(isStrongPassword("PASSWORD123")) // No lowercase
        assertFalse(isStrongPassword("PasswordABC")) // No number
        assertFalse(isStrongPassword("Pass1")) // Too short
    }

    @Test
    fun `valid price should return true`() {
        assertTrue(isValidPrice(10000))
        assertTrue(isValidPrice(50000))
        assertTrue(isValidPrice(1000000))
    }

    @Test
    fun `invalid price should return false`() {
        assertFalse(isValidPrice(0))
        assertFalse(isValidPrice(-100))
        assertFalse(isValidPrice(500)) // Below minimum
    }

    @Test
    fun `valid phone number should return true`() {
        assertTrue(isValidPhone("0123456789"))
        assertTrue(isValidPhone("0987654321"))
        assertTrue(isValidPhone("+84123456789"))
    }

    @Test
    fun `invalid phone number should return false`() {
        assertFalse(isValidPhone(""))
        assertFalse(isValidPhone("123")) // Too short
        assertFalse(isValidPhone("abcd123456")) // Contains letters
        assertFalse(isValidPhone("012345678901234")) // Too long
    }

    // Utility functions to test (add these to a real ValidationUtils.kt file)
    private fun isValidEmail(email: String): Boolean {
        if (email.isBlank()) return false
        val emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$".toRegex()
        return emailRegex.matches(email)
    }

    private fun isStrongPassword(password: String): Boolean {
        if (password.length < 8) return false

        val hasUppercase = password.any { it.isUpperCase() }
        val hasLowercase = password.any { it.isLowerCase() }
        val hasDigit = password.any { it.isDigit() }

        return hasUppercase && hasLowercase && hasDigit
    }

    private fun isValidPrice(price: Long): Boolean {
        return price >= 1000 // Minimum 1000 VND
    }

    private fun isValidPhone(phone: String): Boolean {
        if (phone.isBlank()) return false
        if (phone.length < 10 || phone.length > 12) return false

        // Remove + prefix if present
        val cleanPhone = phone.removePrefix("+")

        // Check if all characters are digits
        return cleanPhone.all { it.isDigit() }
    }
}

/**
 * TO USE THESE VALIDATION FUNCTIONS IN YOUR APP:
 *
 * 1. Create file: app/src/main/java/com/viecz/vieczandroid/utils/ValidationUtils.kt
 *
 * 2. Copy the validation functions:
 *
 * package com.viecz.vieczandroid.utils
 *
 * object ValidationUtils {
 *     fun isValidEmail(email: String): Boolean {
 *         if (email.isBlank()) return false
 *         val emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$".toRegex()
 *         return emailRegex.matches(email)
 *     }
 *
 *     fun isStrongPassword(password: String): Boolean {
 *         if (password.length < 8) return false
 *         val hasUppercase = password.any { it.isUpperCase() }
 *         val hasLowercase = password.any { it.isLowerCase() }
 *         val hasDigit = password.any { it.isDigit() }
 *         return hasUppercase && hasLowercase && hasDigit
 *     }
 *
 *     fun isValidPrice(price: Long): Boolean {
 *         return price >= 1000
 *     }
 *
 *     fun isValidPhone(phone: String): Boolean {
 *         if (phone.isBlank()) return false
 *         if (phone.length < 10 || phone.length > 12) return false
 *         val cleanPhone = phone.removePrefix("+")
 *         return cleanPhone.all { it.isDigit() }
 *     }
 * }
 *
 * 3. Use in your ViewModels/Composables:
 *
 * if (!ValidationUtils.isValidEmail(email)) {
 *     _errorState.value = "Invalid email format"
 *     return
 * }
 *
 * if (!ValidationUtils.isStrongPassword(password)) {
 *     _errorState.value = "Password must be at least 8 characters with uppercase, lowercase, and number"
 *     return
 * }
 */
