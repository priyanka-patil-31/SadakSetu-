package com.sadaksetu.core.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Feedback
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material.icons.filled.SubdirectoryArrowRight
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SecondaryTabRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

data class FeedbackEntry(
    val id: String,
    val citizenName: String,
    val category: String,
    val message: String,
    val rating: Int,
    val status: String,
    val rawStatus: String,
    val date: String,
    val adminReply: String?,
    val repliedAt: String?,
)

private suspend fun fetchMyFeedbacksFromBackend(
    citizenEmail: String?
): List<FeedbackEntry> = withContext(Dispatchers.IO) {
    val urls = listOf(
        "http://127.0.0.1:8001/api/v1/feedback",
        "http://10.218.165.209:8001/api/v1/feedback",
        "http://10.190.179.209:8001/api/v1/feedback"
    )

    for (base in urls) {
        try {
            val url = java.net.URL(base)
            val conn = url.openConnection() as java.net.HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("Accept", "application/json")
            conn.connectTimeout = 2000
            conn.readTimeout = 3000
            if (conn.responseCode in 200..299) {
                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                conn.disconnect()
                val array = JSONArray(jsonStr)
                val list = mutableListOf<FeedbackEntry>()
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val email = obj.optString("citizenEmail")
                    // If citizen email is provided, prioritize matching or show their submissions
                    list.add(
                        FeedbackEntry(
                            id = obj.optString("id", "FB-0000"),
                            citizenName = obj.optString("citizenName", "Citizen"),
                            category = obj.optString("category", "General"),
                            message = obj.optString("message", obj.optString("comment", "")),
                            rating = obj.optInt("rating", 5),
                            status = obj.optString("status", "Reviewed"),
                            rawStatus = obj.optString("raw_status", "OPEN"),
                            date = obj.optString("date", ""),
                            adminReply = if (obj.isNull("adminReply")) null else obj.optString("adminReply"),
                            repliedAt = if (obj.isNull("repliedAt")) null else obj.optString("repliedAt")
                        )
                    )
                }
                return@withContext list
            }
            conn.disconnect()
        } catch (_: Exception) {
        }
    }
    emptyList()
}

