package com.viecz.vieczandroid.ui.viewmodels

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.api.RetrofitClient
import com.viecz.vieczandroid.data.repository.PaymentRepository
import kotlinx.coroutines.launch

sealed class PaymentUiState {
    data object Idle : PaymentUiState()
    data object Loading : PaymentUiState()
    data class Success(val checkoutUrl: String) : PaymentUiState()
    data class Error(val message: String) : PaymentUiState()
}

class PaymentViewModel(
    private val repository: PaymentRepository = PaymentRepository(RetrofitClient.paymentApi)
) : ViewModel() {

    companion object {
        private const val TAG = "PaymentViewModel"
    }

    var uiState by mutableStateOf<PaymentUiState>(PaymentUiState.Idle)
        private set

    fun createPayment(amount: Int = 2000, description: String = "Payment - 2000 VND") {
        Log.d(TAG, "createPayment() called - amount: $amount, description: $description")
        viewModelScope.launch {
            uiState = PaymentUiState.Loading
            Log.d(TAG, "State changed to Loading")

            repository.createPayment(amount, description)
                .onSuccess { response ->
                    Log.d(TAG, "Payment created successfully!")
                    Log.d(TAG, "Order code: ${response.orderCode}")
                    Log.d(TAG, "Checkout URL: ${response.checkoutUrl}")
                    uiState = PaymentUiState.Success(response.checkoutUrl)
                }
                .onFailure { error ->
                    Log.e(TAG, "Payment creation failed", error)
                    Log.e(TAG, "Error message: ${error.message}")
                    uiState = PaymentUiState.Error(error.message ?: "Unknown error")
                }
        }
    }

    fun resetState() {
        uiState = PaymentUiState.Idle
    }
}
