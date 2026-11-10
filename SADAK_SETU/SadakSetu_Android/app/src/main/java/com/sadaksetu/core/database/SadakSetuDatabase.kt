package com.sadaksetu.core.database

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [ComplaintEntity::class], version = 2, exportSchema = false)
abstract class SadakSetuDatabase : RoomDatabase() {
    abstract fun complaintDao(): ComplaintDao
}
