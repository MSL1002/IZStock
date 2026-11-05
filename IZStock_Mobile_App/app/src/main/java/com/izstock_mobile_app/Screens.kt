package com.izstock_mobile_app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
private fun Placeholder(title: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(title, style = MaterialTheme.typography.headlineMedium)
    }
}

@Composable
fun HomeScreen() = Placeholder("Home")

@Composable
fun ListScreen() = Placeholder("My List")

@Composable
fun SignInPrompt(onLogin: () -> Unit, onRegister: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically)
    ) {
        Text("Sign in to save your shopping list", style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center)
        Text(
            "Your list will be available on all your devices.",
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center
        )
        Button(onClick = onLogin) { Text("Log in") }
        OutlinedButton(onClick = onRegister) { Text("Create account") }
    }
}

@Composable
fun LoginScreen(onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.Center) {
        Text("Log in", style = MaterialTheme.typography.headlineMedium)
        // email field -> POST /auth/login -> code field -> POST /auth/verify
        TextButton(onClick = onBack) { Text("Back") }
    }
}

@Composable
fun RegisterScreen(onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.Center) {
        Text("Create account", style = MaterialTheme.typography.headlineMedium)
        // email + first/last name -> POST /auth/register -> code -> POST /auth/verify
        TextButton(onClick = onBack) { Text("Back") }
    }
}