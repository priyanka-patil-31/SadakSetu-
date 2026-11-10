package com.sadaksetu.presentation.ai

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sadaksetu.core.common.UiState
import com.sadaksetu.data.remote.model.AiDirectDetectionResponseDto
import com.sadaksetu.data.repository.ImageUploader
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AiDetectionViewModel @Inject constructor(
    private val imageUploader: ImageUploader,
) : ViewModel() {
    private val _detectionState = MutableStateFlow<UiState<AiDirectDetectionResponseDto>?>(null)
    val detectionState: StateFlow<UiState<AiDirectDetectionResponseDto>?> = _detectionState.asStateFlow()

    private val _selectedUri = MutableStateFlow<Uri?>(null)
    val selectedUri: StateFlow<Uri?> = _selectedUri.asStateFlow()

    fun selectImage(uri: Uri?) {
        _selectedUri.value = uri
        _detectionState.value = null
    }

    fun runDetection() {
        val uri = _selectedUri.value ?: return
        viewModelScope.launch {
            _detectionState.value = UiState.Loading
            val result = imageUploader.detectDirect(uri)
            result.onSuccess {
                _detectionState.value = UiState.Data(it)
            }.onFailure {
                _detectionState.value = UiState.Error(it.message ?: "AI detection failed")
            }
        }
    }
}
