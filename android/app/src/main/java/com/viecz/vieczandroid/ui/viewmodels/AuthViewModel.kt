package com.viecz.vieczandroid.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.auth.GoogleSignInManager
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.User
import com.viecz.vieczandroid.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import io.sentry.Sentry
import io.sentry.protocol.User as SentryUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class AuthState {
    data object Idle : AuthState()
    data object Loading : AuthState()
    data class Success(val user: User) : AuthState()
    data class Error(val message: String) : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repository: AuthRepository,
    private val tokenManager: TokenManager,
    private val googleSignInManager: GoogleSignInManager
) : ViewModel() {
    companion object {
        private const val TAG = "AuthViewModel"
    }

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    val isLoggedIn = tokenManager.isLoggedIn

    /**
     * Register a new user
     */
    fun register(email: String, password: String, name: String) {
        viewModelScope.launch {
            Log.d(TAG, "register() called - email: $email, name: $name")
            _authState.value = AuthState.Loading

            repository.register(email, password, name)
                .onSuccess { user ->
                    Log.d(TAG, "Registration successful!")
                    Sentry.setUser(SentryUser().apply { id = user.id.toString(); this.email = user.email })
                    _authState.value = AuthState.Success(user)
                }
                .onFailure { error ->
                    Log.e(TAG, "Registration failed", error)
                    _authState.value = AuthState.Error(
                        error.message ?: "Registration failed"
                    )
                }
        }
    }

    /**
     * Login with email and password
     */
    fun login(email: String, password: String) {
        viewModelScope.launch {
            Log.d(TAG, "login() called - email: $email")
            _authState.value = AuthState.Loading

            repository.login(email, password)
                .onSuccess { user ->
                    Log.d(TAG, "Login successful!")
                    Sentry.setUser(SentryUser().apply { id = user.id.toString(); this.email = user.email })
                    _authState.value = AuthState.Success(user)
                }
                .onFailure { error ->
                    Log.e(TAG, "Login failed", error)
                    _authState.value = AuthState.Error(
                        error.message ?: "Login failed"
                    )
                }
        }
    }

    /**
     * Login with Google
     */
    fun loginWithGoogle(activity: android.app.Activity) {
        viewModelScope.launch {
            Log.d(TAG, "loginWithGoogle() called")
            _authState.value = AuthState.Loading

            // Get Google ID token
            googleSignInManager.signIn(activity)
                .onSuccess { idToken ->
                    Log.d(TAG, "Got Google ID token, authenticating with backend...")
                    // Authenticate with backend
                    repository.loginWithGoogle(idToken)
                        .onSuccess { user ->
                            Log.d(TAG, "Google login successful!")
                            Sentry.setUser(SentryUser().apply { id = user.id.toString(); this.email = user.email })
                            _authState.value = AuthState.Success(user)
                        }
                        .onFailure { error ->
                            Log.e(TAG, "Backend authentication failed", error)
                            _authState.value = AuthState.Error(
                                error.message ?: "Google login failed"
                            )
                        }
                }
                .onFailure { error ->
                    Log.e(TAG, "Google Sign-In failed", error)
                    _authState.value = AuthState.Error(
                        error.message ?: "Google Sign-In failed"
                    )
                }
        }
    }

    /**
     * Logout
     */
    fun logout() {
        viewModelScope.launch {
            Log.d(TAG, "logout() called")
            repository.logout()
            Sentry.setUser(null)
            _authState.value = AuthState.Idle
        }
    }

    /**
     * Reset state to idle
     */
    fun resetState() {
        _authState.value = AuthState.Idle
    }
}
