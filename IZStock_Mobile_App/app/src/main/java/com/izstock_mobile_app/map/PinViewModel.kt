package com.izstock_mobile_app.map

import androidx.lifecycle.ViewModel
import com.izstock_mobile_app.data.Item
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

data class MapPin (
    val shelfId: String,
    val label: String,
    val asleNumber: String ?= null
)

class PinViewModel: ViewModel() {
    private val _pin = MutableStateFlow<MapPin?>(null)
    val pin: StateFlow<MapPin?> = _pin

    fun pin(item: Item){
        val shelf = item.shelfId ?: return
        _pin.value = MapPin(shelf, item.name, item.aisleNumber)
    }

    fun clear() { _pin.value = null }
}