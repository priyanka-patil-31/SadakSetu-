package com.sadaksetu

import com.sadaksetu.core.common.Validators
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ValidatorsTest {
    @Test
    fun registrationPasswordUsesBackendMinimum() {
        assertEquals("Password must be at least 8 characters", Validators.password("short", registration = true))
        assertNull(Validators.password("a-long-enough-password", registration = true))
    }

    @Test
    fun emailValidationRejectsMalformedInput() {
        assertEquals("Enter a valid email address", Validators.email("not-an-email"))
        assertNull(Validators.email("citizen@example.com"))
    }

    @Test
    fun complaintValidationMatchesBackendMinimums() {
        assertEquals("Title must be at least 5 characters", Validators.complaint("bad", "a useful description"))
        assertEquals("Description must be at least 10 characters", Validators.complaint("Pothole", "too short"))
        assertNull(Validators.complaint("Large pothole", "Pothole near the main road entrance"))
    }
}
