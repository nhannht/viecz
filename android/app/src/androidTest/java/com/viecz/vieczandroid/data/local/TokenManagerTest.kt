package com.viecz.vieczandroid.data.local

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

@RunWith(AndroidJUnit4::class)
class TokenManagerTest {

    private lateinit var context: Context
    private lateinit var tokenManager: TokenManager

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        tokenManager = TokenManager(context)
    }

    @After
    fun tearDown() = runTest {
        tokenManager.clearTokens()
    }

    @Test
    fun initialAccessTokenIsNull() = runTest {
        tokenManager.clearTokens()
        val token = tokenManager.accessToken.first()
        assertNull(token)
    }

    @Test
    fun initialRefreshTokenIsNull() = runTest {
        tokenManager.clearTokens()
        val token = tokenManager.refreshToken.first()
        assertNull(token)
    }

    @Test
    fun initialIsLoggedInIsFalse() = runTest {
        tokenManager.clearTokens()
        val loggedIn = tokenManager.isLoggedIn.first()
        assertFalse(loggedIn)
    }

    @Test
    fun saveTokensStoresBothTokens() = runTest {
        tokenManager.saveTokens("access123", "refresh456")

        val accessToken = tokenManager.accessToken.first()
        val refreshToken = tokenManager.refreshToken.first()

        assertEquals("access123", accessToken)
        assertEquals("refresh456", refreshToken)
    }

    @Test
    fun saveTokensSetsIsLoggedInToTrue() = runTest {
        tokenManager.saveTokens("access123", "refresh456")

        val loggedIn = tokenManager.isLoggedIn.first()
        assertTrue(loggedIn)
    }

    @Test
    fun saveUserInfoStoresAllFields() = runTest {
        tokenManager.saveUserInfo(42L, "test@example.com", "Test User")

        val userId = tokenManager.userId.first()
        val email = tokenManager.userEmail.first()
        val name = tokenManager.userName.first()

        assertEquals(42L, userId)
        assertEquals("test@example.com", email)
        assertEquals("Test User", name)
    }

    @Test
    fun clearTokensRemovesAllData() = runTest {
        tokenManager.saveTokens("access123", "refresh456")
        tokenManager.saveUserInfo(42L, "test@example.com", "Test User")

        tokenManager.clearTokens()

        assertNull(tokenManager.accessToken.first())
        assertNull(tokenManager.refreshToken.first())
        assertNull(tokenManager.userId.first())
        assertNull(tokenManager.userEmail.first())
        assertNull(tokenManager.userName.first())
        assertFalse(tokenManager.isLoggedIn.first())
    }

    @Test
    fun updateAccessTokenOnlyChangesAccessToken() = runTest {
        tokenManager.saveTokens("old_access", "refresh456")

        tokenManager.updateAccessToken("new_access")

        assertEquals("new_access", tokenManager.accessToken.first())
        assertEquals("refresh456", tokenManager.refreshToken.first())
    }

    @Test
    fun userIdReturnsNullForInvalidValue() = runTest {
        tokenManager.clearTokens()
        val userId = tokenManager.userId.first()
        assertNull(userId)
    }

    @Test
    fun saveTokensOverwritesPreviousTokens() = runTest {
        tokenManager.saveTokens("first_access", "first_refresh")
        tokenManager.saveTokens("second_access", "second_refresh")

        assertEquals("second_access", tokenManager.accessToken.first())
        assertEquals("second_refresh", tokenManager.refreshToken.first())
    }
}
