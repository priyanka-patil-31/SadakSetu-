package com.sadaksetu.data.repository

import android.content.Context
import android.net.Uri
import com.sadaksetu.data.remote.ApiService
import com.sadaksetu.data.remote.model.AiDirectDetectionResponseDto
import com.sadaksetu.domain.models.Location
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject

class ImageUploader @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiService,
) {
    suspend fun upload(complaintId: String, uri: Uri, location: Location): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val bytes = context.contentResolver.openInputStream(uri)?.use { input -> input.readBytes() }
                ?: error("Photo could not be read")
            require(bytes.size <= 10 * 1024 * 1024) { "Photo must be 10 MB or smaller" }
            val mediaType = (context.contentResolver.getType(uri) ?: "image/jpeg").toMediaType()
            val body = bytes.toRequestBody(mediaType)
            val text = "text/plain".toMediaType()
            api.uploadImage(
                complaintId,
                MultipartBody.Part.createFormData("image", "road-issue.jpg", body),
                location.latitude.toString().toRequestBody(text),
                location.longitude.toString().toRequestBody(text),
            )
        }.map { Unit }
    }

    suspend fun detectDirect(uri: Uri): Result<AiDirectDetectionResponseDto> = withContext(Dispatchers.IO) {
        runCatching {
            val bytes = context.contentResolver.openInputStream(uri)?.use { input -> input.readBytes() }
                ?: error("Photo could not be read")
            require(bytes.size <= 10 * 1024 * 1024) { "Photo must be 10 MB or smaller" }
            val mediaType = (context.contentResolver.getType(uri) ?: "image/jpeg").toMediaType()
            val body = bytes.toRequestBody(mediaType)
            api.detectDirect(MultipartBody.Part.createFormData("image", "detect-pothole.jpg", body))
        }
    }
}
