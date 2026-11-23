package com.izstock_mobile_app

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.izstock_mobile_app.account.AuthStep
import com.izstock_mobile_app.account.AuthUiState
import com.izstock_mobile_app.account.AuthViewModel
import com.izstock_mobile_app.data.VerifyResponse
import com.izstock_mobile_app.list.ListScreen


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
fun LoginScreen(
    onBack: () -> Unit,
    onSignedIn: (VerifyResponse) -> Unit,
    onCreateAccount: () -> Unit,
    viewModel: AuthViewModel = viewModel()
) {
    val ui = viewModel.ui.collectAsStateWithLifecycle().value

    // System back from the code step returns to the email step
    BackHandler(enabled = ui.step == AuthStep.Code) { viewModel.changeEmail() }

    LoginContent(
        ui = ui,
        onEmailChange = viewModel::onEmailChange,
        onCodeChange = viewModel::onCodeChange,
        onSendCode = viewModel::requestLoginCode,
        onVerify = { viewModel.verify(onSignedIn) },
        onChangeEmail = viewModel::changeEmail,
        onBack = onBack,
        onCreateAccount = onCreateAccount
    )
}

@Composable
fun LoginContent(
    ui: AuthUiState,
    onEmailChange: (String) -> Unit,
    onCodeChange: (String) -> Unit,
    onSendCode: () -> Unit,
    onVerify: () -> Unit,
    onChangeEmail: () -> Unit,
    onBack: () -> Unit,
    onCreateAccount: () -> Unit
) {
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically)
    ) {
        Text("Log in", style = MaterialTheme.typography.headlineMedium)

        when (ui.step) {
            AuthStep.Email -> {
                Text("We'll email you a 6-digit code.", style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(
                    value = ui.email,
                    onValueChange = onEmailChange,
                    label = { Text("Email") },
                    singleLine = true,
                    enabled = !ui.isBusy,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            AuthStep.Code -> {
                Text("Enter the code sent to ${ui.email}", style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(
                    value = ui.code,
                    onValueChange = onCodeChange,
                    label = { Text("6-digit code") },
                    singleLine = true,
                    enabled = !ui.isBusy,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        ui.error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }
        if (ui.noAccount) {
            Text("No account found for that email.", color = MaterialTheme.colorScheme.error)
            OutlinedButton(onClick = onCreateAccount) { Text("Create account") }
        }

        Button(
            onClick = if (ui.step == AuthStep.Email) onSendCode else onVerify,
            enabled = !ui.isBusy && (ui.step == AuthStep.Email || ui.code.length == 6),
            modifier = Modifier.fillMaxWidth()
        ) {
            if (ui.isBusy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            else Text(if (ui.step == AuthStep.Email) "Send code" else "Verify")
        }

        if (ui.step == AuthStep.Code) {
            TextButton(onClick = onSendCode, enabled = !ui.isBusy) { Text("Send a new code") }
            TextButton(onClick = onChangeEmail) { Text("Use a different email") }
        }
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