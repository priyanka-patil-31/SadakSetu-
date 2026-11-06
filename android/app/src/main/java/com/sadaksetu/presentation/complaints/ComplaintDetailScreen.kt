@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.sadaksetu.presentation.complaints

import android.content.Intent
import android.net.Uri
import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Button
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.sadaksetu.core.common.UiState
import com.sadaksetu.core.ui.components.ErrorState
import com.sadaksetu.core.ui.components.LoadingState
import com.sadaksetu.core.ui.components.StatusChip

@Composable
fun ComplaintDetailScreen(
    id: String,
    userId: String,
    onBack: () -> Unit,
    onDeleted: () -> Unit,
    viewModel: ComplaintDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val deleting by viewModel.deleting.collectAsState()
    val context = LocalContext.current
    var confirmDelete by remember { mutableStateOf(false) }
    LaunchedEffect(id) { viewModel.load(id) }
    Scaffold(topBar = { TopAppBar(title = { Text("Complaint details") }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") } }) }) { padding ->
        when (val current = state) {
            UiState.Loading -> LoadingState("Loading complaint…")
            is UiState.Error -> Column(Modifier.padding(padding).padding(20.dp)) { ErrorState(current.message, { viewModel.load(id) }) }
            is UiState.Data -> {
                val complaint = current.value.complaint
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(padding).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text(complaint.title, style = MaterialTheme.typography.headlineSmall)
                    Text(complaint.complaintNumber, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    StatusChip(complaint.status)
                    if (complaint.reporterId == userId && complaint.status == "SUBMITTED") {
                        OutlinedButton(onClick = { confirmDelete = true }, enabled = !deleting) {
                            Text(if (deleting) "Deleting…" else "Delete complaint")
                        }
                    }
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(complaint.description)
                            Text("Severity: " + complaint.severity, fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold)
                            Text("Reported location", style = MaterialTheme.typography.titleMedium)
                            Text("Latitude: ${complaint.location.latitude}")
                            Text("Longitude: ${complaint.location.longitude}")
                            Button(onClick = {
                                val mapUri = Uri.parse("geo:${complaint.location.latitude},${complaint.location.longitude}?q=${complaint.location.latitude},${complaint.location.longitude}(SadakSetu complaint)")
                                runCatching {
                                    context.startActivity(Intent(Intent.ACTION_VIEW, mapUri))
                                }.recoverCatching {
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/?api=1&query=${complaint.location.latitude},${complaint.location.longitude}")))
                                }
                            }) { Text("Open in map") }
                        }
                    }
                    if (current.value.images.isNotEmpty()) {
                        Text("Complaint photo", style = MaterialTheme.typography.titleLarge)
                        current.value.images.forEach { image ->
                            val bitmap = remember(image.bytes) { BitmapFactory.decodeByteArray(image.bytes, 0, image.bytes.size)?.asImageBitmap() }
                            bitmap?.let {
                                Image(
                                    bitmap = it,
                                    contentDescription = "Complaint photo",
                                    modifier = Modifier.fillMaxWidth().heightIn(max = 320.dp).clip(RoundedCornerShape(16.dp)),
                                    contentScale = ContentScale.Crop,
                                )
                            }
                        }
                    }
                    if (current.value.detections.isNotEmpty()) {
                        Text("AI analysis", style = MaterialTheme.typography.titleLarge)
                        current.value.detections.forEach { detection ->
                            Card {
                                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(detection.status, fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold)
                                    Text("Detected potholes: " + detection.detectionCount)
                                    Text("Model: " + detection.modelName + " " + detection.modelVersion, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    detection.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                                }
                            }
                        }
                    }
                    Text("Status timeline", style = MaterialTheme.typography.titleLarge)
                    current.value.history.forEach { update ->
                        Card {
                            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(update.eventType.replace('_', ' '), fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold)
                                update.newValue?.let { Text(it.replace('_', ' '), color = MaterialTheme.colorScheme.primary) }
                                update.note?.let { Text(it) }
                                Text(update.createdAt, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }
    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { if (!deleting) confirmDelete = false },
            title = { Text("Delete complaint?") },
            text = { Text("This removes the complaint and its photo because it was added by mistake. This cannot be undone.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmDelete = false
                        viewModel.delete(id, "Added by mistake", onDeleted)
                    },
                    enabled = !deleting,
                ) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { confirmDelete = false }, enabled = !deleting) { Text("Cancel") }
            },
        )
    }
}
