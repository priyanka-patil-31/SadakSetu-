package com.sadaksetu.core.common

object Validators {
    fun email(value: String): String? = when {
        value.isBlank() -> "Email address is required"
        !EMAIL_REGEX.matches(value.trim()) -> "Enter a valid email address (e.g. name@example.com)"
        else -> null
    }

    fun phone(value: String): String? {
        val digits = value.filter { it.isDigit() }
        return when {
            digits.isBlank() -> "Mobile number is required"
            digits.length != 10 -> "Mobile number must be exactly 10 digits"
            !digits.matches(Regex("^[6-9][0-9]{9}$")) -> "Mobile number must start with 6, 7, 8, or 9"
            else -> null
        }
    }

    fun password(value: String, registration: Boolean = false): String? {
        if (value.isBlank()) return "Password is required"
        if (!registration) {
            return if (value.length < 6) "Password must be at least 6 characters" else null
        }
        return when {
            value.length < 8 -> "Password must be at least 8 characters"
            !value.any { it.isUpperCase() } -> "Password must contain at least one uppercase letter (A-Z)"
            !value.any { it.isLowerCase() } -> "Password must contain at least one lowercase letter (a-z)"
            !value.any { it.isDigit() } -> "Password must contain at least one number (0-9)"
            !value.any { "!@#$%^&*()_+-=[]{}|;:,.<>?~`".contains(it) } -> "Password must contain at least one special symbol (e.g. @, #, $, !)"
            else -> null
        }
    }

    fun name(value: String): String? = when {
        value.trim().length < 2 -> "Please enter your full name (minimum 2 characters)"
        else -> null
    }

    fun complaint(title: String, description: String): String? = when {
        title.trim().length < 5 -> "Title must be at least 5 characters"
        description.trim().length < 10 -> "Description must be at least 10 characters"
        else -> null
    }

    private val EMAIL_REGEX = Regex("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
}
