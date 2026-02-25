package com.viecz.vieczandroid.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// ── nhannht-metro-meow Extended Colors ──────────────────────────────
// Tokens that Material 3 doesn't have natively.
// Access via MetroTheme.colors.muted, MetroTheme.colors.border, etc.

@Immutable
data class MetroColors(
    val bg: Color = MetroBg,
    val fg: Color = MetroFg,
    val muted: Color = MetroMuted,
    val border: Color = MetroBorder,
    val card: Color = MetroCard,
    val statusOpen: Color = MetroStatusOpen,
    val statusInProgress: Color = MetroStatusInProgress,
    val statusCompleted: Color = MetroStatusCompleted,
    val statusCancelled: Color = MetroStatusCancelled,
)

val LocalMetroColors = staticCompositionLocalOf { MetroColors() }

// ── MetroTheme Accessor ─────────────────────────────────────────────
// Usage: MetroTheme.colors.muted, MetroTheme.colors.border, etc.

object MetroTheme {
    val colors: MetroColors
        @Composable get() = LocalMetroColors.current
}

// ── Material 3 Color Scheme (mapped to Metro tokens) ────────────────
// This makes all Material components (Scaffold, TopAppBar, etc.)
// automatically use Metro colors without modification.

private val MetroColorScheme = lightColorScheme(
    primary = MetroFg,                  // Buttons, FAB, active states
    onPrimary = MetroBg,               // Text on primary surfaces
    primaryContainer = MetroFg,
    onPrimaryContainer = MetroBg,

    secondary = MetroMuted,             // Secondary actions
    onSecondary = Color.White,
    secondaryContainer = MetroBorder,
    onSecondaryContainer = MetroFg,

    tertiary = MetroMuted,
    onTertiary = Color.White,
    tertiaryContainer = MetroBorder,
    onTertiaryContainer = MetroFg,

    error = MetroError,
    onError = MetroOnError,
    errorContainer = Color(0xFFF9DEDC),
    onErrorContainer = Color(0xFF410E0B),

    background = MetroBg,               // Page background
    onBackground = MetroFg,             // Text on background

    surface = MetroCard,                // Card surfaces
    onSurface = MetroFg,                // Text on surfaces
    surfaceVariant = MetroBg,           // Variant surfaces
    onSurfaceVariant = MetroMuted,      // Secondary text on surfaces

    outline = MetroBorder,              // Borders, dividers
    outlineVariant = MetroBorder,
)

// ── VieczTheme (Entry Point) ────────────────────────────────────────
// Wraps MaterialTheme with Metro tokens + provides MetroColors.
// No dynamic colors. No dark theme (yet). Fully custom nhannht-metro.

@Composable
fun VieczTheme(
    content: @Composable () -> Unit
) {
    val metroColors = MetroColors()

    CompositionLocalProvider(
        LocalMetroColors provides metroColors,
    ) {
        MaterialTheme(
            colorScheme = MetroColorScheme,
            typography = MetroTypography,
            shapes = MetroShapes,
            content = content,
        )
    }
}
