package com.sadaksetu.core.network

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionStore @Inject constructor(@ApplicationContext context: Context) {
    private val preferences = EncryptedSharedPreferences.create(
        "sadaksetu_session",
        MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
        context,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun currentToken(): String? = preferences.getString(KEY_TOKEN, null)

    fun saveToken(token: String) {
        preferences.edit().putString(KEY_TOKEN, token).apply()
    }

    fun clear() {
        preferences.edit().clear().apply()
    }

    private companion object {
        const val KEY_TOKEN = "session_token"
    }
}
