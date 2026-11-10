package com.sadaksetu.presentation.complaints

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sadaksetu.core.common.UiState
import com.sadaksetu.core.network.toAppError
import com.sadaksetu.data.remote.ApiService
import com.sadaksetu.data.remote.model.AiDetectionDto
import com.sadaksetu.data.remote.model.ComplaintDeleteRequestDto
import com.sadaksetu.data.repository.toDomain
import com.sadaksetu.domain.models.Complaint
import com.sadaksetu.domain.models.ComplaintUpdate
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

data class ComplaintImagePreview(val id: String, val bytes: ByteArray, val mediaType: String)

data class ComplaintDetailState(
    val complaint: Complaint,
    val history: List<ComplaintUpdate>,
    val detections: List<AiDetectionDto>,
    val images: List<ComplaintImagePreview>,
)

@HiltViewModel
class ComplaintDetailViewModel @Inject constructor(private val api: ApiService) : ViewModel() {
    private val _state = MutableStateFlow<UiState<ComplaintDetailState>>(UiState.Loading)
    val state: StateFlow<UiState<ComplaintDetailState>> = _state.asStateFlow()
    private val _deleting = MutableStateFlow(false)
    val deleting: StateFlow<Boolean> = _deleting.asStateFlow()

    fun load(id: String) {
        viewModelScope.launch {
            runCatching {
                val complaint = api.complaint(id).toDomain()
                val images = api.complaintImages(id)
                val previews = images.mapNotNull { image ->
                    runCatching {
                        ComplaintImagePreview(
                            image.id,
                            withContext(Dispatchers.IO) { api.downloadComplaintImage(id, image.id).bytes() },
                            image.mediaType,
                        )
                    }.getOrNull()
                }
                val detections = images.flatMap { image -> runCatching { api.detections(image.id) }.getOrDefault(emptyList()) }
                ComplaintDetailState(complaint, api.complaintHistory(id).items.map { it.toDomain() }, detections, previews)
            }.onSuccess { _state.value = UiState.Data(it) }.onFailure { _state.value = UiState.Error(it.toAppError().message) }
        }
    }

    fun delete(id: String, reason: String, onDeleted: () -> Unit) {
        if (_deleting.value) return
        viewModelScope.launch {
            _deleting.value = true
            runCatching { api.deleteComplaint(id, ComplaintDeleteRequestDto(reason)) }
                .onSuccess { onDeleted() }
                .onFailure { _state.value = UiState.Error(it.toAppError().message) }
            _deleting.value = false
        }
    }
}
