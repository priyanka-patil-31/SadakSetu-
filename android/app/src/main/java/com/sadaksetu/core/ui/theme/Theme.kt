package com.sadaksetu.core.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val SadakSetuColors = lightColorScheme(
    primary = Color(0xFF0E6B62),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFB9F2E7),
    onPrimaryContainer = Color(0xFF00201C),
    secondary = Color(0xFF516460),
    secondaryContainer = Color(0xFFD4E8E3),
    onSecondaryContainer = Color(0xFF0D1D1A),
    background = Color(0xFFF8FBF9),
    surface = Color(0xFFF8FBF9),
    error = Color(0xFFBA1A1A),
)

private val SadakSetuDarkColors = darkColorScheme(
    primary = Color(0xFF7BDCCB),
    onPrimary = Color(0xFF003731),
    primaryContainer = Color(0xFF005047),
    onPrimaryContainer = Color(0xFF9AF8E7),
    secondary = Color(0xFFB8CCC7),
    secondaryContainer = Color(0xFF394B47),
    onSecondaryContainer = Color(0xFFD4E8E3),
    background = Color(0xFF101412),
    surface = Color(0xFF101412),
    surfaceVariant = Color(0xFF404946),
    error = Color(0xFFFFB4AB),
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
