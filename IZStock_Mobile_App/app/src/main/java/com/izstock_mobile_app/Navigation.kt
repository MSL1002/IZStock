package com.izstock_mobile_app

import androidx.compose.foundation.layout.padding
import androidx.annotation.DrawableRes
import androidx.compose.ui.res.painterResource
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.input.KeyboardType.Companion.Text
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.izstock_mobile_app.map.MapScreen

object Routes {
    const val HOME = "home"
    const val MAP = "map"
    const val LIST = "list"
    const val LOGIN = "login"
    const val REGISTER = "register"
}

enum class TopLevelDestination(
    val route: String,
    val label: String,
    @DrawableRes val icon: Int
) {
    Home(Routes.HOME, "Home", R.drawable.ic_home),
    Map(Routes.MAP, "Map", R.drawable.ic_map),
    List(Routes.LIST, "My List", R.drawable.ic_list)
}

@Composable
fun IZStockApp() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = backStackEntry?.destination

    val sessionViewModel: SessionViewModel = viewModel()
    val isSignedIn by sessionViewModel.isSignedIn.collectAsStateWithLifecycle()

    // Only show the bottom bar on the three main tabs
    val showBottomBar = TopLevelDestination.entries.any { dest ->
        currentDestination?.hierarchy?.any { it.route == dest.route } == true
    }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    TopLevelDestination.entries.forEach { dest ->
                        NavigationBarItem(
                            selected = currentDestination?.hierarchy
                                ?.any { it.route == dest.route } == true,
                            onClick = {
                                navController.navigate(dest.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(painterResource(dest.icon), contentDescription = dest.label) },
                            label = { Text(dest.label) }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Routes.HOME,
            modifier = Modifier.padding(innerPadding),
            enterTransition = { fadeIn(tween(50)) },
            exitTransition = { fadeOut(tween(50)) },
            popEnterTransition = { fadeIn(tween(50)) },
            popExitTransition = { fadeOut(tween(50)) }
        ) {
            composable(Routes.HOME) { HomeScreen() }
            composable(Routes.MAP) { MapScreen() }
            composable(Routes.LIST,
                exitTransition = {
                    if (targetState.destination.route in setOf(Routes.LOGIN, Routes.REGISTER)) {
                        slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Left, tween(300))
                    } else {
                        fadeOut(tween(200))
                    }
                },
                popEnterTransition = {
                    if (initialState.destination.route in setOf(Routes.LOGIN, Routes.REGISTER)) {
                        slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Right, tween(300))
                    } else {
                        fadeIn(tween(200))
                    }
                },
                ) {
                if (isSignedIn) {
                    ListScreen()
                } else {
                    SignInPrompt(
                        onLogin = { navController.navigate(Routes.LOGIN) },
                        onRegister = { navController.navigate(Routes.REGISTER) }
                    )
                }
            }
            composable(Routes.LOGIN,
                enterTransition = {
                    slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Left, tween(300))
                },
                popExitTransition = {
                    slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Right, tween(300))
                }) {
                LoginScreen(onBack = { navController.popBackStack() })
            }
            composable(Routes.REGISTER,
                enterTransition = {
                    slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Left, tween(300))
                },
                popExitTransition = {
                    slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Right, tween(300))
                }) {
                RegisterScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}