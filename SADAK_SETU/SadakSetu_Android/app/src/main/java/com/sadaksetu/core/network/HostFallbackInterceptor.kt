package com.sadaksetu.core.network

import android.util.Log
import okhttp3.HttpUrl
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.atomic.AtomicReference
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Intelligent dual-homed fallback interceptor.
 * Automatically fails over between Wi-Fi LAN IP (10.39.6.209),
 * USB ADB reverse tunnel (127.0.0.1), and Android Emulator (10.0.2.2)
 * so that developers and users on physical phones never encounter
 * connection timeouts or server unreachable errors.
 */
@Singleton
class HostFallbackInterceptor @Inject constructor() : Interceptor {
    private val candidateHosts = listOf(
        "10.190.179.209" to 8001,`r`n        "10.154.55.209" to 8001,
        "127.0.0.1" to 8001,
        "10.39.6.209" to 8001,
        "10.0.2.2" to 8001,
    )
    private val activeWorkingHost = AtomicReference<Pair<String, Int>?>(null)

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val originalUrl = originalRequest.url

        // If we already discovered a working host that differs from original, try it first
        val currentPreferred = activeWorkingHost.get()
        if (currentPreferred != null && (currentPreferred.first != originalUrl.host || currentPreferred.second != originalUrl.port)) {
            val redirectedUrl = originalUrl.newBuilder()
                .host(currentPreferred.first)
                .port(currentPreferred.second)
                .build()
            try {
                return chain.proceed(originalRequest.newBuilder().url(redirectedUrl).build())
            } catch (ignored: IOException) {
                // Preferred host failed; reset and try full candidate sequence
                activeWorkingHost.set(null)
            }
        }

        // Try the request with the original URL
        var lastException: IOException
        try {
            val response = chain.proceed(originalRequest)
            activeWorkingHost.set(originalUrl.host to originalUrl.port)
            return response
        } catch (e: IOException) {
            lastException = e
            Log.w("HostFallback", "Primary request to ${originalUrl.host}:${originalUrl.port} failed: ${e.message}. Attempting candidate fallbacks...")
        }

        // Iterate through candidates
        for ((candHost, candPort) in candidateHosts) {
            if (candHost == originalUrl.host && candPort == originalUrl.port) continue

            val candidateUrl = originalUrl.newBuilder()
                .host(candHost)
                .port(candPort)
                .build()

            val candidateRequest = originalRequest.newBuilder().url(candidateUrl).build()
            try {
                val response = chain.proceed(candidateRequest)
                Log.i("HostFallback", "Fallback to $candHost:$candPort succeeded! Setting as active host.")
                activeWorkingHost.set(candHost to candPort)
                return response
            } catch (candEx: IOException) {
                lastException = candEx
            }
        }

        throw lastException
    }
}
