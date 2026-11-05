package com.izstock_mobile_app.map

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.izstock_mobile_app.data.ApiClient
import com.izstock_mobile_app.data.StoreMap
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface MapUiState {
    data object Loading : MapUiState
    data class Success(val map: StoreMap) : MapUiState
    data class Error(val message: String) : MapUiState
}

class MapViewModel : ViewModel() {
    private val _state = MutableStateFlow<MapUiState>(MapUiState.Loading)
    val state: StateFlow<MapUiState> = _state

    init { load() }

    fun load() {
        _state.value = MapUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                MapUiState.Success(ApiClient.api.getMap().payload)
            } catch (e: Exception) {
                MapUiState.Error(e.message ?: "Couldn't load the map")
            }
        }
    }
}