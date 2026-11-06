package com.sadaksetu.data.repository

import com.sadaksetu.core.database.ComplaintDao
import com.sadaksetu.core.network.asException
import com.sadaksetu.core.network.toAppError
import com.sadaksetu.data.remote.ApiService
import com.sadaksetu.data.remote.model.ComplaintCreateRequestDto
import com.sadaksetu.data.remote.model.LocationDto
import com.sadaksetu.domain.models.Complaint
import com.sadaksetu.domain.models.ComplaintUpdate
import com.sadaksetu.domain.models.Location
import com.sadaksetu.domain.repositories.ComplaintRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class ComplaintRepositoryImpl @Inject constructor(
    private val api: ApiService,
    private val dao: ComplaintDao,
) : ComplaintRepository {
    override fun observeCached(): Flow<List<Complaint>> = dao.observeAll().map { cached ->
        cached.map {
            Complaint(
                id = it.id,
                reporterId = it.reporterId,
                complaintNumber = it.complaintNumber,
                title = it.title,
                description = "",
                status = it.status,
                severity = it.severity,
                location = Location(it.latitude, it.longitude),
                createdAt = it.createdAt,
                updatedAt = it.updatedAt,
            )
        }
    }

    override suspend fun refresh(): Result<List<Complaint>> = runCatching {
        api.complaints().also { response -> dao.upsertAll(response.items.map { it.toEntity() }) }.items.map { it.toDomain() }
    }.recoverCatching { throw it.toAppError().asException() }

    override suspend fun create(title: String, description: String, location: Location): Result<Complaint> = runCatching {
        api.createComplaint(
            ComplaintCreateRequestDto(
                title = title.trim(),
                description = description.trim(),
                location = LocationDto(latitude = location.latitude, longitude = location.longitude, address = location.address, area = location.area, zone = location.zone),
            ),
        ).also { dao.upsertAll(listOf(it.toEntity())) }.toDomain()
    }.recoverCatching { throw it.toAppError().asException() }

    override suspend fun history(complaintId: String): Result<List<ComplaintUpdate>> = runCatching {
        api.complaintHistory(complaintId).items.map { it.toDomain() }
    }.recoverCatching { throw it.toAppError().asException() }
}
