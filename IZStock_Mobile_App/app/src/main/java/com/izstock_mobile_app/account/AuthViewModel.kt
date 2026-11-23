package com.izstock_mobile_app.account

import android.util.Patterns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.izstock_mobile_app.data.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import retrofit2.HttpException

enum class AuthStep { Email, Code }

data class AuthUiState(
    val step: AuthStep = AuthStep.Email,
    val email: String = "",
    val firstName: String = "",
    val lastName: String = "",
    val code: String = "",
    val isBusy: Boolean = false,
    val error: String? = null,
    val noAccount: Boolean = false,   // login got 404: offer "Create account"
    val emailExists: Boolean = false // register got 409: offer login
)

class AuthViewModel : ViewModel() {
    private val _ui = MutableStateFlow(AuthUiState())
    val ui: StateFlow<AuthUiState> = _ui

    fun onEmailChange(v: String) =
        _ui.update { it.copy(email = v, error = null, noAccount = false, emailExists = false) }

    fun onCodeChange(v: String) =
        _ui.update { it.copy(code = v.filter(Char::isDigit).take(6), error = null) }

    fun changeEmail() = _ui.update { it.copy(step = AuthStep.Email, code = "", error = null) }

    fun onFirstNameChange(v: String) = _ui.update { it.copy(firstName = v.take(50), error = null) }
    fun onLastNameChange(v: String) = _ui.update { it.copy(lastName = v.take(50), error = null) }

    fun requestLoginCode() {
        val email = _ui.value.email.trim().lowercase()
        if (_ui.value.isBusy) return
        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            _ui.update { it.copy(error = "Enter a valid email address") }
            return
        }
        _ui.update { it.copy(isBusy = true, error = null, noAccount = false) }
        viewModelScope.launch {
            try {
                val r = ApiClient.api.login(LoginBody(email))
                if (r.isSuccessful) {
                    _ui.update { it.copy(step = AuthStep.Code, email = email, code = "", isBusy = false) }
                } else {
                    val err = parseError(r.errorBody()?.string())
                    val notFound = err?.code == "NOT_FOUND"
                    _ui.update {
                        it.copy(
                            isBusy = false,
                            noAccount = notFound,
                            error = if (notFound) null
                            else err?.message ?: "Something went wrong (${r.code()})"
                        )
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _ui.update { it.copy(isBusy = false, error = "Couldn't reach the server. Check your connection.") }
            }
        }
    }

    fun requestRegisterCode() {
        val s = _ui.value
        if (s.isBusy) return
        val email = s.email.trim().lowercase()
        val first = s.firstName.trim()
        val last = s.lastName.trim()

        val problem = when {
            first.isEmpty() -> "Enter your first name"
            last.isEmpty() -> "Enter your last name"
            !Patterns.EMAIL_ADDRESS.matcher(email).matches() -> "Enter a valid email address"
            else -> null
        }
        if (problem != null) {
            _ui.update { it.copy(error = problem) }
            return
        }

        _ui.update { it.copy(isBusy = true, error = null, emailExists = false) }
        viewModelScope.launch {
            try {
                val r = ApiClient.api.register(AccountRegisterBody(email, first, last))
                if (r.isSuccessful) {
                    _ui.update {
                        it.copy(step = AuthStep.Code, email = email, firstName = first,
                            lastName = last, code = "", isBusy = false)
                    }
                } else {
                    val err = parseError(r.errorBody()?.string())
                    val exists = err?.code == "EMAIL_EXISTS"
                    _ui.update {
                        it.copy(
                            isBusy = false,
                            emailExists = exists,
                            error = if (exists) null
                            else err?.message ?: "Something went wrong (${r.code()})"
                        )
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _ui.update { it.copy(isBusy = false, error = "Couldn't reach the server. Check your connection.") }
            }
        }
    }

    fun verify(onSuccess: (VerifyResponse) -> Unit) {
        val s = _ui.value
        if (s.code.length != 6 || s.isBusy) return
        _ui.update { it.copy(isBusy = true, error = null) }
        viewModelScope.launch {
            try {
                val response = ApiClient.api.verify(VerifyBody(s.email, s.code))
                _ui.update { it.copy(isBusy = false) }
                onSuccess(response)
            } catch (e: CancellationException) {
                throw e
            } catch (e: HttpException) {
                val err = parseError(e.response()?.errorBody()?.string())
                val msg = when (err?.code) {
                    "INVALID_CODE" -> "That code isn't right. Try again."
                    "CODE_EXPIRED" -> "That code has expired. Send a new one."
                    else -> err?.message ?: "Something went wrong (${e.code()})"
                }
                _ui.update { it.copy(isBusy = false, error = msg) }
            } catch (e: Exception) {
                _ui.update { it.copy(isBusy = false, error = "Couldn't reach the server. Check your connection.") }
            }
        }
    }

    private fun parseError(body: String?): ApiError? = body
        ?.let { runCatching { ApiClient.json.decodeFromString<ErrorEnvelope>(it) }.getOrNull() }
        ?.error
}