package com.sadaksetu.core.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val NavyPrimary = Color(0xFF0F2537)
val TealAccent = Color(0xFF0E7A6E)
val TealContainer = Color(0xFFC7EFE8)
val BackgroundLight = Color(0xFFF8FAFC)
val SurfaceLight = Color(0xFFFFFFFF)
val SurfaceVariantLight = Color(0xFFF1F5F9)

private val SadakSetuColors = lightColorScheme(
    primary = TealAccent,
    onPrimary = Color.White,
    primaryContainer = TealContainer,
    onPrimaryContainer = Color(0xFF002A24),
    secondary = NavyPrimary,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFDCE4EC),
    onSecondaryContainer = Color(0xFF071420),
    background = BackgroundLight,
    surface = SurfaceLight,
    surfaceVariant = SurfaceVariantLight,
    onSurface = Color(0xFF0F172A),
    onSurfaceVariant = Color(0xFF475569),
    error = Color(0xFFDC2626),
    errorContainer = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF991B1B),
)

private val SadakSetuDarkColors = darkColorScheme(
    primary = Color(0xFF5EEAD4),
    onPrimary = Color(0xFF003731),
    primaryContainer = Color(0xFF0F4D45),
    onPrimaryContainer = Color(0xFF99F6E4),
    secondary = Color(0xFF93C5FD),
    onSecondary = Color(0xFF0C2740),
    secondaryContainer = Color(0xFF1E293B),
    onSecondaryContainer = Color(0xFFE2E8F0),
    background = Color(0xFF0B131F),
    surface = Color(0xFF111C2D),
    surfaceVariant = Color(0xFF1E293B),
    onSurface = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFF94A3B8),
    error = Color(0xFFF87171),
    errorContainer = Color(0xFF7F1D1D),
    onErrorContainer = Color(0xFFFECACA),
)

@Composable
fun SadakSetuTheme(darkTheme: Boolean = false, content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) SadakSetuDarkColors else SadakSetuColors,
        typography = Typography(),
        content = content,
    )
}

object SadakSetuSpacing {
    val xs = 4
    val sm = 8
    val md = 16
    val lg = 24
    val xl = 32
    val xxl = 48
}
