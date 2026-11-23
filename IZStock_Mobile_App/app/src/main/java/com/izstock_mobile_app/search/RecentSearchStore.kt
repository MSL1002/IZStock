package com.izstock_mobile_app.search

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.recentDataStore by preferencesDataStore(name = "recent_searches")

class RecentSearchStore(private val context: Context) {
    private val key = stringPreferencesKey("queries")

    private fun decode(raw: String?): List<String> =
        raw?.let { runCatching { Json.decodeFromString<List<String>>(it) }.getOrNull() }
            ?: emptyList()

    val recents: Flow<List<String>> =
        context.recentDataStore.data.map { decode(it[key]) }

    suspend fun add(query: String) {
        context.recentDataStore.edit { prefs ->
            val updated = (listOf(query) + decode(prefs[key]).filterNot {
                it.equals(query, ignoreCase = true)   // move repeats to the top
            }).take(MAX_RECENTS)
            prefs[key] = Json.encodeToString(updated)
        }
    }

    suspend fun remove(query: String) {
        context.recentDataStore.edit { prefs ->
            prefs[key] = Json.encodeToString(decode(prefs[key]).filterNot { it == query })
        }
    }

    suspend fun clear() {
        context.recentDataStore.edit { it.remove(key) }
    }

    private companion object { const val MAX_RECENTS = 10 }
}