package com.viecz.vieczandroid.ui.theme

import androidx.compose.ui.graphics.Color

// ── nhannht-metro-meow Design Tokens ────────────────────────────────
// Matches web design system: docs/technical/DESIGN_SYSTEM.md

// Core palette
val MetroBg = Color(0xFFF0EDE8)           // Page background (beige)
val MetroFg = Color(0xFF1A1A1A)           // Primary text, borders, primary button bg
val MetroMuted = Color(0xFF6B6B6B)        // Secondary text, descriptions
val MetroBorder = Color(0xFFD4D0CA)       // Card borders, dividers
val MetroCard = Color(0xFFFFFFFF)         // Card surfaces

// Semantic colors (mapped to Material slots)
val MetroError = Color(0xFFB3261E)        // Error states
val MetroOnError = Color(0xFFFFFFFF)

// Status badge colors
val MetroStatusOpen = Color(0xFF2E7D32)         // Green
val MetroStatusInProgress = Color(0xFFE65100)   // Orange
val MetroStatusCompleted = Color(0xFF1565C0)    // Blue
val MetroStatusCancelled = Color(0xFFB3261E)    // Red
