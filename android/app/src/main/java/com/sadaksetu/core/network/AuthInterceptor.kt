package com.sadaksetu.core.network

import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class AuthInterceptor @Inject constructor(private val sessionStore: SessionStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .header("Accept", "application/json")
            .apply { sessionStore.currentToken()?.let { header("Authorization", "Bearer $it") } }
            .build()
        return chain.proceed(request)
    }
}
