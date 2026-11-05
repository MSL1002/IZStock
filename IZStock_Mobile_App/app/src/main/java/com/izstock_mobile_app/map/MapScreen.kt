package com.izstock_mobile_app.map

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel

// Stateful: owns the ViewModel. This is what navigation will call later.
@Composable
fun MapScreen(
    modifier: Modifier = Modifier,
    viewModel: MapViewModel = viewModel()
) {
    val uiState = viewModel.state.collectAsStateWithLifecycle().value
    MapContent(
        uiState = uiState,
        onRetry = viewModel::load,
        modifier = modifier
    )
}

@Composable
fun MapContent(
    uiState: MapUiState,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = Modifier
            .fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        when (uiState) {
            is MapUiState.Loading -> CircularProgressIndicator()
            is MapUiState.Error -> Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (uiState.message.contains("404")) {
                    Text("Unable to connect to server.")
                } else {
                    Text("An unknown error occurred.")
                }
                Text(uiState.message)
                Button(onClick = onRetry) { Text("Retry") }
            }

            is MapUiState.Success -> StoreMapCanvas(uiState.map)
        }
    }
}