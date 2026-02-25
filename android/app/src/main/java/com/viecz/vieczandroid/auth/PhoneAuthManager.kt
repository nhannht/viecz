package com.viecz.vieczandroid.auth

import android.app.Activity
import android.util.Log
import com.google.firebase.FirebaseException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.tasks.await
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

@Singleton
class PhoneAuthManager @Inject constructor() {

    companion object {
        private const val TAG = "PhoneAuthManager"
        private const val TIMEOUT_SECONDS = 60L
    }

    private var verificationId: String? = null
    private var resendToken: PhoneAuthProvider.ForceResendingToken? = null
    private var autoCredential: PhoneAuthCredential? = null

    /**
     * Send verification code to the given phone number.
     * Returns Result.success if code was sent (or auto-verified).
     */
    suspend fun sendVerificationCode(phoneNumber: String, activity: Activity): Result<Unit> {
        autoCredential = null
        return suspendCancellableCoroutine { continuation ->
            val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                    Log.d(TAG, "Auto-verification completed")
                    autoCredential = credential
                    if (continuation.isActive) {
                        continuation.resume(Result.success(Unit))
                    }
                }

                override fun onVerificationFailed(e: FirebaseException) {
                    Log.e(TAG, "Verification failed", e)
                    if (continuation.isActive) {
                        continuation.resume(Result.failure(Exception(e.message ?: "Verification failed")))
                    }
                }

                override fun onCodeSent(
                    id: String,
                    token: PhoneAuthProvider.ForceResendingToken
                ) {
                    Log.d(TAG, "Code sent, verificationId received")
                    verificationId = id
                    resendToken = token
                    if (continuation.isActive) {
                        continuation.resume(Result.success(Unit))
                    }
                }
            }

            val options = PhoneAuthOptions.newBuilder(FirebaseAuth.getInstance())
                .setPhoneNumber(phoneNumber)
                .setTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .setActivity(activity)
                .setCallbacks(callbacks)
                .build()

            PhoneAuthProvider.verifyPhoneNumber(options)
        }
    }

    /**
     * Resend the verification code using the stored resend token.
     */
    suspend fun resendCode(phoneNumber: String, activity: Activity): Result<Unit> {
        val token = resendToken ?: return Result.failure(Exception("No resend token available. Send code first."))
        autoCredential = null

        return suspendCancellableCoroutine { continuation ->
            val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                    Log.d(TAG, "Auto-verification completed on resend")
                    autoCredential = credential
                    if (continuation.isActive) {
                        continuation.resume(Result.success(Unit))
                    }
                }

                override fun onVerificationFailed(e: FirebaseException) {
                    Log.e(TAG, "Resend verification failed", e)
                    if (continuation.isActive) {
                        continuation.resume(Result.failure(Exception(e.message ?: "Resend failed")))
                    }
                }

                override fun onCodeSent(
                    id: String,
                    newToken: PhoneAuthProvider.ForceResendingToken
                ) {
                    Log.d(TAG, "Code resent successfully")
                    verificationId = id
                    resendToken = newToken
                    if (continuation.isActive) {
                        continuation.resume(Result.success(Unit))
                    }
                }
            }

            val options = PhoneAuthOptions.newBuilder(FirebaseAuth.getInstance())
                .setPhoneNumber(phoneNumber)
                .setTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .setActivity(activity)
                .setCallbacks(callbacks)
                .setForceResendingToken(token)
                .build()

            PhoneAuthProvider.verifyPhoneNumber(options)
        }
    }

    /**
     * Verify OTP code and return Firebase ID token.
     * If auto-verification happened, uses the auto credential instead.
     */
    suspend fun verifyCode(code: String): Result<String> {
        return try {
            val credential = autoCredential ?: run {
                val vId = verificationId
                    ?: return Result.failure(Exception("No verification ID. Send code first."))
                PhoneAuthProvider.getCredential(vId, code)
            }

            val authResult = FirebaseAuth.getInstance()
                .signInWithCredential(credential)
                .await()

            val idToken = authResult.user?.getIdToken(true)?.await()?.token
                ?: return Result.failure(Exception("Failed to get Firebase ID token"))

            Log.d(TAG, "Phone auth successful, got ID token")
            Result.success(idToken)
        } catch (e: Exception) {
            Log.e(TAG, "Code verification failed", e)
            Result.failure(Exception(e.message ?: "Code verification failed"))
        }
    }

    /**
     * Whether auto-verification has completed (no manual OTP needed).
     */
    fun hasAutoCredential(): Boolean = autoCredential != null
}
