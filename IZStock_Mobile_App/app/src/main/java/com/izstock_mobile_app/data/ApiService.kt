package com.izstock_mobile_app.data
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import retrofit2.Retrofit
import retrofit2.http.GET
import retrofit2.http.Query

interface IZStockApi {
    @GET("map")
    suspend fun getMap(): MapResponse

    @GET("items/suggest")
    suspend fun suggest(@Query("name") name: String, @Query("limit") limit: Int = 8): ItemResponse

    @GET("items/search")
    suspend fun search(@Query("name") name: String, @Query("pageSize") pageSize: Int = 20, @Query("page") page: Int = 1): PaginatedItemResponse
}

object ApiClient {

    //TODO: should I move this to an .env? probably...
    private const val BASE_URL = "https://subtitle-usual-reborn.ngrok-free.dev/"

    private val json = Json { ignoreUnknownKeys = true }

    val api: IZStockApi = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(IZStockApi::class.java)
}