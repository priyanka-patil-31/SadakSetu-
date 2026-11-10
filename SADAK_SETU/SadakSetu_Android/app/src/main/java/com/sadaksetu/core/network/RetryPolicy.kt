package com.sadaksetu.core.network

import kotlin.math.min

object RetryPolicy {
    fun delayMillis(attempt: Int): Long = min(30_000L, 1_000L * (1L shl attempt.coerceIn(0, 5)))
    fun shouldRetry(attempt: Int, maxAttempts: Int = 3): Boolean = attempt < maxAttempts
}
