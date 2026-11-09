package com.izstock_mobile_app.data

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class SessionViewModel : ViewModel() {
    private val _isSignedIn = MutableStateFlow(false)
    val isSignedIn: StateFlow<Boolean> = _isSignedIn

    // TODO: replace these with real token storage + /auth/verify and /auth/logout
    fun fakeSignIn() { _isSignedIn.value = true }
    fun signOut() { _isSignedIn.value = false }
}