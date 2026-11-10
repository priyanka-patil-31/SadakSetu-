package com.sadaksetu.di

import com.sadaksetu.core.database.SadakSetuDatabase
import com.sadaksetu.data.remote.ApiService
import com.sadaksetu.data.repository.AuthRepositoryImpl
import com.sadaksetu.data.repository.ComplaintRepositoryImpl
import com.sadaksetu.domain.repositories.AuthRepository
import com.sadaksetu.domain.repositories.ComplaintRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindAuthRepository(implementation: AuthRepositoryImpl): AuthRepository

    @Binds
    @Singleton
    abstract fun bindComplaintRepository(implementation: ComplaintRepositoryImpl): ComplaintRepository

    companion object {
        @Provides
        fun provideComplaintDao(database: SadakSetuDatabase) = database.complaintDao()
    }
}
