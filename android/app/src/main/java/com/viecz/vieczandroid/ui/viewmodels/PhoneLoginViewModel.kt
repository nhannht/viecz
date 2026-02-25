package com.viecz.vieczandroid.ui.viewmodels

import android.app.Activity
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.i18n.phonenumbers.PhoneNumberUtil
import com.viecz.vieczandroid.auth.PhoneAuthManager
import com.viecz.vieczandroid.data.models.User
import com.viecz.vieczandroid.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class PhoneAuthStep { PHONE_INPUT, CODE_INPUT }

sealed class PhoneAuthState {
    data object Idle : PhoneAuthState()
    data object SendingCode : PhoneAuthState()
    data object CodeSent : PhoneAuthState()
    data object VerifyingCode : PhoneAuthState()
    data class Success(val user: User) : PhoneAuthState()
    data class Error(val message: String, val step: PhoneAuthStep) : PhoneAuthState()
}

@HiltViewModel
class PhoneLoginViewModel @Inject constructor(
    private val phoneAuthManager: PhoneAuthManager,
    private val repository: AuthRepository
) : ViewModel() {

    companion object {
        private const val TAG = "PhoneLoginViewModel"
        private const val DEFAULT_REGION = "VN"
    }

    private val _state = MutableStateFlow<PhoneAuthState>(PhoneAuthState.Idle)
    val state: StateFlow<PhoneAuthState> = _state.asStateFlow()

    private var normalizedPhone: String = ""

    /**
     * Normalize phone number to E.164 format using libphonenumber.
     * e.g. "0371234567" -> "+84371234567"
     */
    private fun normalizePhoneNumber(rawPhone: String): Result<String> {
        return try {
            val util = PhoneNumberUtil.getInstance()
            val number = util.parse(rawPhone, DEFAULT_REGION)
            if (!util.isValidNumber(number)) {
                return Result.failure(Exception("Invalid phone number"))
            }
            val formatted = util.format(number, PhoneNumberUtil.PhoneNumberFormat.E164)
            Result.success(formatted)
        } catch (e: Exception) {
            Result.failure(Exception("Invalid phone number format"))
        }
    }

    /**
     * Send OTP code to the given phone number.
     */
    fun sendCode(phoneNumber: String, activity: Activity) {
        viewModelScope.launch {
            _state.value = PhoneAuthState.SendingCode

            val normalizeResult = normalizePhoneNumber(phoneNumber)
            if (normalizeResult.isFailure) {
                _state.value = PhoneAuthState.Error(
                    normalizeResult.exceptionOrNull()?.message ?: "Invalid phone number",
                    PhoneAuthStep.PHONE_INPUT
                )
                return@launch
            }

            normalizedPhone = normalizeResult.getOrThrow()
            Log.d(TAG, "Sending code to $normalizedPhone")

            phoneAuthManager.sendVerificationCode(normalizedPhone, activity)
                .onSuccess {
                    if (phoneAuthManager.hasAutoCredential()) {
                        // Auto-verified — go straight to verifying with backend
                        Log.d(TAG, "Auto-verified, exchanging token with backend")
                        verifyWithBackend()
                    } else {
                        _state.value = PhoneAuthState.CodeSent
                    }
                }
                .onFailure { error ->
                    Log.e(TAG, "Send code failed", error)
                    _state.value = PhoneAuthState.Error(
                        error.message ?: "Failed to send code",
                        PhoneAuthStep.PHONE_INPUT
                    )
                }
        }
    }

    /**
     * Verify the OTP code entered by the user.
     */
    fun verifyCode(code: String) {
        viewModelScope.launch {
            _state.value = PhoneAuthState.VerifyingCode

            phoneAuthManager.verifyCode(code)
                .onSuccess { idToken ->
                    Log.d(TAG, "Got Firebase ID token, authenticating with backend")
                    exchangeToken(idToken)
                }
                .onFailure { error ->
                    Log.e(TAG, "Code verification failed", error)
                    _state.value = PhoneAuthState.Error(
                        error.message ?: "Invalid verification code",
                        PhoneAuthStep.CODE_INPUT
                    )
                }
        }
    }

    /**
     * Resend OTP code.
     */
    fun resendCode(activity: Activity) {
        if (normalizedPhone.isEmpty()) return
        viewModelScope.launch {
            _state.value = PhoneAuthState.SendingCode

            phoneAuthManager.resendCode(normalizedPhone, activity)
                .onSuccess {
                    _state.value = PhoneAuthState.CodeSent
                }
                .onFailure { error ->
                    Log.e(TAG, "Resend failed", error)
                    _state.value = PhoneAuthState.Error(
                        error.message ?: "Failed to resend code",
                        PhoneAuthStep.CODE_INPUT
                    )
                }
        }
    }

    /**
     * Auto-verification path: get ID token from auto credential and exchange with backend.
     */
    private suspend fun verifyWithBackend() {
        _state.value = PhoneAuthState.VerifyingCode
        phoneAuthManager.verifyCode("")
            .onSuccess { idToken -> exchangeToken(idToken) }
            .onFailure { error ->
                Log.e(TAG, "Auto-verify backend exchange failed", error)
                _state.value = PhoneAuthState.Error(
                    error.message ?: "Authentication failed",
                    PhoneAuthStep.PHONE_INPUT
                )
            }
    }

    /**
     * Exchange Firebase ID token with backend for JWT.
     */
    private suspend fun exchangeToken(idToken: String) {
        repository.loginWithPhone(idToken)
            .onSuccess { user ->
                Log.d(TAG, "Phone login successful for user ${user.id}")
                _state.value = PhoneAuthState.Success(user)
            }
            .onFailure { error ->
                Log.e(TAG, "Backend phone login failed", error)
                _state.value = PhoneAuthState.Error(
                    error.message ?: "Login failed",
                    PhoneAuthStep.CODE_INPUT
                )
            }
    }

    fun resetState() {
        _state.value = PhoneAuthState.Idle
    }

    fun getNormalizedPhone(): String = normalizedPhone
}
