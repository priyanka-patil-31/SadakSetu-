@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.sadaksetu.presentation.complaints

import android.Manifest
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.sadaksetu.R
import com.sadaksetu.core.camera.CameraCaptureScreen
import com.sadaksetu.core.common.UiState
import com.sadaksetu.core.ui.components.AppTextField
import com.sadaksetu.core.ui.components.ErrorState
import com.sadaksetu.core.ui.components.PrimaryButton

@Composable
fun ComplaintFormScreen(
    onBack: () -> Unit,
    onSubmitted: (String) -> Unit,
    initialImageUri: Uri? = null,
    initialCategory: String? = null,
    viewModel: ComplaintFormViewModel = hiltViewModel(),
) {
    val categories = listOf(
        "Pothole",
        "Damaged road",
        "Road cracks",
        "Waterlogging",
        "Broken manhole",
        "Damaged road shoulder",
        "Other road hazards"
    )

    val severities = listOf("Low", "Medium", "High", "Critical")

    var selectedCategory by remember { mutableStateOf(initialCategory ?: categories[0]) }
    var selectedSeverity by remember { mutableStateOf("Medium") }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var addressLandmark by remember { mutableStateOf("") }
    var selectedImage by remember { mutableStateOf(initialImageUri) }
    var showCamera by remember { mutableStateOf(false) }

    val location by viewModel.location.collectAsState()
    val state by viewModel.state.collectAsState()
    val progress by viewModel.progress.collectAsState()
    val createdComplaint by viewModel.createdComplaint.collectAsState()

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        if (grants[Manifest.permission.ACCESS_FINE_LOCATION] == true || grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true) {
            viewModel.refreshLocation()
        }
    }

    val galleryPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) selectedImage = uri
    }

    LaunchedEffect(Unit) {
        permissionLauncher.launch(
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        )
    }

    if (showCamera) {
        CameraCaptureScreen(
            onCaptured = {
                selectedImage = it
                showCamera = false
            },
            onCancel = { showCamera = false }
        )
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.report_title), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(padding)
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Category Selection Chips
            Column {
                Text(
                    stringResource(R.string.category_label),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(categories) { cat ->
                        FilterChip(
                            selected = selectedCategory == cat,
                            onClick = { selectedCategory = cat },
                            label = { Text(cat) },
                            leadingIcon = if (selectedCategory == cat) {
                                { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) }
                            } else null,
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                                selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        )
                    }
                }
            }

            // Severity Level Selector
            Column {
                Text(
                    stringResource(R.string.severity_label),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    severities.forEach { sev ->
                        val sevColor = when (sev) {
                            "Low" -> Color(0xFF16A34A)
                            "Medium" -> Color(0xFFD97706)
                            "High" -> Color(0xFFEA580C)
                            else -> Color(0xFFDC2626)
                        }
                        FilterChip(
                            selected = selectedSeverity == sev,
                            onClick = { selectedSeverity = sev },
                            label = { Text(sev, fontWeight = FontWeight.SemiBold) },
                            modifier = Modifier.weight(1f),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = sevColor.copy(alpha = 0.2f),
                                selectedLabelColor = sevColor
                            )
                        )
                    }
                }
            }

            // Title and Description
            AppTextField(
                value = title,
                onValueChange = { title = it },
                label = "Issue title (e.g. Deep pothole near junction)"
            )

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text(stringResource(R.string.description_label)) },
                placeholder = { Text("Describe the road condition, depth, hazard to traffic…") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(110.dp),
                shape = RoundedCornerShape(14.dp)
            )

            // Location Box
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)),
                shape = RoundedCornerShape(14.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.LocationOn,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(Modifier.width(6.dp))
                            Text("GPS Location", fontWeight = FontWeight.SemiBold)
                        }
                        IconButton(onClick = viewModel::refreshLocation, modifier = Modifier.size(28.dp)) {
                            Icon(Icons.Default.Refresh, contentDescription = "Refresh GPS", modifier = Modifier.size(18.dp))
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        location?.let { "${"%.5f".format(it.latitude)}, ${"%.5f".format(it.longitude)}" }
                            ?: "Obtaining GPS fix… ensure location permission is allowed.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Editable Address / Landmark
            AppTextField(
                value = addressLandmark,
                onValueChange = { addressLandmark = it },
                label = stringResource(R.string.address_landmark_label)
            )

            // Evidence Photo Section
            Column {
                Text(
                    "Evidence Photo",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = { showCamera = true },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.CameraAlt, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text(stringResource(R.string.camera))
                    }
                    OutlinedButton(
                        onClick = {
                            galleryPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Image, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text(stringResource(R.string.gallery))
                    }
                }

                selectedImage?.let { uri ->
                    Spacer(Modifier.height(12.dp))
                    Box(modifier = Modifier.size(130.dp)) {
                        AsyncImage(
                            model = uri,
                            contentDescription = "Selected road evidence photo",
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(RoundedCornerShape(16.dp)),
                            contentScale = ContentScale.Crop
                        )
                        IconButton(
                            onClick = { selectedImage = null },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .size(32.dp)
                                .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Remove photo",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            if (state is UiState.Error) {
                ErrorState((state as UiState.Error).message)
            }

            if (state is UiState.Loading) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        progress?.message ?: "Registering your complaint…",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(Modifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = { progress?.fraction ?: 0f },
                        modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp))
                    )
                }
            } else {
                Spacer(Modifier.height(8.dp))
                PrimaryButton(
                    text = stringResource(R.string.submit_complaint),
                    onClick = {
                        viewModel.submit(
                            category = selectedCategory,
                            severity = selectedSeverity,
                            title = title,
                            description = description,
                            addressLandmark = addressLandmark,
                            imageUri = selectedImage,
                            onSuccess = {}
                        )
                    }
                )
            }
        }
    }

    // Success Confirmation Dialog
    createdComplaint?.let { complaint ->
        AlertDialog(
            onDismissRequest = {},
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = Color(0xFF16A34A),
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.complaint_submitted_success))
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Your complaint has been filed with the Municipal Road Maintenance Authority.")
                    Spacer(Modifier.height(4.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "Ticket: ${complaint.complaintNumber}",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.resetCreatedComplaint()
                        onSubmitted(complaint.id)
                    }
                ) {
                    Text("View Complaint Details")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        viewModel.resetCreatedComplaint()
                        onBack()
                    }
                ) {
                    Text("Return to Dashboard")
                }
            }
        )
    }
}
