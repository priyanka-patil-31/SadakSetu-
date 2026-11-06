package com.sadaksetu.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sadaksetu.BuildConfig
import com.sadaksetu.core.common.Validators
import com.sadaksetu.core.network.SessionStore
import com.sadaksetu.domain.models.User
import com.sadaksetu.domain.repositories.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface AuthState {
    data object Loading : AuthState
    data class Authenticated(val user: User) : AuthState
    data object SignedOut : AuthState
}

data class AuthFormState(
    val fullName: String = "",
    val email: String = "",
    val password: String = "",
    val isRegister: Boolean = false,
    val isSubmitting: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repository: AuthRepository,
    private val sessionStore: SessionStore,
) : ViewModel() {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()
    private val _form = MutableStateFlow(AuthFormState())
    val form: StateFlow<AuthFormState> = _form.asStateFlow()

    init { restore() }

    fun setRegister(value: Boolean) {
        _form.value = AuthFormState(isRegister = value)
    }

    fun updateName(value: String) { _form.value = _form.value.copy(fullName = value, error = null) }
    fun updateEmail(value: String) { _form.value = _form.value.copy(email = value, error = null) }
    fun updatePassword(value: String) { _form.value = _form.value.copy(password = value, error = null) }

    fun submit() {
        val current = _form.value
        val validation = if (current.isRegister) {
            Validators.name(current.fullName) ?: Validators.email(current.email) ?: Validators.password(current.password, registration = true)
        } else Validators.email(current.email) ?: Validators.password(current.password)
        if (validation != null) {
            _form.value = current.copy(error = validation)
            return
        }
        viewModelScope.launch {
            _form.value = current.copy(isSubmitting = true, error = null)
            val result = if (current.isRegister) {
                repository.register(current.fullName, current.email, current.password)
            } else repository.login(current.email, current.password)
            result.onSuccess { user ->
                _form.value = current.copy(isSubmitting = false, password = "")
                _authState.value = AuthState.Authenticated(user)
            }.onFailure { error ->
                _form.value = current.copy(isSubmitting = false, error = error.message ?: "Unable to sign in")
            }
        }
    }

    fun demoLogin() {
        if (!BuildConfig.DEBUG || BuildConfig.DEMO_ADMIN_EMAIL.isBlank() || BuildConfig.DEMO_ADMIN_PASSWORD.isBlank()) return
        val current = _form.value.copy(
            email = BuildConfig.DEMO_ADMIN_EMAIL,
            password = "",
            isSubmitting = true,
            error = null,
        )
        _form.value = current
        viewModelScope.launch {
            repository.login(BuildConfig.DEMO_ADMIN_EMAIL, BuildConfig.DEMO_ADMIN_PASSWORD)
                .onSuccess { user ->
                    _form.value = current.copy(isSubmitting = false)
                    _authState.value = AuthState.Authenticated(user)
                }
                .onFailure { error ->
                    _form.value = current.copy(isSubmitting = false, error = error.message ?: "Unable to use demo login")
                }
        }
    }

    fun restore() {
        if (sessionStore.currentToken().isNullOrBlank()) {
            _authState.value = AuthState.SignedOut
            return
        }
        viewModelScope.launch {
            repository.restoreSession()
                .onSuccess { _authState.value = AuthState.Authenticated(it) }
                .onFailure { sessionStore.clear(); _authState.value = AuthState.SignedOut }
        }
    }

    fun forgotPassword(email: String, newPassword: String, onResult: (Result<String>) -> Unit) {
        viewModelScope.launch {
            val result = repository.forgotPassword(email, newPassword)
            onResult(result)
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
            _authState.value = AuthState.SignedOut
        }
    }
}
