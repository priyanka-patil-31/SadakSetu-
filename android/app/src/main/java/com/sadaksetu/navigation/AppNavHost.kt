@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.sadaksetu.navigation

import android.net.Uri
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.AddCircleOutline
import androidx.compose.material.icons.outlined.Assignment
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.sadaksetu.R
import com.sadaksetu.presentation.ai.AiDetectionScreen
import com.sadaksetu.presentation.auth.AuthScreen
import com.sadaksetu.presentation.auth.AuthState
import com.sadaksetu.presentation.auth.AuthViewModel
import com.sadaksetu.presentation.complaints.ComplaintDetailScreen
import com.sadaksetu.presentation.complaints.ComplaintFormScreen
import com.sadaksetu.presentation.complaints.ComplaintHistoryScreen
import com.sadaksetu.presentation.explore.ExploreScreen
import com.sadaksetu.presentation.home.HomeScreen
import com.sadaksetu.presentation.notifications.NotificationsScreen
import com.sadaksetu.presentation.profile.ProfileScreen
import com.sadaksetu.presentation.splash.SplashScreen

data class BottomNavItem(
    val route: String,
    val labelResId: Int,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
)

@Composable
fun SadakSetuApp(authViewModel: AuthViewModel = hiltViewModel()) {
    val authState by authViewModel.authState.collectAsState()

    when (val state = authState) {
        AuthState.Loading -> SplashScreen()
        AuthState.SignedOut -> AuthScreen(authViewModel)
        is AuthState.Authenticated -> {
            val navController = rememberNavController()
            val navBackStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = navBackStackEntry?.destination?.route

            var pendingAiImageUri by remember { mutableStateOf<Uri?>(null) }

            val bottomNavItems = listOf(
                BottomNavItem(
                    route = Routes.Home,
                    labelResId = R.string.nav_home,
                    selectedIcon = Icons.Filled.Home,
                    unselectedIcon = Icons.Outlined.Home,
                ),
                BottomNavItem(
                    route = Routes.Explore,
                    labelResId = R.string.nav_explore,
                    selectedIcon = Icons.Filled.Explore,
                    unselectedIcon = Icons.Outlined.Explore,
                ),
                BottomNavItem(
                    route = Routes.ComplaintCreate,
                    labelResId = R.string.nav_report,
                    selectedIcon = Icons.Filled.AddCircle,
                    unselectedIcon = Icons.Outlined.AddCircleOutline,
                ),
                BottomNavItem(
                    route = Routes.MyReports,
                    labelResId = R.string.nav_my_reports,
                    selectedIcon = Icons.Filled.Assignment,
                    unselectedIcon = Icons.Outlined.Assignment,
                ),
                BottomNavItem(
                    route = Routes.Profile,
                    labelResId = R.string.nav_profile,
                    selectedIcon = Icons.Filled.Person,
                    unselectedIcon = Icons.Outlined.Person,
                ),
            )

            val showBottomBar = bottomNavItems.any { it.route == currentRoute }

            Scaffold(
                bottomBar = {
                    if (showBottomBar) {
                        NavigationBar(
                            containerColor = MaterialTheme.colorScheme.surface,
                            contentColor = MaterialTheme.colorScheme.onSurface,
                        ) {
                            bottomNavItems.forEach { item ->
                                val selected = currentRoute == item.route
                                NavigationBarItem(
                                    selected = selected,
                                    onClick = {
                                        if (item.route == Routes.Home) {
                                            navController.navigate(Routes.Home) {
                                                popUpTo(Routes.Home) { inclusive = false }
                                                launchSingleTop = true
                                            }
                                        } else if (currentRoute != item.route) {
                                            navController.navigate(item.route) {
                                                popUpTo(navController.graph.findStartDestination().id) {
                                                    saveState = true
                                                }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        }
                                    },
                                    icon = {
                                        Icon(
                                            if (selected) item.selectedIcon else item.unselectedIcon,
                                            contentDescription = stringResource(item.labelResId)
                                        )
                                    },
                                    label = {
                                        Text(
                                            stringResource(item.labelResId),
                                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
                                        )
                                    },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = MaterialTheme.colorScheme.primary,
                                        selectedTextColor = MaterialTheme.colorScheme.primary,
                                        indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                                    )
                                )
                            }
                        }
                    }
                }
            ) { padding ->
                NavHost(
                    navController = navController,
                    startDestination = Routes.Home,
                    modifier = Modifier.padding(padding)
                ) {
                    composable(Routes.Home) {
                        HomeScreen(
                            user = state.user,
                            onCreate = { navController.navigate(Routes.ComplaintCreate) },
                            onAiDetect = { navController.navigate(Routes.AiDetection) },
                            onExplore = {
                                navController.navigate(Routes.Explore) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            onComplaint = { navController.navigate(Routes.complaintDetail(it)) },
                            onProfile = {
                                navController.navigate(Routes.Profile) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            onNotifications = { navController.navigate(Routes.Notifications) },
                            onHistory = {
                                navController.navigate(Routes.MyReports) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                        )
                    }

                    composable(Routes.Explore) {
                        ExploreScreen(
                            onBack = {
                                navController.navigate(Routes.Home) {
                                    popUpTo(Routes.Home) { inclusive = false }
                                    launchSingleTop = true
                                }
                            },
                            onComplaint = { navController.navigate(Routes.complaintDetail(it)) }
                        )
                    }

                    composable(Routes.ComplaintCreate) {
                        ComplaintFormScreen(
                            onBack = { navController.popBackStack() },
                            onSubmitted = { id ->
                                pendingAiImageUri = null
                                navController.navigate(Routes.complaintDetail(id)) {
                                    popUpTo(Routes.ComplaintCreate) { inclusive = true }
                                }
                            },
                            initialImageUri = pendingAiImageUri,
                            initialCategory = if (pendingAiImageUri != null) "Pothole" else null
                        )
                    }

                    composable(Routes.AiDetection) {
                        AiDetectionScreen(
                            onBack = { navController.popBackStack() },
                            onProceedToReport = { uri ->
                                pendingAiImageUri = uri
                                navController.navigate(Routes.ComplaintCreate)
                            }
                        )
                    }

                    composable(Routes.MyReports) {
                        ComplaintHistoryScreen(
                            userId = state.user.id,
                            onBack = {
                                navController.navigate(Routes.Home) {
                                    popUpTo(Routes.Home) { inclusive = false }
                                    launchSingleTop = true
                                }
                            },
                            onComplaint = { navController.navigate(Routes.complaintDetail(it)) }
                        )
                    }

                    composable(Routes.Profile) {
                        ProfileScreen(
                            onBack = {
                                navController.navigate(Routes.Home) {
                                    popUpTo(Routes.Home) { inclusive = false }
                                    launchSingleTop = true
                                }
                            },
                            onLogout = authViewModel::logout
                        )
                    }

                    composable(
                        Routes.ComplaintDetail,
                        arguments = listOf(navArgument("complaintId") { type = NavType.StringType })
                    ) { entry ->
                        ComplaintDetailScreen(
                            id = requireNotNull(entry.arguments?.getString("complaintId")),
                            userId = state.user.id,
                            onBack = { navController.popBackStack() },
                            onDeleted = { navController.popBackStack() },
                        )
                    }

                    composable(Routes.Notifications) {
                        NotificationsScreen(
                            onBack = { navController.popBackStack() },
                            onComplaint = { navController.navigate(Routes.complaintDetail(it)) }
                        )
                    }
                }
            }
        }
    }
}
