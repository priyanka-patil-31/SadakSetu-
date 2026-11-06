package com.sadaksetu.core.common

object Validators {
    fun email(value: String): String? = when {
        value.isBlank() -> "Email is required"
        !EMAIL_REGEX.matches(value.trim()) -> "Enter a valid email address"
        else -> null
    }

    fun password(value: String, registration: Boolean = false): String? = when {
        value.isBlank() -> "Password is required"
        registration && value.length < 8 -> "Password must be at least 8 characters"
        else -> null
    }

    fun name(value: String): String? = when {
        value.trim().length < 2 -> "Enter your full name"
        else -> null
    }

    fun complaint(title: String, description: String): String? = when {
        title.trim().length < 5 -> "Title must be at least 5 characters"
        description.trim().length < 10 -> "Description must be at least 10 characters"
        else -> null
    }

    private val EMAIL_REGEX = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
}
