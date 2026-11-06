package com.sadaksetu.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "complaints")
data class ComplaintEntity(
    @PrimaryKey val id: String,
    val reporterId: String,
    val complaintNumber: String,
    val title: String,
    val status: String,
    val severity: String,
    val latitude: Double,
    val longitude: Double,
    val createdAt: String,
    val updatedAt: String,
)
