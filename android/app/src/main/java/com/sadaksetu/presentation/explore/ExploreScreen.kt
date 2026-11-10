@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.sadaksetu.presentation.explore

import android.Manifest
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.sadaksetu.R
import com.sadaksetu.core.common.UiState
import com.sadaksetu.core.ui.components.ErrorState
import com.sadaksetu.core.ui.components.LoadingState
import com.sadaksetu.core.ui.components.StatusChip
import com.sadaksetu.domain.models.Complaint

private fun formatDistance(userLat: Double, userLng: Double, itemLat: Double, itemLng: Double): String {
    if (userLat == 0.0 || userLng == 0.0 || itemLat == 0.0 || itemLng == 0.0) return "Near Indiranagar"
    val res = FloatArray(1)
    android.location.Location.distanceBetween(userLat, userLng, itemLat, itemLng, res)
    val meters = res[0]
    return if (meters < 1000) {
        "${meters.toInt()} m away"
    } else {
        "${"%.1f".format(meters / 1000f)} km away"
    }
}

@Composable
fun ExploreScreen(
    onBack: (() -> Unit)? = null,
    onComplaint: (String) -> Unit,
    viewModel: ExploreViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    var selectedFilter by remember { mutableStateOf<String>("All") }

    // Request location permissions if not already granted
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {
        viewModel.loadNearby()
    }

    LaunchedEffect(Unit) {
        permissionLauncher.launch(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(stringResource(R.string.explore_title), fontWeight = FontWeight.Bold)
                        Text(
                            stringResource(R.string.explore_subtitle),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = stringResource(R.string.back_to_home)
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::loadNearby) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        when (val current = state) {
            UiState.Loading -> LoadingState(stringResource(R.string.scanning_nearby_issues))
            is UiState.Error -> Column(Modifier.padding(padding).padding(20.dp)) {
                ErrorState(current.message, viewModel::loadNearby)
            }
            is UiState.Data -> {
                val data = current.value
                val rawComplaints = data.complaints
                val userLoc = data.userLocation

                val filteredComplaints = remember(rawComplaints, selectedFilter) {
                    when (selectedFilter) {
                        "Critical" -> rawComplaints.filter { it.severity.equals("CRITICAL", ignoreCase = true) }
                        "Potholes" -> rawComplaints.filter {
                            it.title.contains("pothole", ignoreCase = true) ||
                            it.description.contains("pothole", ignoreCase = true) ||
                            it.severity.equals("CRITICAL", ignoreCase = true)
                        }
                        "In Progress" -> rawComplaints.filter { it.status.equals("IN_PROGRESS", ignoreCase = true) }
                        "Assigned" -> rawComplaints.filter { it.status.equals("ASSIGNED", ignoreCase = true) }
                        else -> rawComplaints
                    }
                }

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // 1. Category Filter Chips
                    item {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            val filterOptions = listOf(
                                "All" to "All",
                                "Potholes" to "Potholes",
                                "Critical" to "Critical",
                                "In Progress" to "In Progress",
                                "Assigned" to "Assigned"
                            )
                            items(filterOptions) { (key, label) ->
                                val selected = selectedFilter == key
                                FilterChip(
                                    selected = selected,
                                    onClick = { selectedFilter = key },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    leadingIcon = if (selected) {
                                        { Icon(Icons.Default.FilterList, contentDescription = null, modifier = Modifier.size(14.dp)) }
                                    } else null,
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                )
                            }
                        }
                    }

                    // 3. Section Title & Quick Navigation Action
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    stringResource(R.string.reported_road_issues),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    "${filteredComplaints.size} road issues reported nearby",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Button(
                                onClick = {
                                    val target = filteredComplaints.firstOrNull()?.location ?: userLoc
                                    val gmmUri = Uri.parse("geo:${target.latitude},${target.longitude}?q=${target.latitude},${target.longitude}(Road+Hazards)")
                                    val mapIntent = Intent(Intent.ACTION_VIEW, gmmUri)
                                    mapIntent.setPackage("com.google.android.apps.maps")
                                    runCatching {
                                        context.startActivity(mapIntent)
                                    }.recoverCatching {
                                        context.startActivity(
                                            Intent(
                                                Intent.ACTION_VIEW,
                                                Uri.parse("https://www.google.com/maps/search/?api=1&query=${target.latitude},${target.longitude}")
                                            )
                                        )
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Google Maps", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }

                    // 4. Complaint Cards List
                    if (filteredComplaints.isEmpty()) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(
                                        Icons.Default.Explore,
                                        contentDescription = null,
                                        modifier = Modifier.size(40.dp),
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Text(stringResource(R.string.no_issues_radius), fontWeight = FontWeight.Bold)
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        stringResource(R.string.roads_clear_notice),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    } else {
                        items(filteredComplaints, key = { it.id }) { complaint ->
                            val distText = formatDistance(
                                userLoc.latitude,
                                userLoc.longitude,
                                complaint.location.latitude,
                                complaint.location.longitude
                            )
                            ExploreComplaintCard(
                                complaint = complaint,
                                distanceText = distText,
                                onClick = { onComplaint(complaint.id) },
                                onOpenMap = {
                                    val uri = Uri.parse("geo:${complaint.location.latitude},${complaint.location.longitude}?q=${complaint.location.latitude},${complaint.location.longitude}(SadakSetu)")
                                    runCatching {
                                        context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                                    }.recoverCatching {
                                        context.startActivity(
                                            Intent(
                                                Intent.ACTION_VIEW,
                                                Uri.parse("https://www.google.com/maps/search/?api=1&query=${complaint.location.latitude},${complaint.location.longitude}")
                                            )
                                        )
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ExploreComplaintCard(
    complaint: Complaint,
    distanceText: String,
    onClick: () -> Unit,
    onOpenMap: () -> Unit,
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        complaint.title,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodyLarge,
                        maxLines = 2
                    )
                    Spacer(Modifier.height(3.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            complaint.complaintNumber,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Box(
                            modifier = Modifier
                                .size(4.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f))
                        )
                        Text(
                            distanceText,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                StatusChip(complaint.status)
            }

            Spacer(Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text(
                    complaint.location.address?.takeIf { it.isNotBlank() }
                        ?: "${"%.4f".format(complaint.location.latitude)}, ${"%.4f".format(complaint.location.longitude)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f)
                )
                IconButton(onClick = onOpenMap, modifier = Modifier.size(32.dp)) {
                    Icon(
                        Icons.Default.NearMe,
                        contentDescription = stringResource(R.string.open_in_maps),
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
