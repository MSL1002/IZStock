package com.izstock_mobile_app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.izstock_mobile_app.ui.theme.IZStock_Mobile_AppTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            StoreMapCanvas(sampleMap)
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