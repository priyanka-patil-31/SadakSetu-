package com.sadaksetu

import com.sadaksetu.core.network.RetryPolicy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RetryPolicyTest {
    @Test
    fun backoffIsBoundedAndExponential() {
        assertEquals(1_000L, RetryPolicy.delayMillis(0))
        assertEquals(2_000L, RetryPolicy.delayMillis(1))
        assertEquals(30_000L, RetryPolicy.delayMillis(20))
    }

    @Test
    fun retryStopsAtMaximum() {
        assertTrue(RetryPolicy.shouldRetry(0))
        assertFalse(RetryPolicy.shouldRetry(3))
    }
}
