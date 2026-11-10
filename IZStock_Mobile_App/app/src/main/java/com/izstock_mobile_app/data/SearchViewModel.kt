package com.izstock_mobile_app.data

import android.nfc.tech.MifareUltralight.PAGE_SIZE
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import android.app.Application
import androidx.lifecycle.AndroidViewModel
import com.izstock_mobile_app.search.RecentSearchStore
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.mapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlin.collections.emptyList
import kotlin.time.Duration.Companion.milliseconds

sealed interface SearchState {
    data object Idle : SearchState
    data object Loading : SearchState
    data class Success(
        val items: List<Item>,
        val total: Int,
        val isLoadingMore: Boolean = false,
        val loadingMoreFailed: Boolean = false
    ): SearchState {
        val hasMore: Boolean get() = items.size < total
    }
    data class Error(val message: String): SearchState
}

@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
class SearchViewModel(app: Application) : AndroidViewModel(app) {

    private val store = RecentSearchStore(app.applicationContext)

    val recents: StateFlow<List<String>> = store.recents
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private class CachedPage(val state: SearchState.Success, val savedAt: Long)
    private val cache = object : LinkedHashMap<String, CachedPage>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, CachedPage>?) =
            size > 20
    }

    private companion object {
        const val PAGE_SIZE = 20
        const val CACHE_TTL_MS = 2 * 60 * 1000L
    }

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _state = MutableStateFlow<SearchState>(SearchState.Idle)
    val state: StateFlow<SearchState> = _state.asStateFlow()

    private var searchJob: Job? = null

    val suggestions: StateFlow<List<Item>> = _query
        .debounce(250.milliseconds)
        .map{it.trim()}
        .distinctUntilChanged()
        .mapLatest { q ->
            if (q.isEmpty()) emptyList()
            else try {
                ApiClient.api.suggest(q).items
            } catch (e: CancellationException){
                throw e
            }catch (e: Exception){
                android.util.Log.e("Suggest", "Suggest failed with param '$q'", e)
                emptyList()
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun onQueryChange(newQuery: String){
        _query.value = newQuery
        searchJob?.cancel()
        _state.value = SearchState.Idle
    }

    private var activeQuery = ""
    private var nextPage = 2

    fun onSubmit() {
        val q = _query.value.trim()
        if (q.isEmpty()) return
        searchJob?.cancel()
        activeQuery = q
        val key = q.lowercase()

        // Cache hit: show instantly, skip the network
        cache[key]?.takeIf { System.currentTimeMillis() - it.savedAt < CACHE_TTL_MS }?.let {
            nextPage = 2
            _state.value = it.state
            viewModelScope.launch { store.add(q) }
            return
        }

        _state.value = SearchState.Loading
        searchJob = viewModelScope.launch {
            _state.value = try {
                val r = ApiClient.api.search(q, page = 1, pageSize = PAGE_SIZE)
                nextPage = 2
                val success = SearchState.Success(r.items, r.total)
                cache[key] = CachedPage(success, System.currentTimeMillis())
                if (r.items.isNotEmpty()) store.add(q)   // only remember searches that found something
                success
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                SearchState.Error(e.message ?: "Search failed")
            }
        }
    }

    fun removeRecent(query: String) { viewModelScope.launch { store.remove(query) } }

    fun clearRecents() { viewModelScope.launch { store.clear() } }

    fun loadMore() {
        val current = _state.value as? SearchState.Success ?: return
        if (current.isLoadingMore || !current.hasMore) return
        _state.value = current.copy(isLoadingMore = true, loadingMoreFailed = false)
        searchJob = viewModelScope.launch {
            try{
                val r = ApiClient.api.search(activeQuery, nextPage, PAGE_SIZE)
                nextPage++
                val merged = (current.items + r.items).distinctBy { it.sku }
                val total = if (r.items.isEmpty()) merged.size else r.total
                _state.value = SearchState.Success(merged, total)
            } catch (e: CancellationException){
                throw e
            }catch (e: Exception){
                _state.value = current.copy(isLoadingMore = false, loadingMoreFailed = true)
            }
        }
    }

    fun onSuggestionClick(name: String) {
        _query.value = name
        onSubmit()
    }

    fun clear() = onQueryChange("")
}