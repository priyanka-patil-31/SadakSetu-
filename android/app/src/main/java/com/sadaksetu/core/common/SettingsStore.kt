package com.sadaksetu.core.common

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

private val Context.settingsDataStore by preferencesDataStore(name = "sadaksetu_settings")

class SettingsStore @Inject constructor(@ApplicationContext private val context: Context) {
    val hasSeenWelcome: Flow<Boolean> = context.settingsDataStore.data.map { preferences ->
        preferences[WELCOME_SEEN] ?: false
    }

    val darkThemeEnabled: Flow<Boolean> = context.settingsDataStore.data.map { preferences ->
        preferences[DARK_THEME_ENABLED] ?: false
    }

    val notificationsEnabled: Flow<Boolean> = context.settingsDataStore.data.map { preferences ->
        preferences[NOTIFICATIONS_ENABLED] ?: true
    }

    val languageCode: Flow<String> = context.settingsDataStore.data.map { preferences ->
        preferences[LANGUAGE_CODE] ?: "en"
    }

    suspend fun markWelcomeSeen() {
        context.settingsDataStore.edit { it[WELCOME_SEEN] = true }
    }

    suspend fun setDarkThemeEnabled(enabled: Boolean) {
        context.settingsDataStore.edit { it[DARK_THEME_ENABLED] = enabled }
    }

    suspend fun setNotificationsEnabled(enabled: Boolean) {
        context.settingsDataStore.edit { it[NOTIFICATIONS_ENABLED] = enabled }
    }

    suspend fun setLanguageCode(code: String) {
        context.settingsDataStore.edit { it[LANGUAGE_CODE] = code }
    }

    private companion object {
        val WELCOME_SEEN = booleanPreferencesKey("has_seen_welcome")
        val DARK_THEME_ENABLED = booleanPreferencesKey("dark_theme_enabled")
        val NOTIFICATIONS_ENABLED = booleanPreferencesKey("notifications_enabled")
        val LANGUAGE_CODE = stringPreferencesKey("language_code")
    }
}
