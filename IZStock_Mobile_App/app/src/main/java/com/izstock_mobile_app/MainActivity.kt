package com.izstock_mobile_app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.izstock_mobile_app.map.MapScreen
import com.izstock_mobile_app.ui.theme.*


class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            IZStock_Mobile_AppTheme {
                MapScreen()
            }
        }
    }
}