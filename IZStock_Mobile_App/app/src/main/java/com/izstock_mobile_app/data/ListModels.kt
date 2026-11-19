package com.izstock_mobile_app.data

import kotlinx.serialization.Serializable

@Serializable
data class ListEntry(
    val sku: String,
    val quantity: Int = 1,
    val checked: Boolean = false,
    val item: Item,
    val gone: Boolean = false
)

@Serializable data class ServerListEntry(val sku: String, val quantity: Int)
@Serializable data class ServerListResponse(val items: List<ServerListEntry>)
@Serializable data class ServerListBody(val items: List<ServerListEntry>)
@Serializable data class LookupBody(val skus: List<String>)