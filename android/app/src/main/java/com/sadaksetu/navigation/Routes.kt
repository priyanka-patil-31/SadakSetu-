package com.sadaksetu.navigation

object Routes {
    const val Splash = "splash"
    const val Login = "login"
    const val Register = "register"
    const val Home = "home"
    const val Profile = "profile"
    const val ComplaintCreate = "complaint/create"
    const val Notifications = "notifications"
    const val History = "history"
    const val ComplaintDetail = "complaint/{complaintId}"

    fun complaintDetail(id: String) = "complaint/$id"
}
