package com.sadaksetu.data.repository

import com.sadaksetu.core.network.SessionStore
import com.sadaksetu.core.network.asException
import com.sadaksetu.core.network.toAppError
import com.sadaksetu.data.remote.ApiService
import com.sadaksetu.data.remote.model.ForgotPasswordRequestDto
import com.sadaksetu.data.remote.model.LoginRequestDto
import com.sadaksetu.data.remote.model.PasswordUpdateRequestDto
import com.sadaksetu.data.remote.model.RegisterRequestDto
import com.sadaksetu.domain.models.User
import com.sadaksetu.domain.repositories.AuthRepository
import javax.inject.Inject

class AuthRepositoryImpl @Inject constructor(
    private val api: ApiService,
    private val sessionStore: SessionStore,
) : AuthRepository {
    override suspend fun register(fullName: String, email: String, password: String): Result<User> = runCatching {
        api.register(RegisterRequestDto(email.trim(), password, fullName.trim())).also { sessionStore.saveToken(requireNotNull(it.sessionId)) }.user.toDomain()
    }.recoverCatching { throw it.toAppError().asException() }

    override suspend fun forgotPassword(email: String, newPassword: String): Result<String> = runCatching {
        val response = api.forgotPassword(ForgotPasswordRequestDto(email.trim(), newPassword))
        response["message"] ?: "Password reset successfully"
    }.recoverCatching { throw it.toAppError().asException() }

    override suspend fun changePassword(currentPassword: String, newPassword: String): Result<String> = runCatching {
        val response = api.changePassword(PasswordUpdateRequestDto(currentPassword, newPassword))
        response["message"] ?: "Password updated successfully"
    }.recoverCatching { throw it.toAppError().asException() }

    override suspend fun login(email: String, password: String): Result<User> = runCatching {
        api.login(LoginRequestDto(email.trim(), password)).also { sessionStore.saveToken(requireNotNull(it.sessionId)) }.user.toDomain()
    }.recoverCatching { throw it.toAppError().asException() }

    override suspend fun restoreSession(): Result<User> = runCatching { api.authMe().toDomain() }.recoverCatching { throw it.toAppError().asException() }

    override suspend fun logout() {
        runCatching { api.logout() }
        sessionStore.clear()
    }
}
