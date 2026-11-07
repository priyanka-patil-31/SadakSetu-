package com.sadaksetu.presentation.complaints

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sadaksetu.core.common.UiState
import com.sadaksetu.core.common.Validators
import com.sadaksetu.core.location.LocationProvider
import com.sadaksetu.data.repository.ImageUploader
import com.sadaksetu.domain.models.Complaint
import com.sadaksetu.domain.models.Location
import com.sadaksetu.domain.repositories.ComplaintRepository
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

    private val _createdComplaint = MutableStateFlow<Complaint?>(null)
    val createdComplaint: StateFlow<Complaint?> = _createdComplaint.asStateFlow()

    init {
        refreshLocation()
    }

    fun refreshLocation() {
        viewModelScope.launch {
            locationProvider.current()?.let {
                _location.value = Location(it.latitude, it.longitude)
            }
        }
    }

    fun submit(
        category: String,
        severity: String,
        title: String,
        description: String,
        addressLandmark: String,
        imageUri: Uri?,
        onSuccess: (Complaint) -> Unit,
    ) {
        val effectiveTitle = if (title.isBlank()) "$category Hazard" else title.trim()
        val detailedDescription = buildString {
            append("Category: $category\n")
            append("Severity: $severity\n")
            if (addressLandmark.isNotBlank()) append("Landmark/Address: ${addressLandmark.trim()}\n")
            append("Details: ${description.trim()}")
        }

        val validation = Validators.complaint(effectiveTitle, description.ifBlank { "Road damage reported via SadakSetu." })
            ?: if (_location.value == null) "GPS location is required to submit a report" else null

        if (validation != null) {
            _state.value = UiState.Error(validation)
            return
        }

        viewModelScope.launch {
            _state.value = UiState.Loading
            _progress.value = ComplaintSubmissionProgress(0.15f, "Registering complaint with road department…")
            runCatching {
                val loc = requireNotNull(_location.value).copy(
                    address = addressLandmark.trim().takeIf { it.isNotBlank() }
                )
                val complaint = repository.create(effectiveTitle, detailedDescription, loc).getOrThrow()
                _progress.value = ComplaintSubmissionProgress(
                    if (imageUri == null) 0.85f else 0.5f,
                    if (imageUri == null) "Finalizing report…" else "Uploading road evidence photo…"
                )
                if (imageUri != null) {
                    imageUploader.upload(complaint.id, imageUri, loc).getOrThrow()
                }
                _progress.value = ComplaintSubmissionProgress(1f, "Complaint submitted successfully")
                complaint
            }.onSuccess { complaint ->
                _createdComplaint.value = complaint
                _state.value = UiState.Data(complaint)
                onSuccess(complaint)
            }.onFailure {
                _progress.value = null
                _state.value = UiState.Error(it.message ?: "Unable to submit complaint")
            }
        }
    }

    fun resetCreatedComplaint() {
        _createdComplaint.value = null
    }

    private fun placeholder() = Complaint("", "", "", "", "", "", "", Location(0.0, 0.0), "", "")
}
