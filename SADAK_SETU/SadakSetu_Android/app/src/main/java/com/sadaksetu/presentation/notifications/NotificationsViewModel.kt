package com.sadaksetu.presentation.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sadaksetu.core.common.UiState
import com.sadaksetu.core.network.toAppError
import com.sadaksetu.data.remote.ApiService
import com.sadaksetu.data.remote.model.NotificationDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NotificationsViewModel @Inject constructor(private val api: ApiService) : ViewModel() {
    private val _state = MutableStateFlow<UiState<List<NotificationDto>>>(UiState.Loading)
    val state: StateFlow<UiState<List<NotificationDto>>> = _state.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            runCatching { api.notifications().items }
                .onSuccess { _state.value = UiState.Data(it) }
                .onFailure { _state.value = UiState.Error(it.toAppError().message) }
        }
    }

    fun markRead(id: String) {
        viewModelScope.launch { runCatching { api.markNotificationRead(id) }; refresh() }
    }

    fun markAllRead() {
        viewModelScope.launch { runCatching { api.markAllNotificationsRead() }; refresh() }
    }
}
