package com.viecz.vieczandroid.ui.viewmodels

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.api.RetrofitClient
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.User
import com.viecz.vieczandroid.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class AuthState {
    data object Idle : AuthState()
    data object Loading : AuthState()
    data class Success(val user: User) : AuthState()
    data class Error(val message: String) : AuthState()
}

class AuthViewModel(application: Application) : AndroidViewModel(application) {
    companion object {
        private const val TAG = "AuthViewModel"
    }

    private val tokenManager = TokenManager(application.applicationContext)
    private val repository = AuthRepository(RetrofitClient.authApi, tokenManager)

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
     * Logout
     */
    fun logout() {
        viewModelScope.launch {
            Log.d(TAG, "logout() called")
            repository.logout()
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
