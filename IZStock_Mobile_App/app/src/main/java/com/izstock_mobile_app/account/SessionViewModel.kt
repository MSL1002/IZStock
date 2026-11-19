package com.izstock_mobile_app.account

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.izstock_mobile_app.data.ApiClient
import com.izstock_mobile_app.data.VerifyResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch


data class UserProfile(val firstName: String, val lastName: String, val email: String)

class SessionViewModel(app: Application) : AndroidViewModel(app) {
    private val store = SessionStore(app.applicationContext)

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _isSignedIn = MutableStateFlow(false)
    val isSignedIn: StateFlow<Boolean> = _isSignedIn

    private val _profile = MutableStateFlow<UserProfile?>(null)
    val profile: StateFlow<UserProfile?> = _profile

    init {
        ApiClient.onUnauthorized = { signOutLocally() }
        viewModelScope.launch {
            store.load()?.let { s ->
                ApiClient.authToken = s.token
                _profile.value = UserProfile(s.firstName, s.lastName, s.email)
                _isSignedIn.value = true
            }
            _isLoading.value = false
        }
    }

    fun onSignedIn(response: VerifyResponse) {
        ApiClient.authToken = response.token
        val p = UserProfile(
            response.user.firstName, response.user.lastName, response.user.email.orEmpty()
        )
        _profile.value = p
        _isSignedIn.value = true
        viewModelScope.launch { store.save(response.token, p.firstName, p.lastName, p.email) }
    }

    fun signOut() {
        viewModelScope.launch {
            runCatching { ApiClient.api.logout() }   // best effort; sign out locally regardless
            signOutLocally()
        }
    }

    private fun signOutLocally() {
        ApiClient.authToken = null
        _isSignedIn.value = false
        _profile.value = null
        viewModelScope.launch { store.clear() }
    }
}