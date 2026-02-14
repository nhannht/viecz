package com.viecz.vieczandroid.auth

import android.app.Activity
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.viecz.vieczandroid.BuildConfig
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages Google Sign-In using Credential Manager API.
 * Handles the modern Android authentication flow for Google OAuth.
 */
@Singleton
class GoogleSignInManager @Inject constructor() {

    /**
     * Initiates Google Sign-In flow and returns the ID token on success.
     *
     * @param activity The Activity context required for showing the credential picker UI
     * @return Result containing the Google ID token string, or an error
     */
    suspend fun signIn(activity: Activity): Result<String> {
        return try {
            val credentialManager = CredentialManager.create(activity)

            // Configure Google ID option
            val googleIdOption = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false) // Allow any Google account
                .setServerClientId(BuildConfig.GOOGLE_CLIENT_ID)
                .build()

            // Build credential request
            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()

            // Get credential from user
            val result = credentialManager.getCredential(
                request = request,
                context = activity
            )

            // Extract Google ID token
            handleSignInResult(result)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Processes the credential result and extracts the Google ID token.
     */
    private fun handleSignInResult(result: GetCredentialResponse): Result<String> {
        return when (val credential = result.credential) {
            is CustomCredential -> {
                if (credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    try {
                        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                        Result.success(googleIdTokenCredential.idToken)
                    } catch (e: Exception) {
                        Result.failure(Exception("Invalid Google ID token credential", e))
                    }
                } else {
                    Result.failure(Exception("Unexpected credential type: ${credential.type}"))
                }
            }
            else -> {
                Result.failure(Exception("Unexpected credential class: ${credential::class.java.name}"))
            }
        }
    }
}
