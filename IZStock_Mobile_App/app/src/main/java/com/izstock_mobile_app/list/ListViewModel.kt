package com.izstock_mobile_app.list

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.izstock_mobile_app.data.ApiClient
import com.izstock_mobile_app.data.Item
import com.izstock_mobile_app.data.ListEntry
import com.izstock_mobile_app.data.LookupBody
import com.izstock_mobile_app.data.ServerListBody
import com.izstock_mobile_app.data.ServerListEntry
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

@OptIn(FlowPreview::class)
class ListViewModel(app: Application): AndroidViewModel(app) {
    private val store = ListStore(app.applicationContext)

    private val _entries = MutableStateFlow<List<ListEntry>>(emptyList())
    val entries: StateFlow<List<ListEntry>> = _entries

    private val loaded = CompletableDeferred<Unit>()
    private var wasSignedIn: Boolean? = null

    init {
        viewModelScope.launch {
            _entries.value = store.load()
            loaded.complete(Unit)

            // Save to disk after every change
            launch { _entries.drop(1).debounce(300).collect { store.save(it) } }

            // Push to the server when sku/quantity change (not for checkbox toggles)
            launch {
                _entries
                    .map { list -> list.filter { !it.gone }.map { it.sku to it.quantity } }
                    .distinctUntilChanged()
                    .drop(1)
                    .debounce(800)
                    .collect { if (wasSignedIn == true) push() }
            }

            refreshItems()
        }
    }

    // ---- Editing ----

    fun add(item: Item) = _entries.update { list ->
        val i = list.indexOfFirst { it.sku == item.sku }
        when {
            i >= 0 -> list.toMutableList().also {
                it[i] = list[i].copy(
                    quantity = (list[i].quantity + 1).coerceAtMost(MAX_QTY),
                    item = item, gone = false
                )
            }
            list.size >= MAX_ENTRIES -> list
            else -> list + ListEntry(item.sku, 1, false, item)
        }
    }

    fun increment(sku: String) = _entries.update { list ->
        list.map { if (it.sku == sku) it.copy(quantity = (it.quantity + 1).coerceAtMost(MAX_QTY)) else it }
    }

    /** Removes the entry when it reaches zero. */
    fun decrement(sku: String) = _entries.update { list ->
        list.mapNotNull {
            when {
                it.sku != sku -> it
                it.quantity <= 1 -> null
                else -> it.copy(quantity = it.quantity - 1)
            }
        }
    }

    fun remove(sku: String) = _entries.update { list -> list.filterNot { it.sku == sku } }

    fun toggleChecked(sku: String) = _entries.update { list ->
        list.map { if (it.sku == sku) it.copy(checked = !it.checked) else it }
    }

    fun clearChecked() = _entries.update { list -> list.filterNot { it.checked } }

    // ---- Session + sync ----

    /** Call whenever the signed-in state is known or changes. */
    fun onSessionChanged(signedIn: Boolean) {
        val before = wasSignedIn
        wasSignedIn = signedIn
        if (before == signedIn) return
        viewModelScope.launch {
            loaded.await()
            when {
                // Cold start with a stored session: server wins. Fresh login: merge the guest list in.
                signedIn -> syncFromServer(replace = before == null)
                // Signed out: clear this device's copy. wasSignedIn is already false, so nothing is pushed.
                before == true -> _entries.value = emptyList()
            }
        }
    }

    /** Re-fetches live price and stock for everything in the list. */
    fun refresh() {
        viewModelScope.launch { loaded.await(); refreshItems() }
    }

    private suspend fun syncFromServer(replace: Boolean) {
        val remote = try {
            ApiClient.api.getList().items
        } catch (e: CancellationException) { throw e }
        catch (e: Exception) { return }       // offline: keep the local list

        val local = _entries.value
        val quantities = linkedMapOf<String, Int>()
        remote.forEach { quantities[it.sku] = it.quantity }
        if (!replace) {
            local.filter { !it.gone }.forEach {
                quantities[it.sku] = maxOf(quantities[it.sku] ?: 0, it.quantity)
            }
        }

        // If the lookup fails, abort: building from partial data could erase server entries later
        val fresh = lookupItems(quantities.keys.toList()) ?: return

        _entries.value = quantities.mapNotNull { (sku, qty) ->
            val localEntry = local.find { it.sku == sku }
            val item = fresh[sku] ?: localEntry?.item ?: return@mapNotNull null
            ListEntry(sku, qty, localEntry?.checked ?: false, item, gone = sku !in fresh)
        }
        if (!replace) push()   // upload guest items the server doesn't have yet
    }

    private suspend fun refreshItems() {
        val requested = _entries.value.map { it.sku }
        if (requested.isEmpty()) return
        val found = lookupItems(requested) ?: return
        _entries.update { list ->
            list.map { e ->
                if (e.sku !in requested) e   // added while the request was in flight
                else found[e.sku]?.let { e.copy(item = it, gone = false) } ?: e.copy(gone = true)
            }
        }
    }

    private suspend fun lookupItems(skus: List<String>): Map<String, Item>? {
        val out = mutableMapOf<String, Item>()
        for (chunk in skus.distinct().chunked(100)) {      // contract: 1 to 100 per call
            try {
                ApiClient.api.lookup(LookupBody(chunk)).items.forEach { out[it.sku] = it }
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) { return null }
        }
        return out
    }

    private suspend fun push() {
        // Deleted SKUs are excluded: the server rejects lists containing SKUs that don't exist
        val body = ServerListBody(
            _entries.value.filter { !it.gone }.take(MAX_ENTRIES)
                .map { ServerListEntry(it.sku, it.quantity) }
        )
        try {
            val r = ApiClient.api.putList(body)
            if (!r.isSuccessful) Log.w("ListSync", "PUT /me/list failed: ${r.code()}")
        } catch (e: CancellationException) { throw e }
        catch (e: Exception) { Log.w("ListSync", "PUT /me/list failed", e) }
    }

    private companion object {
        const val MAX_QTY = 99
        const val MAX_ENTRIES = 200
    }
}