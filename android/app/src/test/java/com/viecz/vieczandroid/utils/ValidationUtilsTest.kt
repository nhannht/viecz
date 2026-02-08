package com.viecz.vieczandroid.utils

import org.junit.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Comprehensive tests for ValidationUtils
 * Covers email, password, phone, and price validation
 */
class ValidationUtilsTest {

    // Email validation tests (10 test cases)
    @Test
    fun `valid email formats should return true`() {
        assertTrue(ValidationUtils.isValidEmail("test@example.com"))
        assertTrue(ValidationUtils.isValidEmail("user.name@domain.co.uk"))
        assertTrue(ValidationUtils.isValidEmail("first+last@company.com"))
        assertTrue(ValidationUtils.isValidEmail("john_doe123@test-domain.com"))
        assertTrue(ValidationUtils.isValidEmail("a@b.co"))
    }

    @Test
    fun `empty or blank email should return false`() {
        assertFalse(ValidationUtils.isValidEmail(""))
        assertFalse(ValidationUtils.isValidEmail("   "))
        assertFalse(ValidationUtils.isValidEmail("\t"))
    }

    @Test
    fun `email without @ symbol should return false`() {
        assertFalse(ValidationUtils.isValidEmail("invalid"))
        assertFalse(ValidationUtils.isValidEmail("test.example.com"))
        assertFalse(ValidationUtils.isValidEmail("user.domain.com"))
    }

    @Test
    fun `email without domain should return false`() {
        assertFalse(ValidationUtils.isValidEmail("test@"))
        assertFalse(ValidationUtils.isValidEmail("user@"))
    }

    @Test
    fun `email without local part should return false`() {
        assertFalse(ValidationUtils.isValidEmail("@example.com"))
        assertFalse(ValidationUtils.isValidEmail("@domain.co.uk"))
    }

    @Test
    fun `email with invalid characters should return false`() {
        assertFalse(ValidationUtils.isValidEmail("test space@example.com"))
        assertFalse(ValidationUtils.isValidEmail("user#name@domain.com"))
    }

    @Test
    fun `email without TLD should return false`() {
        assertFalse(ValidationUtils.isValidEmail("test@example"))
        assertFalse(ValidationUtils.isValidEmail("user@localhost"))
    }

    // Password validation tests (8 test cases)
    @Test
    fun `strong password with all requirements should return true`() {
        assertTrue(ValidationUtils.isStrongPassword("Password123"))
        assertTrue(ValidationUtils.isStrongPassword("MyPass1word"))
        assertTrue(ValidationUtils.isStrongPassword("Abcdefg1"))
        assertTrue(ValidationUtils.isStrongPassword("Test1234"))
    }

    @Test
    fun `empty or blank password should return false`() {
        assertFalse(ValidationUtils.isStrongPassword(""))
        assertFalse(ValidationUtils.isStrongPassword("       "))
    }

    @Test
    fun `password shorter than 8 characters should return false`() {
        assertFalse(ValidationUtils.isStrongPassword("Pass1")) // 5 chars
        assertFalse(ValidationUtils.isStrongPassword("Ab1")) // 3 chars
        assertFalse(ValidationUtils.isStrongPassword("short1A")) // 7 chars
    }

    @Test
    fun `password without uppercase should return false`() {
        assertFalse(ValidationUtils.isStrongPassword("password123"))
        assertFalse(ValidationUtils.isStrongPassword("alllowercase1"))
    }

    @Test
    fun `password without lowercase should return false`() {
        assertFalse(ValidationUtils.isStrongPassword("PASSWORD123"))
        assertFalse(ValidationUtils.isStrongPassword("ALLUPPERCASE1"))
    }

    @Test
    fun `password without digit should return false`() {
        assertFalse(ValidationUtils.isStrongPassword("PasswordABC"))
        assertFalse(ValidationUtils.isStrongPassword("NoDigits"))
    }

    @Test
    fun `password with special characters is acceptable`() {
        assertTrue(ValidationUtils.isStrongPassword("Pass@word1"))
        assertTrue(ValidationUtils.isStrongPassword("Test#123"))
    }

    // Phone validation tests (6 test cases)
    @Test
    fun `valid Vietnamese phone numbers should return true`() {
        assertTrue(ValidationUtils.isValidPhone("0123456789")) // 10 digits
        assertTrue(ValidationUtils.isValidPhone("0987654321")) // 10 digits
        assertTrue(ValidationUtils.isValidPhone("091234567890")) // 12 digits
    }

    @Test
    fun `valid phone number with country code should return true`() {
        assertTrue(ValidationUtils.isValidPhone("+84123456789"))
        assertTrue(ValidationUtils.isValidPhone("+84987654321"))
    }

    @Test
    fun `empty or blank phone number should return false`() {
        assertFalse(ValidationUtils.isValidPhone(""))
        assertFalse(ValidationUtils.isValidPhone("   "))
    }

    @Test
    fun `phone number too short should return false`() {
        assertFalse(ValidationUtils.isValidPhone("123")) // 3 digits
        assertFalse(ValidationUtils.isValidPhone("012345678")) // 9 digits
    }

    @Test
    fun `phone number too long should return false`() {
        assertFalse(ValidationUtils.isValidPhone("012345678901234")) // 15 digits
    }

    @Test
    fun `phone number with letters should return false`() {
        assertFalse(ValidationUtils.isValidPhone("abcd123456"))
        assertFalse(ValidationUtils.isValidPhone("0123abc789"))
    }

    // Price validation tests (5 test cases)
    @Test
    fun `valid prices should return true`() {
        assertTrue(ValidationUtils.isValidPrice(1000)) // Minimum
        assertTrue(ValidationUtils.isValidPrice(10000))
        assertTrue(ValidationUtils.isValidPrice(50000))
        assertTrue(ValidationUtils.isValidPrice(1000000))
    }

    @Test
    fun `zero price should return false`() {
        assertFalse(ValidationUtils.isValidPrice(0))
    }

    @Test
    fun `negative price should return false`() {
        assertFalse(ValidationUtils.isValidPrice(-100))
        assertFalse(ValidationUtils.isValidPrice(-1000))
    }

    @Test
    fun `price below minimum should return false`() {
        assertFalse(ValidationUtils.isValidPrice(500))
        assertFalse(ValidationUtils.isValidPrice(999))
    }

    // Additional utility tests
    @Test
    fun `isNotBlank should correctly validate strings`() {
        assertTrue(ValidationUtils.isNotBlank("test"))
        assertTrue(ValidationUtils.isNotBlank("  test  "))
        assertFalse(ValidationUtils.isNotBlank(""))
        assertFalse(ValidationUtils.isNotBlank("   "))
    }

    @Test
    fun `isInRange should correctly validate ranges`() {
        assertTrue(ValidationUtils.isInRange(50, 0, 100))
        assertTrue(ValidationUtils.isInRange(0, 0, 100))
        assertTrue(ValidationUtils.isInRange(100, 0, 100))
        assertFalse(ValidationUtils.isInRange(-1, 0, 100))
        assertFalse(ValidationUtils.isInRange(101, 0, 100))
    }
}
