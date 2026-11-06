@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.sadaksetu.presentation.complaints

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.sadaksetu.core.common.UiState
import com.sadaksetu.core.ui.components.ComplaintCard
import com.sadaksetu.core.ui.components.ErrorState
import com.sadaksetu.core.ui.components.LoadingState
import com.sadaksetu.presentation.home.HomeViewModel

@Composable
fun ComplaintHistoryScreen(userId: String, onBack: () -> Unit, onComplaint: (String) -> Unit, viewModel: HomeViewModel = hiltViewModel()) {
    val state by viewModel.complaints.collectAsState()
    Scaffold(topBar = { TopAppBar(title = { Text("Complaint history") }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") } }) }) { padding ->
        when (val current = state) {
            UiState.Loading -> LoadingState("Loading history…")
            is UiState.Error -> androidx.compose.foundation.layout.Column(Modifier.padding(padding).padding(20.dp)) { ErrorState(current.message, viewModel::refresh) }
            is UiState.Data -> {
                val userComplaints = current.value.filter { it.reporterId == userId }
                if (userComplaints.isEmpty()) {
                    Text("Your submitted complaints will appear here.", modifier = Modifier.padding(padding).padding(20.dp))
                } else {
                    LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(userComplaints, key = { it.id }) { complaint -> ComplaintCard(complaint) { onComplaint(complaint.id) } }
                    }
                }
            }
        }
    }
}
