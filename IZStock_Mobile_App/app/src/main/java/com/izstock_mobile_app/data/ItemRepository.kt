package com.izstock_mobile_app.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.core.content.edit

class ItemRepository(context: Context) {
    private val db = ItemDatabase(context.applicationContext)
    private val prefs = context.applicationContext
        .getSharedPreferences("item_index", Context.MODE_PRIVATE)

    /** Re-downloads the catalog if the local copy is missing or older than maxAgeMs. */
    suspend fun syncIfStale(maxAgeMs: Long = 5 * 60 * 1000L) {
        val age = System.currentTimeMillis() - prefs.getLong("last_sync", 0L)
        val empty = withContext(Dispatchers.IO) { db.count() == 0 }
        if (!empty && age < maxAgeMs) return
        try {
            android.util.Log.i("collection all items", "getting all items")
            val all = mutableListOf<Item>()
            var page = 1
            while (true) {
                val r = ApiClient.api.catalog(page = page)
                all += r.items
                if (r.items.isEmpty() || all.size >= r.total) break
                page++
            }
            withContext(Dispatchers.IO) { db.replaceAll(all) }
            prefs.edit { putLong("last_sync", System.currentTimeMillis()) }
        } catch (e: kotlin.coroutines.cancellation.CancellationException) {
            throw e
        } catch (e: Exception) {
            android.util.Log.w("ItemRepository", "catalog sync failed", e)
            // keep whatever index we already have
        }
    }

    /** Local suggestions, or null if the index hasn't been built yet. */
    suspend fun suggest(query: String, limit: Int = 8): List<Item>? =
        withContext(Dispatchers.IO) {
            if (db.count() == 0) null else db.suggest(query, limit)
        }

    /** Local paged search, or null if the index hasn't been built yet. */
    suspend fun search(query: String, page: Int, pageSize: Int): PaginatedItemResponse? =
        withContext(Dispatchers.IO) {
            if (db.count() == 0) return@withContext null
            val total = db.searchCount(query)
            PaginatedItemResponse(
                items = db.search(query, pageSize, (page - 1) * pageSize),
                total = total,
                page = page,
                pageSize = pageSize,
                totalPages = maxOf(1, (total + pageSize - 1) / pageSize)
            )
        }
}