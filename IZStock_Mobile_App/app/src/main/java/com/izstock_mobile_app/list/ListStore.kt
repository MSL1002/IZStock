package com.izstock_mobile_app.list

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.izstock_mobile_app.data.ApiClient
import com.izstock_mobile_app.data.ListEntry
import kotlinx.coroutines.flow.first
import kotlinx.serialization.encodeToString

private val Context.listDataStore by preferencesDataStore(name = "shopping_list")

class ListStore(private val context: Context){
    private val key = stringPreferencesKey("entries")

    suspend fun load(): List<ListEntry> {
        val raw = context.listDataStore.data.first()[key] ?: return emptyList()
        return runCatching { ApiClient.json.decodeFromString<List<ListEntry>>(raw) }
            .getOrDefault(emptyList())
    }

    suspend fun save(entries: List<ListEntry>) {
        context.listDataStore.edit { it[key] = ApiClient.json.encodeToString(entries) }
    }
}