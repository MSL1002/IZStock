package com.izstock_mobile_app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.material3.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle


class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {

            val vm: MapViewModel = viewModel()
            val uiState = vm.state.collectAsStateWithLifecycle().value

            when (uiState){
                is MapUiState.Loading -> CircularProgressIndicator()
                is MapUiState.Error -> Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                    ){
                    Text(uiState.message)
                    Button(onClick = { vm.load() }) {Text("Retry")}
                }
                is MapUiState.Success -> StoreMapCanvas(uiState.map)
            }
        }
    }
}