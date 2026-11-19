package com.izstock_mobile_app.data

import retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import retrofit2.Retrofit
import retrofit2.http.GET
import retrofit2.http.Query
import com.izstock_mobile_app.BuildConfig
import com.izstock_mobile_app.BuildConfig.BASE_URL
import com.izstock_mobile_app.data.ApiClient.json
import okhttp3.OkHttpClient
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

interface IZStockApi {
    @GET("map")
    suspend fun getMap(): MapResponse

    @GET("map/version")
    suspend fun getMapVersion(): MapVersionResponse

    @GET("items/{sku}")
    suspend fun getItem(@Path("sku") sku: String): Item

    @GET("items/catalog")
    suspend fun catalog(@Query("page") page: Int = 1, @Query("pageSize") pageSize: Int = 500): PaginatedItemResponse

    @GET("items/suggest")
    suspend fun suggest(@Query("name") name: String, @Query("limit") limit: Int = 8): ItemResponse

    @GET("items/search")
    suspend fun search(@Query("name") name: String, @Query("pageSize") pageSize: Int = 20, @Query("page") page: Int = 1): PaginatedItemResponse

    @POST("auth/register")
    suspend fun register(@Body body: AccountRegisterBody): Response<Unit>

    @POST("auth/login")
    suspend fun login(@Body body: LoginBody): Response<Unit>

    @POST("auth/verify")
    suspend fun verify(@Body body: VerifyBody): VerifyResponse

    @POST("auth/logout")
    suspend fun logout(): Response<Unit>

    @GET("me/list")
    suspend fun getList(): ServerListResponse

    @PUT("me/list")
    suspend fun putList(@Body body: ServerListBody): Response<Unit>

    @POST("items/lookup")
    suspend fun lookup(@Body body: LookupBody): ItemResponse


}

object ApiClient {
    private const val BASE_URL = BuildConfig.BASE_URL

    val json = Json { ignoreUnknownKeys = true }

    @Volatile
    var authToken: String? = null

    @Volatile
    var onUnauthorized: (() -> Unit)? = null

    private val client = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val token = authToken
            val request = if (token != null) {
                chain.request().newBuilder()
                    .header("Authorization", "Bearer $token")
                    .build()
            } else chain.request()

            val response = chain.proceed(request)
            if (token != null && response.code == 401) onUnauthorized?.invoke()
            response
        }
        .build()

    val api: IZStockApi = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(IZStockApi::class.java)
}