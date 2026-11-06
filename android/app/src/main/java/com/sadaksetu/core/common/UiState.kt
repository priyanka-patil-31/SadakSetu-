package com.sadaksetu.core.common

sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Data<T>(val value: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}
