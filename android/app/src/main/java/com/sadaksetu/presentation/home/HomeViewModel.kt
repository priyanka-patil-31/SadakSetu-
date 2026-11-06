package com.sadaksetu.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sadaksetu.core.common.UiState
import com.sadaksetu.domain.models.Complaint
import com.sadaksetu.domain.repositories.ComplaintRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(private val repository: ComplaintRepository) : ViewModel() {
    private val _complaints = MutableStateFlow<UiState<List<Complaint>>>(UiState.Loading)
    val complaints: StateFlow<UiState<List<Complaint>>> = _complaints.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            repository.refresh()
                .onSuccess { _complaints.value = UiState.Data(it) }
                .onFailure { failure ->
                    val cached = repository.observeCached().first()
                    if (cached.isNotEmpty()) _complaints.value = UiState.Data(cached)
                    if (_complaints.value is UiState.Loading) _complaints.value = UiState.Error(failure.message ?: "Unable to load complaints")
                }
        }
    }
}
