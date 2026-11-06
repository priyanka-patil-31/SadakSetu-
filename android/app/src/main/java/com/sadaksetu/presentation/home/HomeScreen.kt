@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.sadaksetu.presentation.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ListAlt
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.foundation.layout.width
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.sadaksetu.core.common.UiState
import com.sadaksetu.core.ui.components.ComplaintCard
import com.sadaksetu.core.ui.components.ErrorState
import com.sadaksetu.core.ui.components.LoadingState
import com.sadaksetu.core.ui.components.StatCard
import com.sadaksetu.domain.models.User

@Composable
fun HomeScreen(user: User, onCreate: () -> Unit, onComplaint: (String) -> Unit, onProfile: () -> Unit, onNotifications: () -> Unit, onHistory: () -> Unit, viewModel: HomeViewModel = hiltViewModel()) {
    val state by viewModel.complaints.collectAsState()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Column { Text("Hello, ${user.fullName.substringBefore(' ')}"); Text("Keep your streets safer", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) } },
                actions = {
                    IconButton(onClick = onNotifications) { Icon(Icons.Default.Notifications, contentDescription = "Notifications") }
                    IconButton(onClick = onHistory) { Icon(Icons.Default.ListAlt, contentDescription = "Complaint history") }
                    IconButton(onClick = onProfile) { Icon(Icons.Default.Person, contentDescription = "Profile") }
                },
            )
        },
        floatingActionButton = { FloatingActionButton(onClick = onCreate, shape = RoundedCornerShape(16.dp)) { Icon(Icons.Default.Add, contentDescription = "Report a road issue") } },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    val complaints = (state as? UiState.Data)?.value.orEmpty().filter { it.reporterId == user.id }
                    StatCard("Total reports", complaints.size.toString(), Modifier.weight(1f))
                    StatCard("Resolved", complaints.count { it.status == "RESOLVED" }.toString(), Modifier.weight(1f))
                }
                Spacer(Modifier.height(8.dp))
                Text("Recent reports", style = MaterialTheme.typography.titleLarge)
            }
            when (val current = state) {
                UiState.Loading -> item { LoadingState("Loading your reports…") }
                is UiState.Error -> item { ErrorState(current.message, viewModel::refresh) }
                is UiState.Data -> {
                    val userComplaints = current.value.filter { it.reporterId == user.id }
                    if (userComplaints.isEmpty()) {
                    item { Text("No complaints yet. Use the + button to report a road issue.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 24.dp)) }
                    } else items(userComplaints, key = { it.id }) { complaint -> ComplaintCard(complaint) { onComplaint(complaint.id) } }
                }
            }
        }
    }
}
