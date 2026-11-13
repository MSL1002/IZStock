package com.izstock_mobile_app.map

import android.app.Application
import androidx.datastore.preferences.protobuf.Api
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.izstock_mobile_app.data.ApiClient
import com.izstock_mobile_app.data.MapResponse
import com.izstock_mobile_app.data.StoreMap
import com.izstock_mobile_app.map.MapUiState.Success
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import java.io.File


sealed interface MapUiState {
    data object Loading : MapUiState
    data class Success(val map: StoreMap) : MapUiState
    data class Error(val message: String) : MapUiState
}

class MapViewModel(app: Application) : AndroidViewModel(app) {

    private val cacheFile = File(app.filesDir, "map_cache.json")

    private val _state = MutableStateFlow<MapUiState>(MapUiState.Loading)

    val state: StateFlow<MapUiState> = _state

    init { load() }

    fun load() {
        viewModelScope.launch {
            val cached = readCache()
            if(cached != null) _state.value = Success(cached.payload)
            else _state.value = MapUiState.Loading

            try{
                val latest = ApiClient.api.getMapVersion()
                if ( cached == null || latest.version > cached.version){
                    val fresh = ApiClient.api.getMap()
                    writeCache(fresh)
                    _state.value = Success(fresh.payload)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception){
                if ( cached == null ){
                    e.message?.let { android.util.Log.e("ERR GETTING MAP PRE CACHE",it) }
                    _state.value = MapUiState.Error(e.message ?: "Unable to load map")
                }
            }
        }
    }

    private suspend fun readCache(): MapResponse? = withContext(Dispatchers.IO) {
        if(!cacheFile.exists()) return@withContext null
        runCatching {
            ApiClient.json.decodeFromString<MapResponse>(cacheFile.readText())
        }.getOrNull()
    }

    private suspend fun writeCache(response: MapResponse) = withContext(Dispatchers.IO){
        val tmp = File(cacheFile.parentFile, "map_cache.json")
        tmp.writeText(ApiClient.json.encodeToString(response))
        tmp.renameTo(cacheFile)
    }
}