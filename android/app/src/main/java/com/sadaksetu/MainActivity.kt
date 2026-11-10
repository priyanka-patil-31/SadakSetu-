package com.sadaksetu

import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import com.sadaksetu.core.common.SettingsStore
import com.sadaksetu.core.ui.theme.SadakSetuTheme
import com.sadaksetu.navigation.SadakSetuApp
import dagger.hilt.android.AndroidEntryPoint
import java.util.Locale
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var settingsStore: SettingsStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val darkTheme by settingsStore.darkThemeEnabled.collectAsState(initial = false)
            val languageCode by settingsStore.languageCode.collectAsState(initial = "en")

            val locale = remember(languageCode) { Locale(languageCode) }

            val localizedConfiguration = remember(languageCode, locale) {
                Locale.setDefault(locale)
                val config = Configuration(resources.configuration)
                config.setLocale(locale)
                config.setLayoutDirection(locale)
                config
            }

            val localizedContext = remember(localizedConfiguration) {
                val configContext = createConfigurationContext(localizedConfiguration)
                object : android.content.ContextWrapper(this@MainActivity) {
                    override fun getResources(): android.content.res.Resources {
                        return configContext.resources
                    }
                }
            }

            LaunchedEffect(languageCode, locale) {
                Locale.setDefault(locale)
                @Suppress("DEPRECATION")
                resources.updateConfiguration(localizedConfiguration, resources.displayMetrics)
                @Suppress("DEPRECATION")
                applicationContext.resources.updateConfiguration(localizedConfiguration, applicationContext.resources.displayMetrics)
            }

            CompositionLocalProvider(
                LocalConfiguration provides localizedConfiguration,
                LocalContext provides localizedContext
            ) {
                key(languageCode) {
                    SadakSetuTheme(darkTheme = darkTheme) {
                        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                            SadakSetuApp()
                        }
                    }
                }
            }
        }
    }
}
