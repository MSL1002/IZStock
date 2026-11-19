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
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.izstock_mobile_app.Routes.item
import com.izstock_mobile_app.account.AccountContent
import com.izstock_mobile_app.account.RegisterScreen
import com.izstock_mobile_app.account.SessionViewModel
import com.izstock_mobile_app.item.ItemDetailScreen
import com.izstock_mobile_app.item.ItemDetails
import com.izstock_mobile_app.list.ListScreen
import com.izstock_mobile_app.list.ListViewModel
import com.izstock_mobile_app.map.MapScreen
import com.izstock_mobile_app.map.PinViewModel
import com.izstock_mobile_app.search.HomeScreen

object Routes {
    const val HOME = "home"
    const val MAP = "map"
    const val LIST = "list"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val ACCOUNT = "account"
    const val ITEM = "item/{sku}"
    fun item(sku: String) = "item/${android.net.Uri.encode(sku)}"
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
    val pinViewModel: PinViewModel = viewModel()
    val pin by pinViewModel.pin.collectAsStateWithLifecycle()
    val isSignedIn by sessionViewModel.isSignedIn.collectAsStateWithLifecycle()

    val listViewModel: ListViewModel = viewModel()
    val listEntries by listViewModel.entries.collectAsStateWithLifecycle()
    val listQuantities = remember(listEntries) { listEntries.associate { it.sku to it.quantity } }

    val isLoading by sessionViewModel.isLoading.collectAsStateWithLifecycle()

    LaunchedEffect(isLoading, isSignedIn) {
        if (!isLoading) listViewModel.onSessionChanged(isSignedIn)
    }

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
            composable(Routes.HOME) {
                HomeScreen(
                    onItemClick = { item -> navController.navigate(Routes.item(item.sku)) },
                    onAccountClick = { navController.navigate(Routes.ACCOUNT) },
                    listQuantities = listQuantities,
                    onAddToList = listViewModel::add,
                    onDecreaseInList = { listViewModel.decrement(it.sku) }
                )
            }

            composable(Routes.ACCOUNT) {
                val profile by sessionViewModel.profile.collectAsStateWithLifecycle()
                AccountContent(
                    isLoading = isLoading,
                    profile = profile,
                    onBack = { navController.popBackStack() },
                    onLogin = { navController.navigate(Routes.LOGIN) },
                    onRegister = { navController.navigate(Routes.REGISTER) },
                    onSignOut = sessionViewModel::signOut
                )
            }

            composable(
                route = Routes.ITEM,
                arguments = listOf(navArgument("sku") {type = NavType.StringType})
            ) {
                ItemDetailScreen(
                    onBack = {navController.popBackStack() },
                    onShowOnMap = { item ->
                        pinViewModel.pin(item)
                        navController.navigate(Routes.MAP) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    listQuantities = listQuantities,
                    onAddToList = listViewModel::add,
                    onDecreaseInList = { listViewModel.decrement(it.sku) }
                )
            }
            composable(Routes.MAP) { MapScreen(pin = pin, onClearPin = pinViewModel::clear) }
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
                    if (isLoading) {
                        Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
                    } else {
                        ListScreen(
                            viewModel = listViewModel,
                            isSignedIn = isSignedIn,
                            onLogin = { navController.navigate(Routes.LOGIN) },
                            onItemClick = { item -> navController.navigate(Routes.item(item.sku)) }
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
                LoginScreen(
                    onBack = { navController.popBackStack() },
                    onSignedIn = { response ->
                        sessionViewModel.onSignedIn(response)
                        navController.popBackStack()   // back to the List tab, which now shows the list
                    },
                    onCreateAccount = {
                        navController.navigate(Routes.REGISTER) { popUpTo(Routes.LOGIN) { inclusive = true } }
                    }
                )
            }
            composable(Routes.REGISTER,
                enterTransition = {
                    slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Left, tween(300))
                },
                popExitTransition = {
                    slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Right, tween(300))
                }) {
                RegisterScreen(
                    onBack = { navController.popBackStack() },
                    onSignedIn = { response ->
                        sessionViewModel.onSignedIn(response)
                        navController.popBackStack()
                    },
                    onLogin = {
                        navController.navigate(Routes.LOGIN) { popUpTo(Routes.REGISTER) { inclusive = true } }
                    }
                )
            }
        }
    }
}