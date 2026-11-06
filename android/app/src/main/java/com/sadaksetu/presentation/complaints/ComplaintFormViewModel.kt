package com.sadaksetu.presentation.complaints

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import android.net.Uri
import com.sadaksetu.core.common.UiState
import com.sadaksetu.core.common.Validators
import com.sadaksetu.core.location.LocationProvider
import com.sadaksetu.domain.models.Complaint
import com.sadaksetu.domain.models.Location
import com.sadaksetu.domain.repositories.ComplaintRepository
import com.sadaksetu.data.repository.ImageUploader
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ComplaintSubmissionProgress(val fraction: Float, val message: String)

@HiltViewModel
class ComplaintFormViewModel @Inject constructor(
    private val repository: ComplaintRepository,
    private val locationProvider: LocationProvider,
    private val imageUploader: ImageUploader,
) : ViewModel() {
    private val _state = MutableStateFlow<UiState<Complaint>>(UiState.Data(placeholder()))
    val state: StateFlow<UiState<Complaint>> = _state.asStateFlow()
    private val _location = MutableStateFlow<Location?>(null)
    val location: StateFlow<Location?> = _location.asStateFlow()
    private val _progress = MutableStateFlow<ComplaintSubmissionProgress?>(null)
    val progress: StateFlow<ComplaintSubmissionProgress?> = _progress.asStateFlow()

    fun refreshLocation() {
        viewModelScope.launch {
            locationProvider.current()?.let { _location.value = Location(it.latitude, it.longitude) }
        }
    }

    fun submit(title: String, description: String, imageUri: Uri?, onSuccess: (Complaint) -> Unit) {
        val validation = Validators.complaint(title, description) ?: if (_location.value == null) "Add a location before submitting" else null
        if (validation != null) {
            _state.value = UiState.Error(validation)
            return
        }
        viewModelScope.launch {
            _state.value = UiState.Loading
            _progress.value = ComplaintSubmissionProgress(0.15f, "Creating your complaint…")
            runCatching {
                val complaint = repository.create(title, description, requireNotNull(_location.value)).getOrThrow()
                _progress.value = ComplaintSubmissionProgress(if (imageUri == null) 0.8f else 0.55f, if (imageUri == null) "Finalizing your report…" else "Uploading your photo…")
                if (imageUri != null) imageUploader.upload(complaint.id, imageUri, requireNotNull(_location.value)).getOrThrow()
                _progress.value = ComplaintSubmissionProgress(1f, "Complaint submitted")
                complaint
            }.onSuccess { complaint ->
                _state.value = UiState.Data(complaint)
                onSuccess(complaint)
            }.onFailure {
                _progress.value = null
                _state.value = UiState.Error(it.message ?: "Unable to submit complaint")
            }
        }
    }

    private fun placeholder() = Complaint("", "", "", "", "", "", "", Location(0.0, 0.0), "", "")
}
