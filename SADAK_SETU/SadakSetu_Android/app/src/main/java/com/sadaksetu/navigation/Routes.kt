package com.sadaksetu.navigation

object Routes {
    const val Splash = "splash"
    const val Login = "login"
    const val Register = "register"
    const val Home = "home"
    const val Explore = "explore"
    const val ComplaintCreate = "complaint/create"
    const val AiDetection = "ai/detect"
    const val MyReports = "reports"
    const val Notifications = "notifications"
    const val Profile = "profile"
    const val Settings = "settings"
    const val ComplaintDetail = "complaint/{complaintId}"

    fun complaintDetail(id: String) = "complaint/$id"
}
