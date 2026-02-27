package com.viecz.vieczandroid.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map

class TokenManager(context: Context) {
    companion object {
        private const val PREFS_NAME = "encrypted_auth_prefs"
        private const val ACCESS_TOKEN_KEY = "access_token"
        private const val REFRESH_TOKEN_KEY = "refresh_token"
        private const val USER_ID_KEY = "user_id"
        private const val USER_EMAIL_KEY = "user_email"
        private const val USER_NAME_KEY = "user_name"
    }

    private val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        PREFS_NAME,
        masterKeyAlias,
        context,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    // In-memory state backed by encrypted storage
    private val _accessToken = MutableStateFlow(prefs.getString(ACCESS_TOKEN_KEY, null))
    private val _refreshToken = MutableStateFlow(prefs.getString(REFRESH_TOKEN_KEY, null))
    private val _userId = MutableStateFlow(prefs.getString(USER_ID_KEY, null)?.toLongOrNull())
    private val _userEmail = MutableStateFlow(prefs.getString(USER_EMAIL_KEY, null))
    private val _userName = MutableStateFlow(prefs.getString(USER_NAME_KEY, null))

    val accessToken: Flow<String?> = _accessToken
    val refreshToken: Flow<String?> = _refreshToken
    val userId: Flow<Long?> = _userId
    val userEmail: Flow<String?> = _userEmail
    val userName: Flow<String?> = _userName
    val isLoggedIn: Flow<Boolean> = _accessToken.map { it != null }

    suspend fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit()
            .putString(ACCESS_TOKEN_KEY, accessToken)
            .putString(REFRESH_TOKEN_KEY, refreshToken)
            .apply()
        _accessToken.value = accessToken
        _refreshToken.value = refreshToken
    }

    suspend fun saveUserInfo(userId: Long, email: String?, name: String) {
        prefs.edit()
            .putString(USER_ID_KEY, userId.toString())
            .putString(USER_EMAIL_KEY, email ?: "")
            .putString(USER_NAME_KEY, name)
            .apply()
        _userId.value = userId
        _userEmail.value = email ?: ""
        _userName.value = name
    }

    suspend fun clearTokens() {
        prefs.edit().clear().apply()
        _accessToken.value = null
        _refreshToken.value = null
        _userId.value = null
        _userEmail.value = null
        _userName.value = null
    }

    suspend fun updateAccessToken(accessToken: String) {
        prefs.edit().putString(ACCESS_TOKEN_KEY, accessToken).apply()
        _accessToken.value = accessToken
    }
}
