package com.viecz.vieczandroid.ui.catalog

import com.airbnb.android.showkase.annotation.ShowkaseColor
import com.airbnb.android.showkase.annotation.ShowkaseTypography
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import com.viecz.vieczandroid.ui.theme.*

// ── nhannht-metro-meow Color Catalog ────────────────────────────────

object MetroColorShowcase {
    @ShowkaseColor(name = "Background", group = "Metro Core")
    val bg = MetroBg

    @ShowkaseColor(name = "Foreground", group = "Metro Core")
    val fg = MetroFg

    @ShowkaseColor(name = "Muted", group = "Metro Core")
    val muted = MetroMuted

    @ShowkaseColor(name = "Border", group = "Metro Core")
    val border = MetroBorder

    @ShowkaseColor(name = "Card", group = "Metro Core")
    val card = MetroCard

    @ShowkaseColor(name = "Error", group = "Metro Semantic")
    val error = MetroError

    @ShowkaseColor(name = "Status Open", group = "Metro Status")
    val statusOpen = MetroStatusOpen

    @ShowkaseColor(name = "Status In Progress", group = "Metro Status")
    val statusInProgress = MetroStatusInProgress

    @ShowkaseColor(name = "Status Completed", group = "Metro Status")
    val statusCompleted = MetroStatusCompleted

    @ShowkaseColor(name = "Status Cancelled", group = "Metro Status")
    val statusCancelled = MetroStatusCancelled
}

// ── nhannht-metro-meow Typography Catalog ───────────────────────────

object MetroTypographyShowcase {
    @ShowkaseTypography(name = "Display Large", group = "Metro Display")
    val displayLarge = MetroTypography.displayLarge

    @ShowkaseTypography(name = "Display Medium", group = "Metro Display")
    val displayMedium = MetroTypography.displayMedium

    @ShowkaseTypography(name = "Display Small", group = "Metro Display")
    val displaySmall = MetroTypography.displaySmall

    @ShowkaseTypography(name = "Headline Large", group = "Metro Headline")
    val headlineLarge = MetroTypography.headlineLarge

    @ShowkaseTypography(name = "Headline Medium", group = "Metro Headline")
    val headlineMedium = MetroTypography.headlineMedium

    @ShowkaseTypography(name = "Title Large", group = "Metro Title")
    val titleLarge = MetroTypography.titleLarge

    @ShowkaseTypography(name = "Title Medium", group = "Metro Title")
    val titleMedium = MetroTypography.titleMedium

    @ShowkaseTypography(name = "Body Large", group = "Metro Body")
    val bodyLarge = MetroTypography.bodyLarge

    @ShowkaseTypography(name = "Body Medium", group = "Metro Body")
    val bodyMedium = MetroTypography.bodyMedium

    @ShowkaseTypography(name = "Body Small", group = "Metro Body")
    val bodySmall = MetroTypography.bodySmall

    @ShowkaseTypography(name = "Label Large", group = "Metro Label")
    val labelLarge = MetroTypography.labelLarge

    @ShowkaseTypography(name = "Label Medium", group = "Metro Label")
    val labelMedium = MetroTypography.labelMedium

    @ShowkaseTypography(name = "Label Small", group = "Metro Label")
    val labelSmall = MetroTypography.labelSmall
}
