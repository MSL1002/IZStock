package com.izstock_mobile_app.map

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.izstock_mobile_app.R

// Stateful: owns the ViewModel. This is what navigation will call later.
@Composable
fun MapScreen(
    pin: MapPin?,
    onClearPin: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MapViewModel = viewModel()
) {
    val uiState = viewModel.state.collectAsStateWithLifecycle().value
    MapContent(
        uiState = uiState,
        pin,
        onClearPin,
        onRetry = viewModel::load,
        modifier = modifier
    )
}

@Composable
fun MapContent(
    uiState: MapUiState,
    pin: MapPin?,
    onClearPin: () -> Unit,
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

            is MapUiState.Success -> StoreMapCanvas(uiState.map, pin)
        }
        if( pin != null && uiState is MapUiState.Success){
            android.util.Log.d("Pin", "pin shelf = ${pin.shelfId}")
            android.util.Log.d("Pin", "map shelves = ${
                uiState.map.sections.flatMap { s -> s.aisles.flatMap { a -> a.shelves.map { it.id } } }
            }")
            val found = uiState.map.findShelf(pin.shelfId) != null

            Card(Modifier.align(Alignment.TopCenter).padding(12.dp)) {
                Row(
                    Modifier.padding(start = 16.dp, top = 4.dp, bottom = 4.dp, end = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(Modifier.weight(1f, fill = false)) {
                        Text(pin.label, style = MaterialTheme.typography.titleMedium)
                        Text(
                            if (found) pin.asleNumber?.let { "Aisle $it" } ?: "Shown on map"
                            else "Couldn't find this shelf on the map",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    IconButton(onClick = onClearPin) {
                        Icon(painterResource(R.drawable.ic_close), contentDescription = "Clear pin")
                    }
                }
            }
        }
    }
}