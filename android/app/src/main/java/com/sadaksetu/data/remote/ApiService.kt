package com.sadaksetu.data.remote

import com.sadaksetu.data.remote.model.*
import okhttp3.MultipartBody
import okhttp3.ResponseBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @POST("api/v1/auth/register")
    suspend fun register(@Body body: RegisterRequestDto): AuthResponseDto

    @POST("api/v1/auth/login")
    suspend fun login(@Body body: LoginRequestDto): AuthResponseDto

    @POST("api/v1/auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequestDto): Map<String, String>

    @POST("api/v1/auth/logout")
    suspend fun logout(): Map<String, String>

    @GET("api/v1/auth/me")
    suspend fun authMe(): UserDto

    @GET("api/v1/auth/session")
    suspend fun session(): SessionDto

    @GET("api/v1/users/me")
    suspend fun profile(): UserDto

    @PATCH("api/v1/users/me")
    suspend fun updateProfile(@Body body: ProfileUpdateRequestDto): UserDto

    @GET("api/v1/complaints")
    suspend fun complaints(
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 25,
    ): ComplaintListDto

    @POST("api/v1/complaints")
    suspend fun createComplaint(@Body body: ComplaintCreateRequestDto): ComplaintDto

    @GET("api/v1/complaints/{complaintId}")
    suspend fun complaint(@Path("complaintId") complaintId: String): ComplaintDto

    @HTTP(method = "DELETE", path = "api/v1/complaints/{complaintId}", hasBody = true)
    suspend fun deleteComplaint(
        @Path("complaintId") complaintId: String,
        @Body body: ComplaintDeleteRequestDto,
    ): Map<String, String>

    @GET("api/v1/complaints/{complaintId}/history")
    suspend fun complaintHistory(@Path("complaintId") complaintId: String): ComplaintHistoryDto

    @Multipart
    @POST("api/v1/complaints/{complaintId}/images")
    suspend fun uploadImage(
        @Path("complaintId") complaintId: String,
        @Part image: MultipartBody.Part,
        @Part("latitude") latitude: RequestBody,
        @Part("longitude") longitude: RequestBody,
    ): ComplaintImageDto

    @GET("api/v1/complaints/{complaintId}/images")
    suspend fun complaintImages(@Path("complaintId") complaintId: String): List<ComplaintImageDto>

    @GET("api/v1/complaints/{complaintId}/images/{imageId}")
    suspend fun downloadComplaintImage(
        @Path("complaintId") complaintId: String,
        @Path("imageId") imageId: String,
    ): ResponseBody

    @POST("api/v1/ai/images/{imageId}/detect")
    suspend fun detectImage(@Path("imageId") imageId: String): AiDetectionDto

    @GET("api/v1/ai/images/{imageId}/detections")
    suspend fun detections(@Path("imageId") imageId: String): List<AiDetectionDto>

    @GET("api/v1/notifications")
    suspend fun notifications(@Query("page") page: Int = 1, @Query("page_size") pageSize: Int = 50): NotificationListDto

    @PATCH("api/v1/notifications/{notificationId}/read")
    suspend fun markNotificationRead(@Path("notificationId") notificationId: String): NotificationDto

    @POST("api/v1/notifications/read-all")
    suspend fun markAllNotificationsRead(): Map<String, Int>

    @POST("api/v1/notifications/tokens")
    suspend fun registerDeviceToken(@Body body: DeviceTokenRequestDto)

    @DELETE("api/v1/notifications/tokens/{tokenId}")
    suspend fun deleteDeviceToken(@Path("tokenId") tokenId: String)
}
