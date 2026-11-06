package com.sadaksetu.core.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.sadaksetu.R
import com.sadaksetu.core.ui.theme.SadakSetuSpacing
import com.sadaksetu.domain.models.Complaint

@Composable
fun LogoHeader(modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Image(
            painter = painterResource(R.drawable.sadaksetu_logo),
            contentDescription = "SadakSetu road safety logo",
            modifier = Modifier.size(92.dp).clip(RoundedCornerShape(24.dp)),
            contentScale = ContentScale.Crop,
        )
        Spacer(Modifier.height(12.dp))
        Text("SadakSetu", style = androidx.compose.material3.MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("Safer roads, stronger communities", color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Button(onClick = onClick, modifier = modifier.fillMaxWidth().height(52.dp), enabled = enabled, shape = RoundedCornerShape(14.dp)) {
        Text(text, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun AppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    error: String? = null,
    singleLine: Boolean = true,
    enabled: Boolean = true,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailingIcon: (@Composable (() -> Unit))? = null,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = modifier.fillMaxWidth(),
        singleLine = singleLine,
        enabled = enabled,
        isError = error != null,
        supportingText = error?.let { { Text(it) } },
        visualTransformation = visualTransformation,
        trailingIcon = trailingIcon,
        shape = RoundedCornerShape(14.dp),
    )
}

@Composable
fun LoadingState(message: String = "Loading…") {
    Column(Modifier.fillMaxWidth().padding(SadakSetuSpacing.xl.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        CircularProgressIndicator()
        Spacer(Modifier.height(12.dp))
        Text(message, color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun ErrorState(message: String, onRetry: (() -> Unit)? = null) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        colors = CardDefaults.cardColors(containerColor = androidx.compose.material3.MaterialTheme.colorScheme.errorContainer),
        shape = RoundedCornerShape(16.dp),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = androidx.compose.material3.MaterialTheme.colorScheme.error)
            Spacer(Modifier.width(12.dp))
            Text(message, Modifier.weight(1f), color = androidx.compose.material3.MaterialTheme.colorScheme.onErrorContainer)
            onRetry?.let { retry -> IconButton(onClick = retry) { Icon(Icons.Default.Refresh, contentDescription = "Retry") } }
        }
    }
}

@Composable
fun StatusChip(status: String) {
    val label = status.replace('_', ' ').lowercase().replaceFirstChar { it.uppercase() }
    val color = when (status) {
        "RESOLVED" -> Color(0xFF1B7A46)
        "REJECTED" -> Color(0xFFBA1A1A)
        "IN_PROGRESS", "ASSIGNED" -> Color(0xFF8A5A00)
        else -> androidx.compose.material3.MaterialTheme.colorScheme.primary
    }
    Surface(color = color.copy(alpha = 0.12f), shape = RoundedCornerShape(50)) {
        Text(label, color = color, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp), style = androidx.compose.material3.MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun ComplaintCard(complaint: Complaint, onClick: () -> Unit) {
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(complaint.title, fontWeight = FontWeight.Bold, maxLines = 2)
                    Spacer(Modifier.height(4.dp))
                    Text(complaint.complaintNumber, style = androidx.compose.material3.MaterialTheme.typography.labelMedium, color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant)
                }
                StatusChip(complaint.status)
            }
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(16.dp), tint = androidx.compose.material3.MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(4.dp))
                Text("${complaint.location.latitude}, ${complaint.location.longitude}", style = androidx.compose.material3.MaterialTheme.typography.bodySmall, color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                Icon(Icons.Default.ArrowForward, contentDescription = "View complaint", modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = androidx.compose.material3.MaterialTheme.colorScheme.primaryContainer)) {
        Column(Modifier.padding(16.dp)) {
            Text(value, style = androidx.compose.material3.MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = androidx.compose.material3.MaterialTheme.colorScheme.onPrimaryContainer)
            Spacer(Modifier.height(4.dp))
            Text(label, style = androidx.compose.material3.MaterialTheme.typography.labelMedium, color = androidx.compose.material3.MaterialTheme.colorScheme.onPrimaryContainer)
        }
    }
}
