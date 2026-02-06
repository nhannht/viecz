package com.viecz.vieczandroid

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

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
        // Application initialization
    }
}
