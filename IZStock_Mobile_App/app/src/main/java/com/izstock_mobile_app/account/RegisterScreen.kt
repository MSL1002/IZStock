package com.izstock_mobile_app.account

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.izstock_mobile_app.data.VerifyResponse

@Composable
fun RegisterScreen (
    onBack: () -> Unit,
    onSignedIn: (VerifyResponse) -> Unit,
    onLogin: () -> Unit,
    viewModel: AuthViewModel = viewModel()
){
    val ui = viewModel.ui.collectAsStateWithLifecycle().value

    BackHandler(enabled = ui.step == AuthStep.Code) { viewModel.changeEmail() }

    RegisterContent(
        ui = ui,
        onFirstNameChange = viewModel::onFirstNameChange,
        onLastNameChange = viewModel::onLastNameChange,
        onEmailChange = viewModel::onEmailChange,
        onCodeChange = viewModel::onCodeChange,
        onSendCode = viewModel::requestRegisterCode,
        onVerify = { viewModel.verify(onSignedIn) },
        onEditDetails = viewModel::changeEmail,
        onBack = onBack,
        onLogin = onLogin
    )
}

@Composable
fun RegisterContent(
    ui: AuthUiState,
    onFirstNameChange: (String) -> Unit,
    onLastNameChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onCodeChange: (String) -> Unit,
    onSendCode: () -> Unit,
    onVerify: () -> Unit,
    onEditDetails: () -> Unit,
    onBack: () -> Unit,
    onLogin: () -> Unit
) {
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically)
    ) {
        Text("Create account", style = MaterialTheme.typography.headlineMedium)

        when (ui.step) {
            AuthStep.Email -> {
                Text("We'll email you a 6-digit code to confirm it's you.",
                    style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(
                    value = ui.firstName, onValueChange = onFirstNameChange,
                    label = { Text("First name") }, singleLine = true, enabled = !ui.isBusy,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = ui.lastName, onValueChange = onLastNameChange,
                    label = { Text("Last name") }, singleLine = true, enabled = !ui.isBusy,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = ui.email, onValueChange = onEmailChange,
                    label = { Text("Email") }, singleLine = true, enabled = !ui.isBusy,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            AuthStep.Code -> {
                Text("Enter the code sent to ${ui.email}", style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(
                    value = ui.code, onValueChange = onCodeChange,
                    label = { Text("6-digit code") }, singleLine = true, enabled = !ui.isBusy,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        ui.error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }
        if (ui.emailExists) {
            Text("An account already uses that email.", color = MaterialTheme.colorScheme.error)
            OutlinedButton(onClick = onLogin) { Text("Log in instead") }
        }

        Button(
            onClick = if (ui.step == AuthStep.Email) onSendCode else onVerify,
            enabled = !ui.isBusy && (ui.step == AuthStep.Email || ui.code.length == 6),
            modifier = Modifier.fillMaxWidth()
        ) {
            if (ui.isBusy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            else Text(if (ui.step == AuthStep.Email) "Send code" else "Create account")
        }

        if (ui.step == AuthStep.Code) {
            TextButton(onClick = onSendCode, enabled = !ui.isBusy) { Text("Send a new code") }
            TextButton(onClick = onEditDetails) { Text("Edit my details") }
        }
        TextButton(onClick = onBack) { Text("Back") }
    }
}