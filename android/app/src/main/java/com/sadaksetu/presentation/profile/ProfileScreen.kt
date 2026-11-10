@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)



package com.sadaksetu.presentation.profile



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

import androidx.compose.foundation.rememberScrollState

import androidx.compose.foundation.shape.CircleShape

import androidx.compose.foundation.shape.RoundedCornerShape

import androidx.compose.foundation.verticalScroll

import androidx.compose.material.icons.Icons

import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowBack

import androidx.compose.material.icons.filled.ChevronRight

import androidx.compose.material.icons.filled.DarkMode

import androidx.compose.material.icons.filled.Edit

import androidx.compose.material.icons.filled.Email

import androidx.compose.material.icons.filled.CheckCircle

import androidx.compose.material.icons.filled.Help

import androidx.compose.material.icons.filled.Info

import androidx.compose.material.icons.filled.Language

import androidx.compose.material.icons.filled.Lock

import androidx.compose.material.icons.filled.Notifications

import androidx.compose.material.icons.filled.Person

import androidx.compose.material.icons.filled.Security

import androidx.compose.material.icons.filled.Visibility

import androidx.compose.material.icons.filled.VisibilityOff

import androidx.compose.material3.AlertDialog

import androidx.compose.material3.Button

import androidx.compose.material3.Card

import androidx.compose.material3.CardDefaults

import androidx.compose.material3.HorizontalDivider

import androidx.compose.material3.Icon

import androidx.compose.material3.IconButton

import androidx.compose.material3.MaterialTheme

import androidx.compose.material3.OutlinedButton

import androidx.compose.material3.RadioButton

import androidx.compose.material3.Scaffold

import androidx.compose.material3.Surface

import androidx.compose.material3.Switch

import androidx.compose.material3.Text

import androidx.compose.material3.TextButton

import androidx.compose.material3.TopAppBar

import androidx.compose.runtime.Composable

import androidx.compose.runtime.collectAsState

import androidx.compose.runtime.getValue

import androidx.compose.runtime.mutableStateOf

import androidx.compose.runtime.remember

import androidx.compose.runtime.setValue

import androidx.compose.ui.Alignment

import androidx.compose.ui.Modifier

import androidx.compose.ui.draw.clip

import androidx.compose.ui.graphics.Color

import androidx.compose.ui.graphics.vector.ImageVector

import androidx.compose.ui.res.stringResource

import androidx.compose.ui.text.font.FontWeight

import androidx.compose.ui.text.input.PasswordVisualTransformation

import androidx.compose.ui.text.input.VisualTransformation

import androidx.compose.ui.unit.dp

import androidx.hilt.navigation.compose.hiltViewModel

import com.sadaksetu.R

import com.sadaksetu.core.common.UiState

import com.sadaksetu.core.ui.components.AppTextField

import com.sadaksetu.core.ui.components.FeedbackDialog

import androidx.compose.material.icons.filled.RateReview

import com.sadaksetu.core.ui.components.ErrorState

import com.sadaksetu.core.ui.components.LoadingState

import com.sadaksetu.core.ui.components.PrimaryButton



@Composable

