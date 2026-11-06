package com.sadaksetu.data.remote.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    @SerialName("full_name") val fullName: String,
    val role: String,
    @SerialName("is_active") val isActive: Boolean,
)

@Serializable
data class AuthResponseDto(
    val user: UserDto,
    @SerialName("session_id") val sessionId: String? = null,
    @SerialName("expires_at") val expiresAt: String,
)

@Serializable
data class SessionDto(
    val id: String,
    @SerialName("expires_at") val expiresAt: String,
    @SerialName("last_activity_at") val lastActivityAt: String,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class RegisterRequestDto(
    val email: String,
    val password: String,
    @SerialName("full_name") val fullName: String,
    @SerialName("client_type") val clientType: String = "android",
)

@Serializable
data class LoginRequestDto(
    val email: String,
    val password: String,
    @SerialName("client_type") val clientType: String = "android",
)

@Serializable
data class ForgotPasswordRequestDto(
    val email: String,
    @SerialName("new_password") val newPassword: String,
)

@Serializable
data class ProfileUpdateRequestDto(
    val email: String? = null,
    @SerialName("full_name") val fullName: String? = null,
)

@Serializable
data class LocationDto(
    val id: String? = null,
    val latitude: Double,
    val longitude: Double,
    val address: String? = null,
    val area: String? = null,
    val zone: String? = null,
)

@Serializable
data class ComplaintDto(
    val id: String,
    @SerialName("complaint_number") val complaintNumber: String,
    @SerialName("reporter_id") val reporterId: String,
    val status: String,
    val severity: String,
    val title: String,
    val description: String,
    val location: LocationDto,
    @SerialName("assigned_team_id") val assignedTeamId: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
)

@Serializable
data class ComplaintListDto(
    val items: List<ComplaintDto>,
    val total: Int,
    val page: Int,
    @SerialName("page_size") val pageSize: Int,
)

@Serializable
data class ComplaintCreateRequestDto(
    val title: String,
    val description: String,
    val location: LocationDto,
)

@Serializable
data class ComplaintDeleteRequestDto(val reason: String)

@Serializable
data class ComplaintUpdateDto(
    val id: String,
    @SerialName("actor_id") val actorId: String? = null,
    @SerialName("event_type") val eventType: String,
    @SerialName("old_value") val oldValue: String? = null,
    @SerialName("new_value") val newValue: String? = null,
    val note: String? = null,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class ComplaintHistoryDto(val items: List<ComplaintUpdateDto>)

@Serializable
data class ComplaintImageDto(
    val id: String,
    @SerialName("complaint_id") val complaintId: String,
    @SerialName("storage_key") val storageKey: String,
    @SerialName("media_type") val mediaType: String,
    @SerialName("byte_size") val byteSize: Long,
    val checksum: String,
    @SerialName("captured_at") val capturedAt: String? = null,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class AiDetectionDto(
    val id: String,
    @SerialName("complaint_image_id") val complaintImageId: String,
    @SerialName("model_name") val modelName: String,
    @SerialName("model_version") val modelVersion: String,
    val status: String,
    @SerialName("processing_time_ms") val processingTimeMs: Int? = null,
    @SerialName("detection_count") val detectionCount: Int,
    @SerialName("result_metadata") val resultMetadata: Map<String, kotlinx.serialization.json.JsonElement>? = null,
    @SerialName("error_message") val errorMessage: String? = null,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class NotificationDto(
    val id: String,
    @SerialName("complaint_id") val complaintId: String? = null,
    @SerialName("team_id") val teamId: String? = null,
    @SerialName("notification_type") val notificationType: String,
    val title: String,
    val body: String,
    @SerialName("read_at") val readAt: String? = null,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class NotificationListDto(
    val items: List<NotificationDto>,
    val total: Int,
    val unread: Int,
    val page: Int,
    @SerialName("page_size") val pageSize: Int,
)

@Serializable
data class DeviceTokenRequestDto(val platform: String, val token: String)
