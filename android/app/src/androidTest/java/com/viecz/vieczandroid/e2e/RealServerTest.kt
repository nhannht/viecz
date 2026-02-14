package com.viecz.vieczandroid.e2e

/**
 * Marks E2E tests that require a running Go test server on port 9999.
 *
 * Exclude these when running mock-only tests:
 *   ./gradlew connectedMockE2E
 *
 * Run only these:
 *   ./gradlew connectedRealServerE2E
 */
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class RealServerTest
