package com.sadaksetu.presentation.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.TextButton
import androidx.compose.ui.Alignment
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.sadaksetu.BuildConfig
import com.sadaksetu.core.ui.components.AppTextField
import com.sadaksetu.core.ui.components.ErrorState
import com.sadaksetu.core.ui.components.LogoHeader
import com.sadaksetu.core.ui.components.PrimaryButton

@Composable
fun AuthScreen(viewModel: AuthViewModel = hiltViewModel()) {
    val form by viewModel.form.collectAsState()
    var passwordVisible by remember { mutableStateOf(false) }
    var showForgotPasswordDialog by remember { mutableStateOf(false) }
    var resetEmail by remember { mutableStateOf("") }
    var resetPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var resetPasswordVisible by remember { mutableStateOf(false) }
    var resetError by remember { mutableStateOf<String?>(null) }
    var resetSuccess by remember { mutableStateOf<String?>(null) }
    var isResetting by remember { mutableStateOf(false) }
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(horizontal = 24.dp, vertical = 32.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        LogoHeader()
        Spacer(Modifier.height(28.dp))
        TabRow(selectedTabIndex = if (form.isRegister) 1 else 0) {
            Tab(selected = !form.isRegister, onClick = { viewModel.setRegister(false) }, text = { Text("Sign in") })
            Tab(selected = form.isRegister, onClick = { viewModel.setRegister(true) }, text = { Text("Create account") })
        }
        Spacer(Modifier.height(24.dp))
        if (form.isRegister) {
            AppTextField(form.fullName, viewModel::updateName, "Full name")
            Spacer(Modifier.height(12.dp))
        }
        AppTextField(form.email, viewModel::updateEmail, "Email address")
        Spacer(Modifier.height(12.dp))
        AppTextField(
            value = form.password,
            onValueChange = viewModel::updatePassword,
            label = "Password",
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            trailingIcon = {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                    Icon(if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility, contentDescription = if (passwordVisible) "Hide password" else "Show password")
                }
            },
        )
        if (!form.isRegister) {
            Spacer(Modifier.height(4.dp))
            TextButton(
                onClick = {
                    resetEmail = form.email
                    resetPassword = ""
                    confirmPassword = ""
                    resetError = null
                    resetSuccess = null
                    showForgotPasswordDialog = true
                },
                modifier = Modifier.align(Alignment.End),
            ) {
                Text("Forgot password?")
            }
        }
        form.error?.let { ErrorState(it) }
        Spacer(Modifier.height(20.dp))
        PrimaryButton(if (form.isRegister) "Create account" else "Sign in", onClick = viewModel::submit, enabled = !form.isSubmitting)
        if (!form.isRegister && BuildConfig.DEBUG && BuildConfig.DEMO_ADMIN_EMAIL.isNotBlank() && BuildConfig.DEMO_ADMIN_PASSWORD.isNotBlank()) {
            Spacer(Modifier.height(10.dp))
            OutlinedButton(onClick = viewModel::demoLogin, modifier = Modifier.fillMaxWidth(), enabled = !form.isSubmitting) {
                Text(if (form.isSubmitting) "Signing in…" else "Demo login")
            }
            Spacer(Modifier.height(6.dp))
            Text(
                text = "Demo user: ${BuildConfig.DEMO_ADMIN_EMAIL}\nPassword: ${BuildConfig.DEMO_ADMIN_PASSWORD}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (form.isSubmitting) {
            Spacer(Modifier.height(12.dp))
            Text("Connecting securely…", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }

    if (showForgotPasswordDialog) {
        AlertDialog(
            onDismissRequest = { if (!isResetting) showForgotPasswordDialog = false },
            title = { Text("Reset Password Directly") },
            text = {
                Column(modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
                    Text(
                        "Enter your email and new password (min. 8 characters) to reset your credentials directly.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(12.dp))
                    AppTextField(value = resetEmail, onValueChange = { resetEmail = it; resetError = null }, label = "Email address")
                    Spacer(Modifier.height(8.dp))
                    AppTextField(
                        value = resetPassword,
                        onValueChange = { resetPassword = it; resetError = null },
                        label = "New password",
                        visualTransformation = if (resetPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { resetPasswordVisible = !resetPasswordVisible }) {
                                Icon(if (resetPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility, contentDescription = "Toggle password")
                            }
                        }
                    )
                    Spacer(Modifier.height(8.dp))
                    AppTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it; resetError = null },
                        label = "Confirm new password",
                        visualTransformation = if (resetPasswordVisible) VisualTransformation.None else PasswordVisualTransformation()
                    )
                    resetError?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                    resetSuccess?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val trimmedEmail = resetEmail.trim()
                        if (trimmedEmail.isBlank()) {
                            resetError = "Please enter your email"
                            return@TextButton
                        }
                        if (resetPassword.length < 8) {
                            resetError = "Password must be at least 8 characters"
                            return@TextButton
                        }
                        if (resetPassword != confirmPassword) {
                            resetError = "Passwords do not match"
                            return@TextButton
                        }
                        isResetting = true
                        resetError = null
                        viewModel.forgotPassword(trimmedEmail, resetPassword) { result ->
                            isResetting = false
                            result.onSuccess { msg ->
                                resetSuccess = msg
                                viewModel.updateEmail(trimmedEmail)
                                viewModel.updatePassword(resetPassword)
                                showForgotPasswordDialog = false
                            }.onFailure { err ->
                                resetError = err.message ?: "Failed to reset password"
                            }
                        }
                    },
                    enabled = !isResetting
                ) {
                    Text(if (isResetting) "Updating..." else "Reset Password")
                }
            },
            dismissButton = {
                TextButton(onClick = { showForgotPasswordDialog = false }, enabled = !isResetting) {
                    Text("Cancel")
                }
            }
        )
    }
}
