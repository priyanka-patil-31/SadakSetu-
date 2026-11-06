@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.sadaksetu.presentation.notifications

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import com.sadaksetu.core.ui.components.ErrorState
import com.sadaksetu.core.ui.components.LoadingState

@Composable
fun NotificationsScreen(onBack: () -> Unit, viewModel: NotificationsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Scaffold(topBar = {
        TopAppBar(
            title = { Text("Notifications") },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") } },
            actions = { IconButton(onClick = viewModel::markAllRead) { Icon(Icons.Default.DoneAll, contentDescription = "Mark all as read") } },
        )
    }) { padding ->
        when (val current = state) {
            UiState.Loading -> LoadingState("Loading notifications…")
            is UiState.Error -> Column(Modifier.padding(padding).padding(20.dp)) { ErrorState(current.message, viewModel::refresh) }
            is UiState.Data -> if (current.value.isEmpty()) {
                Text("You are all caught up.", modifier = Modifier.padding(padding).padding(20.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(current.value, key = { it.id }) { notification ->
                        Card(
                            onClick = { viewModel.markRead(notification.id) },
                            colors = CardDefaults.cardColors(containerColor = if (notification.readAt == null) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface),
                        ) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                Text(notification.title, style = MaterialTheme.typography.titleMedium)
                                Text(notification.body)
                                Text(notification.createdAt, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }
}
