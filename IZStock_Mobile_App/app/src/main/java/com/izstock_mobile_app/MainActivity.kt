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


//            val context = LocalContext.current;
//            val map = remember {
//                val text = context.resources.openRawResource(R.raw.sample_map)
//                    .bufferedReader().use { it.readText() }
//                Json {ignoreUnknownKeys = true}
//                    .decodeFromString<MapResponse>(text)
//                    .payload
//            }
//            StoreMapCanvas(map)
        }
    }
}

val sampleMap = StoreMap(
    storeId = "store-1", version = 1,
    sections = listOf(
        Section(
            id = "s1", name = "Dairy", color = "#4FC3F7",
            polygon = listOf(listOf(0f, 0f), listOf(60f, 0f), listOf(60f, 40f), listOf(0f, 40f)),
            aisles = listOf(
                Aisle(
                    id = "a1", aisleNumber = "1",
                    polygon = listOf(listOf(5f, 5f), listOf(55f, 5f), listOf(55f, 20f), listOf(5f, 20f)),
                    shelves = listOf(
                        Shelf("sh1", listOf(listOf(5f, 5f), listOf(55f, 5f), listOf(55f, 9f), listOf(5f, 9f)), "left")
                    )
                )
            )
        )
    )
);