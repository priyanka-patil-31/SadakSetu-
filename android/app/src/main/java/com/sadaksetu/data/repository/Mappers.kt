package com.sadaksetu.data.repository

import com.sadaksetu.core.database.ComplaintEntity
import com.sadaksetu.data.remote.model.*
import com.sadaksetu.domain.models.*

fun UserDto.toDomain() = User(id, email, fullName, role, isActive)

fun LocationDto.toDomain() = Location(latitude, longitude, address, area, zone)

fun ComplaintDto.toDomain() = Complaint(id, reporterId, complaintNumber, title, description, status, severity, location.toDomain(), createdAt, updatedAt)

fun ComplaintDto.toEntity() = ComplaintEntity(id, reporterId, complaintNumber, title, status, severity, location.latitude, location.longitude, createdAt, updatedAt)

fun ComplaintUpdateDto.toDomain() = ComplaintUpdate(id, eventType, oldValue, newValue, note, createdAt)
