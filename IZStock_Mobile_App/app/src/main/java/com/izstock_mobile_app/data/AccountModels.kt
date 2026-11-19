package com.izstock_mobile_app.data

import kotlinx.serialization.Serializable
import java.io.Serial

@Serializable
data class AccountRegisterBody(
    val email: String,
    val firstName: String,
    val lastName: String
)

@Serializable
data class AccountRegisterResponse(
    val message: String
)

@Serializable
data class VerifyResponse(
    val token: String,
    val user: UserInfo
)
@Serializable
data class UserInfo(
    val firstName: String,
    val lastName: String,
    val email: String ?= null
)

@Serializable
data class LoginBody(val email: String)

@Serializable
data class VerifyBody(
    val email: String,
    val code: String
)

@Serializable
data class ErrorEnvelope(val error: ApiError)

@Serializable
data class ApiError(
    val code: String,
    val message: String,
    val details: List<String>? = null
)