package com.sadaksetu.core.location

import android.annotation.SuppressLint
import android.content.Context
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import javax.inject.Inject
import kotlin.coroutines.resume

class LocationProvider @Inject constructor(@ApplicationContext context: Context) {
    private val client: FusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(context)

    @SuppressLint("MissingPermission")
    suspend fun current(): android.location.Location? = withContext(Dispatchers.IO) {
        val last = try {
            suspendCancellableCoroutine<android.location.Location?> { continuation ->
                client.lastLocation
                    .addOnSuccessListener { loc -> continuation.resume(loc) }
                    .addOnFailureListener { continuation.resume(null) }
            }
        } catch (_: Exception) {
            null
        }

        if (last != null) {
            return@withContext last
        }

        try {
            withTimeoutOrNull(2500L) {
                suspendCancellableCoroutine<android.location.Location?> { continuation ->
                    val cancellation = CancellationTokenSource()
                    client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellation.token)
                        .addOnSuccessListener { loc -> continuation.resume(loc) }
                        .addOnFailureListener { continuation.resume(null) }
                    continuation.invokeOnCancellation { cancellation.cancel() }
                }
            }
        } catch (_: Exception) {
            null
        }
    }
}
