package com.viecz.vieczandroid.e2e

/**
 * Custom annotation to mark E2E tests.
 * Used by Gradle filter to run only E2E tests:
 * ./gradlew connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.annotation=com.viecz.vieczandroid.e2e.E2ETest
 */
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class E2ETest
