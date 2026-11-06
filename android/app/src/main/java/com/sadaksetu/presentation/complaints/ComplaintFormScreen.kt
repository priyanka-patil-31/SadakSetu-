@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.sadaksetu.presentation.complaints

import android.Manifest
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.PickVisualMediaRequest
import com.sadaksetu.core.camera.CameraCaptureScreen
import coil.compose.AsyncImage
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.res.painterResource
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.draw.clip
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Button
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import com.sadaksetu.core.common.UiState
import com.sadaksetu.core.ui.components.AppTextField
import com.sadaksetu.core.ui.components.ErrorState
import com.sadaksetu.core.ui.components.PrimaryButton

@Composable
fun ComplaintFormScreen(onBack: () -> Unit, onSubmitted: (String) -> Unit, viewModel: ComplaintFormViewModel = hiltViewModel()) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var selectedImage by remember { mutableStateOf<Uri?>(null) }
    var showCamera by remember { mutableStateOf(false) }
    val location by viewModel.location.collectAsState()
    val state by viewModel.state.collectAsState()
    val progress by viewModel.progress.collectAsState()
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
        if (grants[Manifest.permission.ACCESS_FINE_LOCATION] == true || grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true) viewModel.refreshLocation()
    }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { selectedImage = it }

    LaunchedEffect(Unit) {
        permissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
    }
    if (showCamera) {
        CameraCaptureScreen(onCaptured = { selectedImage = it; showCamera = false }, onCancel = { showCamera = false })
        return
    }
    Scaffold(topBar = { TopAppBar(title = { Text("Report road damage") }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") } }) }) { padding ->
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(padding).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Help us identify the problem", style = MaterialTheme.typography.titleLarge)
            Text("Add a clear photo and location so the road team can act faster.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            AppTextField(title, { title = it }, "Issue title")
            AppTextField(description, { description = it }, "What did you find?", singleLine = false)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Text(location?.let { "${it.latitude}, ${it.longitude}" } ?: "Location not available", modifier = Modifier.weight(1f).padding(horizontal = 8.dp))
                OutlinedButton(onClick = viewModel::refreshLocation) { Text("Refresh") }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(onClick = { showCamera = true }, modifier = Modifier.weight(1f)) { Icon(Icons.Default.CameraAlt, contentDescription = null); Text(" Camera") }
                OutlinedButton(onClick = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, modifier = Modifier.weight(1f)) { Text("Gallery") }
            }
            selectedImage?.let { uri ->
                Box {
                    AsyncImage(model = uri, contentDescription = "Selected road image preview", modifier = Modifier.size(112.dp).clip(RoundedCornerShape(16.dp)), contentScale = ContentScale.Crop)
                    IconButton(onClick = { selectedImage = null }, modifier = Modifier.align(Alignment.TopEnd)) {
                        Icon(Icons.Default.Close, contentDescription = "Remove selected photo", tint = MaterialTheme.colorScheme.error)
                    }
                }
                Text("Photo selected: $uri", style = MaterialTheme.typography.bodySmall, maxLines = 2)
            }
            if (state is UiState.Error) ErrorState((state as UiState.Error).message)
            if (state is UiState.Loading) {
                Text(progress?.message ?: "Submitting your complaint…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                LinearProgressIndicator(
                    progress = { progress?.fraction ?: 0f },
                    modifier = Modifier.fillMaxWidth(),
                )
                Text("${((progress?.fraction ?: 0f) * 100).toInt()}%", style = MaterialTheme.typography.labelMedium)
            }
            else PrimaryButton("Submit complaint", { viewModel.submit(title, description, selectedImage) { onSubmitted(it.id) } })
        }
    }
}
