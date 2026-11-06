@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.sadaksetu.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.filled.ArrowBack
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.sadaksetu.presentation.auth.AuthScreen
import com.sadaksetu.presentation.auth.AuthState
import com.sadaksetu.presentation.auth.AuthViewModel
import com.sadaksetu.presentation.complaints.ComplaintDetailScreen
import com.sadaksetu.presentation.complaints.ComplaintFormScreen
import com.sadaksetu.presentation.complaints.ComplaintHistoryScreen
import com.sadaksetu.presentation.home.HomeScreen
import com.sadaksetu.presentation.profile.ProfileScreen
import com.sadaksetu.presentation.splash.SplashScreen
import com.sadaksetu.presentation.notifications.NotificationsScreen
import androidx.compose.ui.unit.dp

@Composable
fun SadakSetuApp(authViewModel: AuthViewModel = hiltViewModel()) {
    val authState by authViewModel.authState.collectAsState()
    when (val state = authState) {
        AuthState.Loading -> SplashScreen()
        AuthState.SignedOut -> AuthScreen(authViewModel)
        is AuthState.Authenticated -> {
            val navController = rememberNavController()
            NavHost(navController = navController, startDestination = Routes.Home) {
                composable(Routes.Home) {
                    HomeScreen(
                        user = state.user,
                        onCreate = { navController.navigate(Routes.ComplaintCreate) },
                        onComplaint = { navController.navigate(Routes.complaintDetail(it)) },
                        onProfile = { navController.navigate(Routes.Profile) },
                        onNotifications = { navController.navigate(Routes.Notifications) },
                        onHistory = { navController.navigate(Routes.History) },
                    )
                }
                composable(Routes.Profile) {
                    ProfileScreen(onBack = { navController.popBackStack() }, onLogout = authViewModel::logout)
                }
                composable(Routes.ComplaintCreate) {
                    ComplaintFormScreen(onBack = { navController.popBackStack() }, onSubmitted = { id ->
                        navController.navigate(Routes.complaintDetail(id)) { popUpTo(Routes.ComplaintCreate) { inclusive = true } }
                    })
                }
                composable(Routes.ComplaintDetail, arguments = listOf(navArgument("complaintId") { type = NavType.StringType })) { entry ->
                    ComplaintDetailScreen(
                        id = requireNotNull(entry.arguments?.getString("complaintId")),
                        userId = state.user.id,
                        onBack = { navController.popBackStack() },
                        onDeleted = { navController.popBackStack() },
                    )
                }
                composable(Routes.Notifications) { NotificationsScreen(onBack = { navController.popBackStack() }) }
                composable(Routes.History) {
                    ComplaintHistoryScreen(userId = state.user.id, onBack = { navController.popBackStack() }, onComplaint = { navController.navigate(Routes.complaintDetail(it)) })
                }
            }
        }
    }
}

