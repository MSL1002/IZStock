package com.izstock_mobile_app.data

import retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import retrofit2.Retrofit
import retrofit2.http.GET
import retrofit2.http.Query
import com.izstock_mobile_app.BuildConfig

interface IZStockApi {
    @GET("map")
    suspend fun getMap(): MapResponse

    @GET("map/version")
    suspend fun getMapVersion(): MapVersionResponse

    @GET("items/catalog")
    suspend fun catalog(@Query("page") page: Int = 1, @Query("pageSize") pageSize: Int = 500): PaginatedItemResponse

    @GET("items/suggest")
    suspend fun suggest(@Query("name") name: String, @Query("limit") limit: Int = 8): ItemResponse

    @GET("items/search")
    suspend fun search(@Query("name") name: String, @Query("pageSize") pageSize: Int = 20, @Query("page") page: Int = 1): PaginatedItemResponse
}

object ApiClient {
    private const val BASE_URL = BuildConfig.BASE_URL

    val json = Json { ignoreUnknownKeys = true }

    val api: IZStockApi = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(IZStockApi::class.java)
}