package com.viecz.vieczandroid.data.auth

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthEventManager @Inject constructor() {

    private val _authEvents = MutableSharedFlow<AuthEvent>(extraBufferCapacity = 1)
    val authEvents: SharedFlow<AuthEvent> = _authEvents.asSharedFlow()

    fun emitUnauthorized() {
        _authEvents.tryEmit(AuthEvent.Unauthorized)
    }
}

sealed class AuthEvent {
    data object Unauthorized : AuthEvent()
}
