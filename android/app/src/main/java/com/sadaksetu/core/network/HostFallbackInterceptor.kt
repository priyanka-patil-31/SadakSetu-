package com.sadaksetu.core.network

import android.util.Log
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Intelligent multi-homed fallback interceptor.
 * Automatically tries:
 * 1. User-configured custom server URL (saved in ServerConfigStore)
 * 2. Active Wi-Fi IP (10.190.179.209:8001)
 * 3. Wi-Fi router / hotspot gateway IP
 * 4. USB ADB reverse tunnel (127.0.0.1:8001)
 * 5. Fallback historical IPs & emulator (10.0.2.2)
 *
 * Uses fast 1.5-second connect timeouts per candidate during failover so
 * the app never hangs for 20 seconds.
 */
@Singleton
class HostFallbackInterceptor @Inject constructor(
    private val serverConfigStore: ServerConfigStore,
) : Interceptor {
    private val activeWorkingHost = AtomicReference<Pair<String, Int>?>(null)

    private fun getCandidates(originalHost: String, originalPort: Int): List<Pair<String, Int>> {
        val list = mutableListOf<Pair<String, Int>>()

        // 1. User-configured custom server URL
        val customUrl = serverConfigStore.getServerUrl().toHttpUrlOrNull()
        if (customUrl != null) {
            list.add(customUrl.host to customUrl.port)
        }

        // 2. Current known Wi-Fi LAN IP & USB reverse
        list.add("10.218.165.209" to 8001)
        list.add("127.0.0.1" to 8001)
        list.add("10.190.179.209" to 8001)

        // 3. Current Wi-Fi gateway IP (e.g. laptop hotspot)
        serverConfigStore.getWifiGatewayIp()?.let { gateway ->
            if (gateway != "0.0.0.0" && gateway != "127.0.0.1") {
                list.add(gateway to 8001)
            }
        }

        // 4. USB ADB reverse tunnel
        list.add("127.0.0.1" to 8001)

        // 5. Fallback historical IPs & emulator
        list.add("10.154.55.209" to 8001)
        list.add("10.39.6.209" to 8001)
        list.add("10.0.2.2" to 8001)

        return list.distinct()
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val originalUrl = originalRequest.url

        // If we already discovered an active working host, prioritize it
        val currentPreferred = activeWorkingHost.get()
        if (currentPreferred != null && (currentPreferred.first != originalUrl.host || currentPreferred.second != originalUrl.port)) {
            val redirectedUrl = originalUrl.newBuilder()
                .host(currentPreferred.first)
                .port(currentPreferred.second)
                .build()
            try {
                return chain.proceed(originalRequest.newBuilder().url(redirectedUrl).build())
            } catch (_: IOException) {
                activeWorkingHost.set(null)
            }
        }

        // Try primary request
        var lastException: IOException
        try {
            val response = chain.proceed(originalRequest)
            activeWorkingHost.set(originalUrl.host to originalUrl.port)
            return response
        } catch (e: IOException) {
            lastException = e
            Log.w("HostFallback", "Primary host ${originalUrl.host}:${originalUrl.port} failed: ${e.message}. Testing candidate fallbacks...")
        }

        // Try candidate fallbacks with fast 1.5s connection timeout
        val candidates = getCandidates(originalUrl.host, originalUrl.port)
        for ((candHost, candPort) in candidates) {
            if (candHost == originalUrl.host && candPort == originalUrl.port) continue

            val candidateUrl = originalUrl.newBuilder()
                .host(candHost)
                .port(candPort)
                .build()

            val candidateRequest = originalRequest.newBuilder().url(candidateUrl).build()
            try {
                val fastChain = chain.withConnectTimeout(1500, TimeUnit.MILLISECONDS)
                val response = fastChain.proceed(candidateRequest)
                Log.i("HostFallback", "Connected successfully to fallback host $candHost:$candPort")
                activeWorkingHost.set(candHost to candPort)
                return response
            } catch (candEx: IOException) {
                lastException = candEx
            }
        }

        throw lastException
    }
}
