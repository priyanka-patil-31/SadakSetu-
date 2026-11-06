package com.sadaksetu.domain.repositories

import com.sadaksetu.domain.models.User

interface AuthRepository {
    suspend fun register(fullName: String, email: String, password: String): Result<User>
    suspend fun login(email: String, password: String): Result<User>
    suspend fun forgotPassword(email: String, newPassword: String): Result<String>
    suspend fun restoreSession(): Result<User>
    suspend fun logout()
}
