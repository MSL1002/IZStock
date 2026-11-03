package com.izstock_mobile_app
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import retrofit2.Retrofit
import retrofit2.http.GET

interface IZStockApi {
    @GET("map")
    suspend fun getMap(): MapResponse
}

object ApiClient {

    //TODO: should I move this to an .env? probably...
    private const val BASE_URL = "https://subtitle-usual-reborn.ngrok-free.dev/"

    private val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }

    val api: IZStockApi = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(IZStockApi::class.java)
}