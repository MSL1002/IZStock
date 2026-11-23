package com.izstock_mobile_app.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MapVersionResponse(
    val version: Int,
)

@Serializable
data class MapResponse(
    val id: String,
    @SerialName("store_id") val storeId: String,
    val version: Int,
    val payload: StoreMap
)

@Serializable
data class StoreMap(
    val storeId: String,
    val version: Int,
    val units: String = "feet",
    val editedBy: String? = null,
    val editedAt: String? = null,
    val baseVersion: Int? = null,
    val status: String? = null,
    val sections: List<Section>
)

@Serializable
data class Section(
    val id: String,
    val name: String,
    val polygon: List<List<Float>>,
    val color: String? = null,
    val aisles: List<Aisle>
)

@Serializable
data class Aisle(
    val id: String,
    val aisleNumber: String,
    val polygon: List<List<Float>>,
    val shelves: List<Shelf>
)

@Serializable
data class Shelf(
    val id: String,
    val polygon: List<List<Float>>,
    val side: String? = null,
    val itemSkus: List<String> = emptyList()
)