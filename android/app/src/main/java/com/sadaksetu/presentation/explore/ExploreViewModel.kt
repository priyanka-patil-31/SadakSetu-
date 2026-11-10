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
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ExploreData(
    val userLocation: Location,
    val isGpsActive: Boolean,
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

            val complaintsResult = complaintRepository.refresh()
            val allComplaints = complaintsResult.getOrElse {
                complaintRepository.observeCached().firstOrNull() ?: emptyList()
            }

            // Determine effective user location: real GPS if available, else first complaint's location or Indiranagar civic hub
            val effectiveLoc = if (androidLoc != null) {
                Location(androidLoc.latitude, androidLoc.longitude)
            } else {
                val firstValidComplaint = allComplaints.firstOrNull { it.location.latitude != 0.0 && it.location.longitude != 0.0 }
                firstValidComplaint?.location ?: Location(12.9079, 77.6269)
            }

            val nearby = try {
                complaintRepository.nearby(effectiveLoc.latitude, effectiveLoc.longitude, 20000.0).getOrDefault(emptyList())
            } catch (_: Exception) {
                emptyList()
            }

            _state.value = UiState.Data(
                ExploreData(
                    userLocation = effectiveLoc,
                    isGpsActive = androidLoc != null,
                    nearbyLocations = nearby,
                    complaints = allComplaints,
                )
            )
        }
    }
}
