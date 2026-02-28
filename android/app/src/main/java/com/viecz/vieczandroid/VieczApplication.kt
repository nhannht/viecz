package com.viecz.vieczandroid

import android.app.Application
import dagger.hilt.android.HiltAndroidApp
import io.sentry.android.core.SentryAndroid

/**
 * Application class for Viecz
 *
 * @HiltAndroidApp triggers Hilt's code generation including a base class
 * for your application that serves as the application-level dependency container.
 */
@HiltAndroidApp
class VieczApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // Initialize Sentry (disabled when DSN is empty, e.g. dev flavor)
        val dsn = BuildConfig.SENTRY_DSN
        if (dsn.isNotBlank()) {
            SentryAndroid.init(this) { options ->
                options.dsn = dsn
                options.tracesSampleRate = 0.2
                options.environment = if (BuildConfig.DEBUG) "development" else "production"
            }
        }
    }
}
