@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.sadaksetu.presentation.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Switch
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.sadaksetu.core.common.UiState
import com.sadaksetu.core.ui.components.AppTextField
import com.sadaksetu.core.ui.components.ErrorState
import com.sadaksetu.core.ui.components.LoadingState
import com.sadaksetu.core.ui.components.PrimaryButton

@Composable
fun ProfileScreen(onBack: () -> Unit, onLogout: () -> Unit, viewModel: ProfileViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val settingsViewModel: SettingsViewModel = hiltViewModel()
    val darkThemeEnabled by settingsViewModel.darkThemeEnabled.collectAsState()
    val notificationsEnabled by settingsViewModel.notificationsEnabled.collectAsState()
    var editing by remember { mutableStateOf(false) }
    Scaffold(topBar = { TopAppBar(title = { Text("Profile") }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") } }) }) { padding ->
        when (val current = state) {
            UiState.Loading -> LoadingState("Loading profile…")
            is UiState.Error -> Column(Modifier.padding(padding).padding(20.dp)) { ErrorState(current.message, viewModel::refresh) }
            is UiState.Data -> {
                var name by remember(current.value.id) { mutableStateOf(current.value.fullName) }
                var email by remember(current.value.id) { mutableStateOf(current.value.email) }
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(padding).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text("Account details", style = MaterialTheme.typography.titleLarge)
                    AppTextField(name, { name = it }, "Full name", enabled = editing)
                    AppTextField(email, { email = it }, "Email address", enabled = editing)
                    Text("User role: ${current.value.role}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (editing) PrimaryButton("Save changes", { viewModel.update(name, email) { editing = false } })
                    else PrimaryButton("Edit profile", { editing = true })
                    HorizontalDivider()
                    Text("App preferences", style = MaterialTheme.typography.titleMedium)
                    SettingsToggle(
                        title = "Dark theme",
                        description = "Use a comfortable dark interface at night.",
                        checked = darkThemeEnabled,
                        onCheckedChange = settingsViewModel::setDarkThemeEnabled,
                    )
                    SettingsToggle(
                        title = "Notifications",
                        description = "Receive complaint status updates on this device.",
                        checked = notificationsEnabled,
                        onCheckedChange = settingsViewModel::setNotificationsEnabled,
                    )
                    PrimaryButton("Sign out", onLogout)
                }
            }
        }
    }
}

@Composable
private fun SettingsToggle(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    androidx.compose.foundation.layout.Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}
