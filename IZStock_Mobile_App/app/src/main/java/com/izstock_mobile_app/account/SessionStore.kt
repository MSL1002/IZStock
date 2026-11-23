package com.izstock_mobile_app.account

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

private val Context.sessionDataStore by preferencesDataStore(name = "session")

data class StoredSession(val token: String, val firstName: String, val lastName: String, val email: String)

class SessionStore(private val context: Context) {
    private val tokenKey = stringPreferencesKey("token_enc")
    private val firstKey = stringPreferencesKey("first_name")
    private val lastKey = stringPreferencesKey("last_name")
    private val emailKey = stringPreferencesKey("email")

    suspend fun save(token: String, firstName: String, lastName: String, email: String) =
        withContext(Dispatchers.IO) {
            val encrypted = encrypt(token)
            context.sessionDataStore.edit {
                it[tokenKey] = encrypted
                it[firstKey] = firstName
                it[lastKey] = lastName
                it[emailKey] = email
            }
        }

    // returns null if nothing is stored or the token can't be decrypted.
    suspend fun load(): StoredSession? = withContext(Dispatchers.IO) {
        val prefs = context.sessionDataStore.data.first()
        val enc = prefs[tokenKey] ?: return@withContext null
        val token = runCatching { decrypt(enc) }.getOrNull()
        if (token == null) {          // e.g. restored backup with a different Keystore
            clear()
            return@withContext null
        }
        StoredSession(
            token,
            prefs[firstKey].orEmpty(),
            prefs[lastKey].orEmpty(),
            prefs[emailKey].orEmpty()
        )
    }

    suspend fun clear() {
        context.sessionDataStore.edit { it.clear() }
    }

    private fun secretKey(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(
                ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return gen.generateKey()
    }

    private fun encrypt(plain: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val out = cipher.iv + cipher.doFinal(plain.toByteArray())   // 12-byte IV first
        return Base64.encodeToString(out, Base64.NO_WRAP)
    }

    private fun decrypt(encoded: String): String {
        val bytes = Base64.decode(encoded, Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, secretKey(),
            GCMParameterSpec(128, bytes.copyOfRange(0, 12))
        )
        return String(cipher.doFinal(bytes, 12, bytes.size - 12))
    }

    private companion object { const val ALIAS = "izstock_session_key" }
}