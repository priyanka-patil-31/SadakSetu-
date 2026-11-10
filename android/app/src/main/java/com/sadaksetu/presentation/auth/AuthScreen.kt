package com.sadaksetu.presentation.auth

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.foundation.background
import androidx.compose.ui.draw.clip
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Surface
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.sadaksetu.BuildConfig
import com.sadaksetu.R
import com.sadaksetu.core.ui.components.AppTextField
import com.sadaksetu.core.ui.components.ErrorState
import com.sadaksetu.core.ui.components.LogoHeader
import com.sadaksetu.core.ui.components.PrimaryButton

@Composable
fun AuthScreen(viewModel: AuthViewModel = hiltViewModel()) {
    val form by viewModel.form.collectAsState()
    val currentServerUrl by viewModel.currentServerUrl.collectAsState()
    var showServerConfigDialog by remember { mutableStateOf(false) }
    var serverUrlInput by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var confirmPasswordVisible by remember { mutableStateOf(false) }
    var confirmPassword by remember { mutableStateOf("") }
    var phoneNumber by remember { mutableStateOf("") }
    var rememberMe by remember { mutableStateOf(true) }
    var agreedToTerms by remember { mutableStateOf(false) }
    var localError by remember { mutableStateOf<String?>(null) }

    // Forgot password dialog state
    var showForgotPasswordDialog by remember { mutableStateOf(false) }
    var resetEmail by remember { mutableStateOf("") }
    var resetPassword by remember { mutableStateOf("") }
    var resetConfirmPassword by remember { mutableStateOf("") }
    var resetPasswordVisible by remember { mutableStateOf(false) }
    var resetError by remember { mutableStateOf<String?>(null) }
    var resetSuccess by remember { mutableStateOf<String?>(null) }
    var isResetting by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .imePadding()
            .padding(horizontal = 24.dp, vertical = 28.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        LogoHeader()
        Spacer(Modifier.height(12.dp))

        Surface(
            shape = RoundedCornerShape(8.dp),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
            modifier = Modifier
                .fillMaxWidth()
                .clickable {
                    serverUrlInput = currentServerUrl
                    showServerConfigDialog = true
                }
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(end = 8.dp)
                    )
                    Column {
                        Text(
                            text = "Server Connection",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = currentServerUrl,
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                Text(
                    text = "Change",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        TabRow(selectedTabIndex = if (form.isRegister) 1 else 0) {
            Tab(
                selected = !form.isRegister,
                onClick = {
                    localError = null
                    viewModel.setRegister(false)
                },
                text = { Text(stringResource(R.string.sign_in), fontWeight = FontWeight.SemiBold) }
            )
            Tab(
                selected = form.isRegister,
                onClick = {
                    localError = null
                    viewModel.setRegister(true)
                },
                text = { Text(stringResource(R.string.create_account), fontWeight = FontWeight.SemiBold) }
            )
        }

        Spacer(Modifier.height(20.dp))

        if (form.isRegister) {
            AppTextField(
                value = form.fullName,
                onValueChange = {
                    localError = null
                    viewModel.updateName(it)
                },
                label = stringResource(R.string.full_name),
                trailingIcon = { Icon(Icons.Default.Person, contentDescription = null) }
            )
            Spacer(Modifier.height(10.dp))
            AppTextField(
                value = phoneNumber,
                onValueChange = {
                    localError = null
                    phoneNumber = it.filter { ch -> ch.isDigit() }.take(10)
                },
                label = if (phoneNumber.isEmpty()) stringResource(R.string.phone_number) else "${stringResource(R.string.phone_number)} (${phoneNumber.length}/10 digits)",
                trailingIcon = { Icon(Icons.Default.Phone, contentDescription = null) }
            )
            Spacer(Modifier.height(10.dp))
        }

        val isEmailValid = form.email.isNotBlank() && com.sadaksetu.core.common.Validators.email(form.email) == null
        val emailInlineError = if (form.email.isNotBlank() && form.isRegister && !isEmailValid) {
            com.sadaksetu.core.common.Validators.email(form.email)
        } else null

        AppTextField(
            value = form.email,
            onValueChange = {
                localError = null
                viewModel.updateEmail(it)
            },
            label = if (isEmailValid) "${stringResource(R.string.email_address)} (Valid ✓)" else stringResource(R.string.email_address),
            error = emailInlineError,
            trailingIcon = {
                if (isEmailValid) {
                    Icon(Icons.Default.CheckCircle, contentDescription = "Valid email", tint = Color(0xFF10B981))
                } else {
                    Icon(Icons.Default.Email, contentDescription = null)
                }
            }
        )
        Spacer(Modifier.height(10.dp))

        AppTextField(
            value = form.password,
            onValueChange = {
                localError = null
                viewModel.updatePassword(it)
            },
            label = stringResource(R.string.password),
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            trailingIcon = {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                    Icon(
                        if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                        contentDescription = if (passwordVisible) "Hide password" else "Show password"
                    )
                }
            },
        )

        if (form.isRegister) {
            Spacer(Modifier.height(10.dp))
            AppTextField(
                value = confirmPassword,
                onValueChange = {
                    localError = null
                    confirmPassword = it
                },
                label = stringResource(R.string.confirm_password),
                visualTransformation = if (confirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                        Icon(
                            if (confirmPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = if (confirmPasswordVisible) "Hide password" else "Show password"
                        )
                    }
                },
            )

            if (form.password.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        .padding(10.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = "Password Requirements:",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    PasswordRuleItem(text = "At least 8 characters", valid = form.password.length >= 8)
                    PasswordRuleItem(text = "Uppercase (A-Z) & lowercase (a-z)", valid = form.password.any { it.isUpperCase() } && form.password.any { it.isLowerCase() })
                    PasswordRuleItem(text = "At least one digit (0-9)", valid = form.password.any { it.isDigit() })
                    PasswordRuleItem(text = "At least one symbol (!@#$%^&*)", valid = form.password.any { "!@#$%^&*()_+-=[]{}|;:,.<>?~`".contains(it) })
                    if (confirmPassword.isNotEmpty()) {
                        PasswordRuleItem(text = "Passwords match", valid = form.password == confirmPassword)
                    }
                }
            }

            Spacer(Modifier.height(10.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { agreedToTerms = !agreedToTerms }
            ) {
                Checkbox(
                    checked = agreedToTerms,
                    onCheckedChange = { agreedToTerms = it }
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    text = "I agree to SadakSetu Terms of Service and Road Safety Reporting Guidelines.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { rememberMe = !rememberMe }
                ) {
                    Checkbox(
                        checked = rememberMe,
                        onCheckedChange = { rememberMe = it }
                    )
                    Text("Remember me", style = MaterialTheme.typography.bodySmall)
                }
                TextButton(
                    onClick = {
                        resetEmail = form.email
                        resetPassword = ""
                        resetConfirmPassword = ""
                        resetError = null
                        resetSuccess = null
                        showForgotPasswordDialog = true
                    }
                ) {
                    Text(stringResource(R.string.forgot_password), style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        localError?.let { ErrorState(it) }
        form.error?.let { ErrorState(it) }

        if (form.error != null || localError != null) {
            Spacer(Modifier.height(6.dp))
            OutlinedButton(
                onClick = {
                    serverUrlInput = currentServerUrl
                    showServerConfigDialog = true
                },
                modifier = Modifier.fillMaxWidth().height(42.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = null,
                    modifier = Modifier.padding(end = 6.dp)
                )
                Text("Configure Server IP / Mode", style = MaterialTheme.typography.labelSmall)
            }
        }

        Spacer(Modifier.height(16.dp))

        PrimaryButton(
            text = if (form.isRegister) stringResource(R.string.create_account) else stringResource(R.string.sign_in),
            onClick = {
                if (form.isRegister) {
                    val nameErr = com.sadaksetu.core.common.Validators.name(form.fullName)
                    if (nameErr != null) {
                        localError = nameErr
                        return@PrimaryButton
                    }
                    val phoneErr = com.sadaksetu.core.common.Validators.phone(phoneNumber)
                    if (phoneErr != null) {
                        localError = phoneErr
                        return@PrimaryButton
                    }
                    val emailErr = com.sadaksetu.core.common.Validators.email(form.email)
                    if (emailErr != null) {
                        localError = emailErr
                        return@PrimaryButton
                    }
                    val passErr = com.sadaksetu.core.common.Validators.password(form.password, registration = true)
                    if (passErr != null) {
                        localError = passErr
                        return@PrimaryButton
                    }
                    if (form.password != confirmPassword) {
                        localError = "Passwords do not match."
                        return@PrimaryButton
                    }
                    if (!agreedToTerms) {
                        localError = "Please accept the terms and guidelines to continue."
                        return@PrimaryButton
                    }
                } else {
                    val emailErr = com.sadaksetu.core.common.Validators.email(form.email)
                    if (emailErr != null) {
                        localError = emailErr
                        return@PrimaryButton
                    }
                    val passErr = com.sadaksetu.core.common.Validators.password(form.password, registration = false)
                    if (passErr != null) {
                        localError = passErr
                        return@PrimaryButton
                    }
                }
                viewModel.submit()
            },
            enabled = !form.isSubmitting
        )

        if (!form.isRegister) {
            Spacer(Modifier.height(12.dp))
            OutlinedButton(
                onClick = { viewModel.demoLogin() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                enabled = !form.isSubmitting
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.padding(end = 8.dp)
                )
                Text(
                    text = if (form.isSubmitting) stringResource(R.string.connecting) else "Login with Demo Account",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Spacer(Modifier.height(6.dp))
            Text(
                text = "Demo Admin: admin@sadaksetu.local",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        }

        if (form.isSubmitting) {
            Spacer(Modifier.height(12.dp))
            Text(
                stringResource(R.string.connecting),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }

    if (showForgotPasswordDialog) {
        AlertDialog(
            onDismissRequest = { if (!isResetting) showForgotPasswordDialog = false },
            title = { Text(stringResource(R.string.reset_password)) },
            text = {
                Column(modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
                    Text(
                        "Enter your account email and new password (min. 8 characters) to reset your credentials.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(12.dp))
                    AppTextField(
                        value = resetEmail,
                        onValueChange = { resetEmail = it; resetError = null },
                        label = stringResource(R.string.email_address)
                    )
                    Spacer(Modifier.height(8.dp))
                    AppTextField(
                        value = resetPassword,
                        onValueChange = { resetPassword = it; resetError = null },
                        label = stringResource(R.string.new_password),
                        visualTransformation = if (resetPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { resetPasswordVisible = !resetPasswordVisible }) {
                                Icon(
                                    if (resetPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = "Toggle password"
                                )
                            }
                        }
                    )
                    Spacer(Modifier.height(8.dp))
                    AppTextField(
                        value = resetConfirmPassword,
                        onValueChange = { resetConfirmPassword = it; resetError = null },
                        label = stringResource(R.string.confirm_password),
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
                        if (resetPassword != resetConfirmPassword) {
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

@Composable
private fun PasswordRuleItem(text: String, valid: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = if (valid) Icons.Default.CheckCircle else Icons.Default.Cancel,
            contentDescription = null,
            tint = if (valid) Color(0xFF10B981) else Color(0xFF94A3B8),
            modifier = Modifier.size(14.dp)
        )
        Spacer(Modifier.width(6.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = if (valid) Color(0xFF10B981) else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
