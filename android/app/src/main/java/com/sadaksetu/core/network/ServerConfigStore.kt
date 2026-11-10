package com.sadaksetu.core.network

import android.content.Context
import android.content.SharedPreferences
import android.net.wifi.WifiManager
import com.sadaksetu.BuildConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ServerConfigStore @Inject constructor(@ApplicationContext private val context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("sadaksetu_server_config", Context.MODE_PRIVATE)

    private val _serverUrl = MutableStateFlow(getServerUrl())
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()

    fun getServerUrl(): String {
        return prefs.getString(KEY_SERVER_URL, null)?.takeIf { it.isNotBlank() } ?: BuildConfig.API_BASE_URL
    }

    fun setServerUrl(input: String) {
        val trimmed = input.trim()
        val formatted = when {
            trimmed.startsWith("http://") || trimmed.startsWith("https://") -> {
                if (trimmed.endsWith("/")) trimmed else "$trimmed/"
            }
            trimmed.isNotBlank() -> {
                "http://$trimmed/"
            }
            else -> BuildConfig.API_BASE_URL
        }
        prefs.edit().putString(KEY_SERVER_URL, formatted).apply()
        _serverUrl.value = formatted
    }

    /**
     * Attempts to resolve the current Wi-Fi gateway IP (e.g. laptop hotspot IP).
     */
    fun getWifiGatewayIp(): String? {
        return try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val dhcp = wifiManager?.dhcpInfo ?: return null
            val gateway = dhcp.gateway
            if (gateway == 0) null
            else "${gateway and 0xff}.${gateway shr 8 and 0xff}.${gateway shr 16 and 0xff}.${gateway shr 24 and 0xff}"
        } catch (_: Exception) {
            null
        }
    }

    private companion object {
        const val KEY_SERVER_URL = "custom_server_url"
    }
}
