package com.sadaksetu.domain.repositories

import com.sadaksetu.domain.models.Complaint
import com.sadaksetu.domain.models.ComplaintUpdate
import com.sadaksetu.domain.models.Location
import kotlinx.coroutines.flow.Flow

interface ComplaintRepository {
    fun observeCached(): Flow<List<Complaint>>
    suspend fun refresh(): Result<List<Complaint>>
    suspend fun create(title: String, description: String, location: Location): Result<Complaint>
    suspend fun history(complaintId: String): Result<List<ComplaintUpdate>>
}