fun ProfileScreen(

    onBack: (() -> Unit)? = null,

    onLogout: () -> Unit,

    viewModel: ProfileViewModel = hiltViewModel(),

) {

    val state by viewModel.state.collectAsState()

    val settingsViewModel: SettingsViewModel = hiltViewModel()

    val darkThemeEnabled by settingsViewModel.darkThemeEnabled.collectAsState()

    val notificationsEnabled by settingsViewModel.notificationsEnabled.collectAsState()

    val languageCode by settingsViewModel.languageCode.collectAsState()



    var showEditDialog by remember { mutableStateOf(false) }

    var showPasswordDialog by remember { mutableStateOf(false) }

    var showLanguageDialog by remember { mutableStateOf(false) }

    var showPrivacyDialog by remember { mutableStateOf(false) }

    var showHelpDialog by remember { mutableStateOf(false) }

    var showFeedbackDialog by remember { mutableStateOf(false) }

    var showAboutDialog by remember { mutableStateOf(false) }

    var showLogoutDialog by remember { mutableStateOf(false) }



    // Password change state

    var currentPassword by remember { mutableStateOf("") }

    var newPassword by remember { mutableStateOf("") }

    var confirmNewPassword by remember { mutableStateOf("") }

    var passwordChangeError by remember { mutableStateOf<String?>(null) }

    var passwordChangeSuccess by remember { mutableStateOf<String?>(null) }

    var isChangingPassword by remember { mutableStateOf(false) }

    var passwordVisible by remember { mutableStateOf(false) }



    Scaffold(

        topBar = {

            TopAppBar(

                title = { Text(stringResource(R.string.profile_title), fontWeight = FontWeight.Bold) },

                navigationIcon = {

                    if (onBack != null) {

                        IconButton(onClick = onBack) {

                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.back_to_home))

                        }

                    }

                }

            )

        }

    ) { padding ->

        when (val current = state) {

            UiState.Loading -> LoadingState("Loading your profile…")

            is UiState.Error -> Column(Modifier.padding(padding).padding(20.dp)) {

                ErrorState(current.message, viewModel::refresh)

            }

            is UiState.Data -> {

                val user = current.value

                Column(

                    modifier = Modifier

                        .fillMaxSize()

                        .verticalScroll(rememberScrollState())

                        .imePadding()

                        .padding(padding)

                        .padding(horizontal = 20.dp, vertical = 14.dp),

                    verticalArrangement = Arrangement.spacedBy(16.dp)

                ) {

                    // Profile Header Card

                    Card(

                        modifier = Modifier.fillMaxWidth(),

                        shape = RoundedCornerShape(18.dp),

                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)

                    ) {

                        Row(

                            modifier = Modifier.padding(18.dp),

                            verticalAlignment = Alignment.CenterVertically

                        ) {

                            Box(

                                modifier = Modifier

                                    .size(56.dp)

                                    .clip(CircleShape)

                                    .background(MaterialTheme.colorScheme.primaryContainer),

                                contentAlignment = Alignment.Center

                            ) {

                                Text(

                                    text = user.fullName.take(1).uppercase(),

                                    style = MaterialTheme.typography.headlineSmall,

                                    fontWeight = FontWeight.Bold,

                                    color = MaterialTheme.colorScheme.onPrimaryContainer

                                )

                            }

                            Spacer(Modifier.width(16.dp))

                            Column(modifier = Modifier.weight(1f)) {

                                Text(

                                    user.fullName,

                                    style = MaterialTheme.typography.titleMedium,

                                    fontWeight = FontWeight.Bold

                                )

                                Text(

                                    user.email,

                                    style = MaterialTheme.typography.bodySmall,

                                    color = MaterialTheme.colorScheme.onSurfaceVariant

                                )

                                Spacer(Modifier.height(4.dp))

                                Surface(

                                    color = MaterialTheme.colorScheme.secondaryContainer,

                                    shape = RoundedCornerShape(50)

                                ) {

                                    Text(

                                        text = user.role.lowercase().replaceFirstChar { it.uppercase() },

                                        style = MaterialTheme.typography.labelSmall,

                                        fontWeight = FontWeight.SemiBold,

                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)

                                    )

                                }

                            }

                            IconButton(onClick = { showEditDialog = true }) {

                                Icon(Icons.Default.Edit, contentDescription = "Edit Profile", tint = MaterialTheme.colorScheme.primary)

                            }

                        }

                    }



                    // Account Actions

                    Text(

                        stringResource(R.string.account_info),

                        style = MaterialTheme.typography.titleMedium,

                        fontWeight = FontWeight.Bold

                    )



                    Card(

                        modifier = Modifier.fillMaxWidth(),

                        shape = RoundedCornerShape(16.dp),

                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)

                    ) {

                        Column {

                            ProfileNavRow(

                                title = stringResource(R.string.change_password),

                                subtitle = stringResource(R.string.change_password_desc),

                                icon = Icons.Default.Lock,

                                onClick = {

                                    currentPassword = ""

                                    newPassword = ""

                                    confirmNewPassword = ""

                                    passwordChangeError = null

                                    passwordChangeSuccess = null

                                    showPasswordDialog = true

                                }

                            )

                        }

                    }



                    // App Settings

                    Text(

                        stringResource(R.string.settings_title),

                        style = MaterialTheme.typography.titleMedium,

                        fontWeight = FontWeight.Bold

                    )



                    Card(

                        modifier = Modifier.fillMaxWidth(),

                        shape = RoundedCornerShape(16.dp),

                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)

                    ) {

                        Column {

                            ProfileNavRow(

                                title = stringResource(R.string.language_setting),

                                subtitle = if (languageCode == "kn") "ಕನ್ನಡ (Kannada)" else "English",

                                icon = Icons.Default.Language,

                                onClick = { showLanguageDialog = true }

                            )

                            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

                            ProfileToggleRow(

                                title = "Dark Theme",

                                subtitle = "Use a comfortable dark interface",

                                icon = Icons.Default.DarkMode,

                                checked = darkThemeEnabled,

                                onCheckedChange = settingsViewModel::setDarkThemeEnabled

                            )

                            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

                            ProfileToggleRow(

                                title = "Status Notifications",

                                subtitle = "Receive road repair progress updates",

                                icon = Icons.Default.Notifications,

                                checked = notificationsEnabled,

                                onCheckedChange = settingsViewModel::setNotificationsEnabled

                            )

                        }

                    }



                    // Civic & Support Information

                    Text(

                        "Information & Support",

                        style = MaterialTheme.typography.titleMedium,

                        fontWeight = FontWeight.Bold

                    )



                    Card(

                        modifier = Modifier.fillMaxWidth(),

                        shape = RoundedCornerShape(16.dp),

                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)

                    ) {

                        Column {

                            ProfileNavRow(

                                title = "Citizen Feedback & Rating",

                                subtitle = "Share your review, rate road repairs or suggest improvements",

                                icon = Icons.Default.RateReview,

                                onClick = { showFeedbackDialog = true }

                            )

                            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

                            ProfileNavRow(

                                title = stringResource(R.string.privacy_policy),

                                subtitle = stringResource(R.string.privacy_desc),

                                icon = Icons.Default.Security,

                                onClick = { showPrivacyDialog = true }

                            )

                            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

                            ProfileNavRow(

                                title = stringResource(R.string.help_support),

                                subtitle = stringResource(R.string.help_support_desc),

                                icon = Icons.Default.Help,

                                onClick = { showHelpDialog = true }

                            )

                            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

                            ProfileNavRow(

                                title = stringResource(R.string.about_app),

                                subtitle = stringResource(R.string.about_version),

                                icon = Icons.Default.Info,

                                onClick = { showAboutDialog = true }

                            )

                        }

                    }



                    Spacer(Modifier.height(8.dp))



                    OutlinedButton(

                        onClick = { showLogoutDialog = true },

                        modifier = Modifier.fillMaxWidth(),

                        shape = RoundedCornerShape(14.dp)

                    ) {

                        Text(stringResource(R.string.sign_out), color = MaterialTheme.colorScheme.error)

                    }

                }

            }

        }

    }



    // Edit Profile Dialog

    if (showEditDialog && state is UiState.Data) {

        val user = (state as UiState.Data).value

        var editName by remember { mutableStateOf(user.fullName) }

        var editEmail by remember { mutableStateOf(user.email) }

        var editError by remember { mutableStateOf<String?>(null) }

        val isEditEmailValid = editEmail.isNotBlank() && com.sadaksetu.core.common.Validators.email(editEmail) == null

        AlertDialog(

            onDismissRequest = { showEditDialog = false },

            title = { Text("Edit Profile") },

            text = {

                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {

                    AppTextField(value = editName, onValueChange = { editName = it; editError = null }, label = "Full name")

                    AppTextField(

                        value = editEmail,

                        onValueChange = { editEmail = it; editError = null },

                        label = if (isEditEmailValid) "Email address (Valid ✓)" else "Email address",

                        error = if (editEmail.isNotBlank() && !isEditEmailValid) com.sadaksetu.core.common.Validators.email(editEmail) else null,

                        trailingIcon = {

                            if (isEditEmailValid) {

                                Icon(Icons.Default.CheckCircle, contentDescription = "Valid email", tint = Color(0xFF10B981))

                            } else {

                                Icon(Icons.Default.Email, contentDescription = null)

                            }

                        }

                    )

                    editError?.let {

                        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)

                    }

                }

            },

            confirmButton = {

                Button(onClick = {

                    val nErr = com.sadaksetu.core.common.Validators.name(editName)

                    if (nErr != null) {

                        editError = nErr

                        return@Button

                    }

                    val eErr = com.sadaksetu.core.common.Validators.email(editEmail)

                    if (eErr != null) {

                        editError = eErr

                        return@Button

                    }

                    viewModel.update(editName, editEmail) { showEditDialog = false }

                }) { Text("Save") }

            },

            dismissButton = {

                TextButton(onClick = { showEditDialog = false }) { Text("Cancel") }

            }

        )

    }



    // Change Password Dialog

    if (showPasswordDialog) {

        AlertDialog(

            onDismissRequest = { if (!isChangingPassword) showPasswordDialog = false },

            title = { Text(stringResource(R.string.change_password)) },

            text = {

                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {

                    AppTextField(

                        value = currentPassword,

                        onValueChange = { currentPassword = it; passwordChangeError = null },

                        label = stringResource(R.string.current_password),

                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation()

                    )

                    AppTextField(

                        value = newPassword,

                        onValueChange = { newPassword = it; passwordChangeError = null },

                        label = stringResource(R.string.new_password),

                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),

                        trailingIcon = {

                            IconButton(onClick = { passwordVisible = !passwordVisible }) {

                                Icon(if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility, contentDescription = null)

                            }

                        }

                    )

                    AppTextField(

                        value = confirmNewPassword,

                        onValueChange = { confirmNewPassword = it; passwordChangeError = null },

                        label = stringResource(R.string.confirm_password),

                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation()

                    )

                    passwordChangeError?.let {

                        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)

                    }

                    passwordChangeSuccess?.let {

                        Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)

                    }

                }

            },

            confirmButton = {

                Button(

                    onClick = {

                        if (currentPassword.isBlank()) {

                            passwordChangeError = "Please enter your current password"

                            return@Button

                        }

                        if (newPassword.length < 8) {

                            passwordChangeError = "New password must be at least 8 characters"

                            return@Button

                        }

                        if (newPassword != confirmNewPassword) {

                            passwordChangeError = "Passwords do not match"

                            return@Button

                        }

                        isChangingPassword = true

                        viewModel.changePassword(currentPassword, newPassword) { result ->

                            isChangingPassword = false

                            result.onSuccess {

                                passwordChangeSuccess = it

                                showPasswordDialog = false

                            }.onFailure {

                                passwordChangeError = it.message ?: "Failed to update password"

                            }

                        }

                    },

                    enabled = !isChangingPassword

                ) { Text(if (isChangingPassword) "Updating…" else "Update Password") }

            },

            dismissButton = {

                TextButton(onClick = { showPasswordDialog = false }, enabled = !isChangingPassword) { Text("Cancel") }

            }

        )

    }



    // Language Dialog

    if (showLanguageDialog) {

        AlertDialog(

            onDismissRequest = { showLanguageDialog = false },

            title = { Text(stringResource(R.string.language_setting)) },

            text = {

                Column {

                    Row(

                        modifier = Modifier.fillMaxWidth().clickable { settingsViewModel.setLanguageCode("en"); showLanguageDialog = false }.padding(vertical = 10.dp),

                        verticalAlignment = Alignment.CenterVertically

                    ) {

                        RadioButton(selected = languageCode == "en", onClick = { settingsViewModel.setLanguageCode("en"); showLanguageDialog = false })

                        Spacer(Modifier.width(8.dp))

                        Text("English")

                    }

                    Row(

                        modifier = Modifier.fillMaxWidth().clickable { settingsViewModel.setLanguageCode("kn"); showLanguageDialog = false }.padding(vertical = 10.dp),

                        verticalAlignment = Alignment.CenterVertically

                    ) {

                        RadioButton(selected = languageCode == "kn", onClick = { settingsViewModel.setLanguageCode("kn"); showLanguageDialog = false })

                        Spacer(Modifier.width(8.dp))

                        Text("ಕನ್ನಡ (Kannada)")

                    }

                }

            },

            confirmButton = {},

            dismissButton = {

                TextButton(onClick = { showLanguageDialog = false }) { Text("Close") }

            }

        )

    }



    // Privacy & Security Dialog

    if (showPrivacyDialog) {

        AlertDialog(

            onDismissRequest = { showPrivacyDialog = false },

            title = { Text(stringResource(R.string.privacy_policy)) },

            text = {

                Column(modifier = Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {

                    Text("• Location Accuracy: Your GPS coordinates are collected solely to dispatch road maintenance teams to the exact physical hazard.", style = MaterialTheme.typography.bodySmall)

                    Text("• Camera & Photos: Photos uploaded are used exclusively for verification and training the civic road safety model.", style = MaterialTheme.typography.bodySmall)

                    Text("• Credential Security: Passwords are encrypted using Argon2id cryptographic hashing on the server.", style = MaterialTheme.typography.bodySmall)

                }

            },

            confirmButton = {

                TextButton(onClick = { showPrivacyDialog = false }) { Text("OK") }

            }

        )

    }



    // Citizen Feedback Dialog

    if (showFeedbackDialog) {

        val currentUser = (state as? UiState.Data)?.value

        FeedbackDialog(

            onDismissRequest = { showFeedbackDialog = false },

            citizenName = currentUser?.fullName ?: "Rahul Sharma",

            citizenEmail = currentUser?.email ?: "rahul.citizen@example.com"

        )

    }



    // Help & Support Dialog

    if (showHelpDialog) {

        AlertDialog(

            onDismissRequest = { showHelpDialog = false },

            title = { Text(stringResource(R.string.help_support)) },

            text = {

                Column(modifier = Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {

                    Text("Municipal Road Emergency Helpline:\n1800-425-ROAD (Toll Free)", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)

                    Spacer(Modifier.height(4.dp))

                    Text("Civic Support Email:\nsupport@sadaksetu.local", style = MaterialTheme.typography.bodySmall)

                    Spacer(Modifier.height(4.dp))

                    Text("Tips for Effective Reporting:\n1. Photograph the hazard in daylight.\n2. Ensure GPS is locked for pinpoint dispatch.\n3. Mention landmarks like junctions or bus stops.", style = MaterialTheme.typography.bodySmall)

                }

            },

            confirmButton = {

                TextButton(onClick = { showHelpDialog = false }) { Text("Done") }

            }

        )

    }



    // About SadakSetu Dialog

    if (showAboutDialog) {

        AlertDialog(

            onDismissRequest = { showAboutDialog = false },

            title = { Text(stringResource(R.string.about_app)) },

            text = {

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {

                    Text("SadakSetu Citizen App", fontWeight = FontWeight.Bold)

                    Text("Version 1.0.0 (Build 2026)", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    Spacer(Modifier.height(4.dp))

                    Text("An AI-powered civic platform bridging citizens and city engineering departments to detect, report, and swiftly repair road damage.", style = MaterialTheme.typography.bodySmall)

                }

            },

            confirmButton = {

                TextButton(onClick = { showAboutDialog = false }) { Text("Close") }

            }

        )

    }



    // Logout Confirmation Dialog

    if (showLogoutDialog) {

        AlertDialog(

            onDismissRequest = { showLogoutDialog = false },

            title = { Text("Sign out of SadakSetu?") },

            text = { Text("You will need to sign in again to submit complaints or view your report history.") },

            confirmButton = {

                Button(onClick = {

                    showLogoutDialog = false

                    onLogout()

                }) { Text("Sign out") }

            },

            dismissButton = {

                TextButton(onClick = { showLogoutDialog = false }) { Text(stringResource(R.string.cancel)) }

            }

        )

    }

}



@Composable

fun ProfileNavRow(

    title: String,

    subtitle: String,

    icon: ImageVector,

    onClick: () -> Unit,

) {

    Row(

        modifier = Modifier

            .fillMaxWidth()

            .clickable(onClick = onClick)

            .padding(16.dp),

        verticalAlignment = Alignment.CenterVertically

    ) {

        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp))

        Spacer(Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {

            Text(title, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)

            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

        }

        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)

    }

}



@Composable

fun ProfileToggleRow(

    title: String,

    subtitle: String,

    icon: ImageVector,

    checked: Boolean,

    onCheckedChange: (Boolean) -> Unit,

) {

    Row(

        modifier = Modifier

            .fillMaxWidth()

            .padding(16.dp),

        verticalAlignment = Alignment.CenterVertically

    ) {

        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp))

        Spacer(Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {

            Text(title, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)

            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

        }

        Switch(checked = checked, onCheckedChange = onCheckedChange)

    }

}

