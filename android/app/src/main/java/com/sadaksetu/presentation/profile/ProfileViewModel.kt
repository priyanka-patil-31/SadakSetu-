package com.sadaksetu.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sadaksetu.core.common.UiState
import com.sadaksetu.core.network.toAppError
import com.sadaksetu.data.remote.ApiService
import com.sadaksetu.data.remote.model.ProfileUpdateRequestDto
import com.sadaksetu.data.repository.toDomain
import com.sadaksetu.domain.models.User
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(private val api: ApiService) : ViewModel() {
    private val _state = MutableStateFlow<UiState<User>>(UiState.Loading)
    val state: StateFlow<UiState<User>> = _state.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            runCatching { api.profile().toDomain() }
                .onSuccess { _state.value = UiState.Data(it) }
                .onFailure { _state.value = UiState.Error(it.toAppError().message) }
        }
    }

    fun update(name: String, email: String, onDone: () -> Unit) {
        viewModelScope.launch {
            runCatching { api.updateProfile(ProfileUpdateRequestDto(email = email.trim(), fullName = name.trim())).toDomain() }
                .onSuccess { _state.value = UiState.Data(it); onDone() }
                .onFailure { _state.value = UiState.Error(it.toAppError().message) }
        }
    }
}
