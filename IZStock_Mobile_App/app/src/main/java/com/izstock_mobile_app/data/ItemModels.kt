package com.izstock_mobile_app.data

import kotlinx.serialization.Serializable

@Serializable
data class Item(
    val sku: String,
    val name: String,
    val price: Double,
    val quantity: Int,
    val shelfId: String? = null,
    val aisleNumber: String? = null,
    val imageUrl: String? = null,
)

@Serializable
data class ItemResponse(val items: List<Item>)

@Serializable
data class PaginatedItemResponse(
    val items: List<Item>,
    val page: Int = 1,
    val pageSize: Int = 25,
    val total: Int,
    val totalPages: Int = 1,
)