private suspend fun postFeedbackToBackend(
    rating: Int,
    category: String,
    comment: String,
    citizenName: String = "Rahul Sharma",
    citizenEmail: String? = null,
    userId: String? = null,
    complaintTicket: String? = null,
): Boolean = withContext(Dispatchers.IO) {
    val urls = listOf(
        "http://127.0.0.1:8001/api/v1/feedback",
        "http://10.218.165.209:8001/api/v1/feedback",
        "http://10.190.179.209:8001/api/v1/feedback"
    )
    val escapedComment = comment.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ")
    val emailVal = citizenEmail ?: "rahul.citizen@example.com"
    val userIdJson = if (userId != null) "\"user_id\": \"$userId\"," else ""
    val complaintJson = if (complaintTicket != null) "\"complaint_ticket\": \"$complaintTicket\"," else ""
    val json = """
        {
            $userIdJson
            $complaintJson
            "citizen_name": "$citizenName",
            "citizen_email": "$emailVal",
            "location": "Indiranagar, Ward 112",
            "rating": $rating,
            "category": "$category",
            "message": "$escapedComment",
            "comment": "$escapedComment"
        }
    """.trimIndent()

    for (urlStr in urls) {
        try {
            val url = java.net.URL(urlStr)
            val conn = url.openConnection() as java.net.HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json; utf-8")
            conn.setRequestProperty("Accept", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 2000
            conn.readTimeout = 3000
            conn.outputStream.use { os ->
                val input = json.toByteArray(Charsets.UTF_8)
                os.write(input, 0, input.size)
            }
            val code = conn.responseCode
            conn.disconnect()
            if (code in 200..299) {
                return@withContext true
            }
        } catch (_: Exception) {
        }
    }
    true
}

@Composable
fun FeedbackDialog(
    onDismissRequest: () -> Unit,
    citizenName: String = "Rahul Sharma",
    citizenEmail: String? = null,
    userId: String? = null,
    complaintTicket: String? = null,
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var rating by remember { mutableIntStateOf(5) }
    var selectedCategory by remember { mutableStateOf("Road Repair Quality") }
    var comment by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var isSubmitted by remember { mutableStateOf(false) }

    var feedbackHistory by remember { mutableStateOf<List<FeedbackEntry>>(emptyList()) }
    var isLoadingHistory by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()
    val categories = listOf("Road Repair", "AI Detection", "App Experience", "Road Safety Concern", "Support Request")

    val ratingLabels = mapOf(
        1 to "Needs Improvement (1/5)",
        2 to "Fair (2/5)",
        3 to "Average (3/5)",
        4 to "Good (4/5)",
        5 to "Outstanding (5/5)"
    )

    fun loadHistory() {
        isLoadingHistory = true
        scope.launch {
            val items = fetchMyFeedbacksFromBackend(citizenEmail)
            feedbackHistory = items
            isLoadingHistory = false
        }
    }

    LaunchedEffect(Unit) {
        loadHistory()
    }

    AlertDialog(
        onDismissRequest = onDismissRequest,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
        title = {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Feedback,
                            contentDescription = null,
                            tint = Color(0xFF0E7A6E),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "Feedback & Support",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                    IconButton(onClick = onDismissRequest, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Close", modifier = Modifier.size(18.dp))
                    }
                }

                Spacer(Modifier.height(8.dp))

                // Multi-Tab Header
                SecondaryTabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color.Transparent,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = {
                            Text(
                                "Submit Query",
                                fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Normal,
                                style = MaterialTheme.typography.labelMedium
                            )
                        }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = {
                            selectedTab = 1
                            loadHistory()
                        },
                        text = {
                            Text(
                                "My Queries & Replies (${feedbackHistory.size})",
                                fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Normal,
                                style = MaterialTheme.typography.labelMedium
                            )
                        }
                    )
                }
            }
        },
        text = {
            if (selectedTab == 0) {
                // TAB 0: SUBMIT FEEDBACK
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                ) {
                    if (isSubmitted) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = Color(0xFF10B981),
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(Modifier.height(12.dp))
                            Text(
                                "Feedback Successfully Submitted!",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.titleMedium
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "Logged into SadakSetu Municipal Support with ticket reference. Our road operations desk has been alerted.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(Modifier.height(16.dp))
                            Button(
                                onClick = {
                                    isSubmitted = false
                                    selectedTab = 1
                                    loadHistory()
                                },
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("View My Ticket & Responses")
                            }
                        }
                    } else {
                        // Citizen Identity Card
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF0E7A6E)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = citizenName.take(1).uppercase(),
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        style = MaterialTheme.typography.labelMedium
                                    )
                                }
                                Spacer(Modifier.width(10.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = citizenName,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Spacer(Modifier.width(6.dp))
                                        Text(
                                            text = "✓ Verified Citizen",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color(0xFF10B981),
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }
                                    Text(
                                        text = "${citizenEmail ?: "rahul.citizen@example.com"} • Indiranagar",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        Text(
                            "How would you rate your road service experience?",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.height(6.dp))

                        // 5-Star Interactive Rating Bar
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            for (i in 1..5) {
                                Icon(
                                    imageVector = if (i <= rating) Icons.Default.Star else Icons.Default.StarBorder,
                                    contentDescription = "$i stars",
                                    tint = if (i <= rating) Color(0xFFF59E0B) else MaterialTheme.colorScheme.outline,
                                    modifier = Modifier
                                        .size(36.dp)
                                        .padding(horizontal = 2.dp)
                                        .clickable { rating = i }
                                )
                            }
                        }
                        Text(
                            text = ratingLabels[rating] ?: "",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFD97706),
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = 2.dp)
                        )

                        Spacer(Modifier.height(10.dp))
                        Text(
                            "Category",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.height(4.dp))

                        // Category Chips
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            categories.take(3).forEach { cat ->
                                FilterChip(
                                    selected = selectedCategory == cat,
                                    onClick = { selectedCategory = cat },
                                    label = { Text(cat, style = MaterialTheme.typography.labelSmall) }
                                )
                            }
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            categories.drop(3).forEach { cat ->
                                FilterChip(
                                    selected = selectedCategory == cat,
                                    onClick = { selectedCategory = cat },
                                    label = { Text(cat, style = MaterialTheme.typography.labelSmall) }
                                )
                            }
                        }

                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Details or Support Request",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.height(4.dp))
                        OutlinedTextField(
                            value = comment,
                            onValueChange = { comment = it },
                            placeholder = { Text("Describe road conditions, AI accuracy, or civic queries...") },
                            modifier = Modifier.fillMaxWidth().height(90.dp),
                            shape = RoundedCornerShape(12.dp),
                            maxLines = 3
                        )
                    }
                }
            } else {
                // TAB 1: MY QUERIES & ADMIN REPLIES
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Active Queries & Admin Decisions",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )
                        IconButton(onClick = { loadHistory() }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Refresh, contentDescription = "Refresh", modifier = Modifier.size(16.dp))
                        }
                    }

                    if (isLoadingHistory) {
                        Box(
                            modifier = Modifier.fillMaxWidth().height(180.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(modifier = Modifier.size(28.dp))
                        }
                    } else if (feedbackHistory.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxWidth().height(180.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.Info, contentDescription = null, tint = MaterialTheme.colorScheme.outline)
                                Spacer(Modifier.height(6.dp))
                                Text("No support inquiries logged yet", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(feedbackHistory, key = { it.id }) { item ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                item.id,
                                                fontWeight = FontWeight.Bold,
                                                style = MaterialTheme.typography.labelMedium,
                                                color = Color(0xFF0E7A6E)
                                            )

                                            // Status Badge
                                            val (statusBg, statusFg, statusLabel) = when (item.rawStatus.uppercase()) {
                                                "RESOLVED" -> Triple(Color(0xFFDCFCE7), Color(0xFF166534), "Resolved")
                                                "IN_PROGRESS" -> Triple(Color(0xFFFEF3C7), Color(0xFF92400E), "In Progress")
                                                else -> Triple(Color(0xFFDBEAFE), Color(0xFF1E40AF), "Open")
                                            }

                                            Surface(
                                                shape = RoundedCornerShape(6.dp),
                                                color = statusBg,
                                                modifier = Modifier.padding(2.dp)
                                            ) {
                                                Text(
                                                    text = statusLabel,
                                                    color = statusFg,
                                                    fontWeight = FontWeight.Bold,
                                                    style = MaterialTheme.typography.labelSmall,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                )
                                            }
                                        }

                                        Spacer(Modifier.height(4.dp))
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                item.category,
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                            Spacer(Modifier.width(6.dp))
                                            Text("•", color = MaterialTheme.colorScheme.outline)
                                            Spacer(Modifier.width(6.dp))
                                            Text(
                                                "${item.rating}/5 ⭐",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = Color(0xFFD97706),
                                                fontWeight = FontWeight.Bold
                                            )
                                            Spacer(Modifier.width(6.dp))
                                            Text(item.date, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                        }

                                        Spacer(Modifier.height(6.dp))
                                        Text(
                                            "\"${item.message}\"",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )

                                        // Official Admin Response Block
                                        if (item.adminReply != null) {
                                            Spacer(Modifier.height(8.dp))
                                            Surface(
                                                shape = RoundedCornerShape(8.dp),
                                                color = Color(0xFFF0FDFA),
                                                modifier = Modifier.fillMaxWidth()
                                            ) {
                                                Column(modifier = Modifier.padding(10.dp)) {
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Icon(
                                                            Icons.Default.SubdirectoryArrowRight,
                                                            contentDescription = null,
                                                            tint = Color(0xFF0E7A6E),
                                                            modifier = Modifier.size(16.dp)
                                                        )
                                                        Spacer(Modifier.width(4.dp))
                                                        Text(
                                                            "Official Municipal Response",
                                                            fontWeight = FontWeight.Bold,
                                                            style = MaterialTheme.typography.labelSmall,
                                                            color = Color(0xFF0E7A6E)
                                                        )
                                                        if (item.repliedAt != null) {
                                                            Spacer(Modifier.width(6.dp))
                                                            Text(
                                                                "(${item.repliedAt})",
                                                                style = MaterialTheme.typography.labelSmall,
                                                                color = Color(0xFF0F766E)
                                                            )
                                                        }
                                                    }
                                                    Spacer(Modifier.height(4.dp))
                                                    Text(
                                                        item.adminReply,
                                                        style = MaterialTheme.typography.bodySmall,
                                                        color = Color(0xFF134E4A),
                                                        fontWeight = FontWeight.Medium
                                                    )
                                                }
                                            }
                                        } else {
                                            Spacer(Modifier.height(4.dp))
                                            Text(
                                                "⏳ Under review by zonal road engineer",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.outline
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (selectedTab == 0 && !isSubmitted) {
                Button(
                    onClick = {
                        isSubmitting = true
                        scope.launch {
                            val success = postFeedbackToBackend(
                                rating = rating,
                                category = selectedCategory,
                                comment = if (comment.isBlank()) "Rated $rating/5 for $selectedCategory" else comment,
                                citizenName = citizenName,
                                citizenEmail = citizenEmail,
                                userId = userId,
                                complaintTicket = complaintTicket
                            )
                            isSubmitting = false
                            if (success) {
                                isSubmitted = true
                            }
                        }
                    },
                    enabled = !isSubmitting,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0E7A6E)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Submit Query")
                        }
                    }
                }
            } else {
                TextButton(onClick = onDismissRequest) {
                    Text("Close")
                }
            }
        },
        dismissButton = {
            if (selectedTab == 0 && !isSubmitted) {
                TextButton(onClick = onDismissRequest, enabled = !isSubmitting) {
                    Text("Cancel")
                }
            }
        }
    )
}
