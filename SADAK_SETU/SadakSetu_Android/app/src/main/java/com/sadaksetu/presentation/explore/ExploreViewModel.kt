package com.sadaksetu.presentation.explore

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sadaksetu.core.common.UiState
import com.sadaksetu.core.location.LocationProvider
import com.sadaksetu.data.remote.model.NearbyLocationDto
import com.sadaksetu.domain.models.Complaint
import com.sadaksetu.domain.models.Location
import com.sadaksetu.domain.repositories.ComplaintRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ExploreData(
    val userLocation: Location?,
    val nearbyLocations: List<NearbyLocationDto>,
    val complaints: List<Complaint>,
)

@HiltViewModel
class ExploreViewModel @Inject constructor(
    private val locationProvider: LocationProvider,
    private val complaintRepository: ComplaintRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<UiState<ExploreData>>(UiState.Loading)
    val state: StateFlow<UiState<ExploreData>> = _state.asStateFlow()

    init {
        loadNearby()
    }

    fun loadNearby() {
        viewModelScope.launch {
            _state.value = UiState.Loading
            val androidLoc = locationProvider.current()
            val userLoc = androidLoc?.let { Location(it.latitude, it.longitude) }

            val complaintsResult = complaintRepository.refresh()
            val allComplaints = complaintsResult.getOrDefault(emptyList())

            if (userLoc != null) {
                val nearbyResult = complaintRepository.nearby(userLoc.latitude, userLoc.longitude, 10000.0)
                val nearby = nearbyResult.getOrDefault(emptyList())
                _state.value = UiState.Data(
                    ExploreData(
                        userLocation = userLoc,
                        nearbyLocations = nearby,
                        complaints = allComplaints,
                    )
                )
            } else {
                _state.value = UiState.Data(
                    ExploreData(
                        userLocation = null,
                        nearbyLocations = emptyList(),
                        complaints = allComplaints,
                    )
                )
            }
        }
    }
}
