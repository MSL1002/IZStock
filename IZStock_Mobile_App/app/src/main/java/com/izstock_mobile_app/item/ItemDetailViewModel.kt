package com.izstock_mobile_app.item

import com.izstock_mobile_app.data.Item
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.izstock_mobile_app.data.ApiClient
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException

sealed interface ItemDetailState {
    data object Loading: ItemDetailState
    data class Success(val item: Item): ItemDetailState
    data object NotFound: ItemDetailState
    data class Error(val message: String): ItemDetailState
}

class ItemDetailViewModel(savedStateHandle: SavedStateHandle): ViewModel() {
    private val sku: String = checkNotNull(savedStateHandle["sku"])

    private val _state = MutableStateFlow<ItemDetailState>(ItemDetailState.Loading)
    val state: StateFlow<ItemDetailState> = _state

    init { load() }

    fun load() {
        _state.value = ItemDetailState.Loading
        viewModelScope.launch {
            _state.value = try{
                ItemDetailState.Success(ApiClient.api.getItem(sku))
            } catch (e: CancellationException){
                throw e
            } catch (e: HttpException) {
                if (e.code() == 404) ItemDetailState.NotFound
                else ItemDetailState.Error("Server error (${e.code()})")
            } catch (e: Exception) {
                ItemDetailState.Error("Couldn't reach the server. Check your connection.")
            }
        }
    }
}