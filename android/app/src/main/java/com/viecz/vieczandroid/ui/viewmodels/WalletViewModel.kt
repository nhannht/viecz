package com.viecz.vieczandroid.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.models.Wallet
import com.viecz.vieczandroid.data.models.WalletTransaction
import com.viecz.vieczandroid.data.repository.WalletRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WalletViewModel @Inject constructor(
    private val walletRepository: WalletRepository
) : ViewModel() {

    companion object {
        private const val TAG = "WalletViewModel"
    }

    private val _uiState = MutableStateFlow<WalletUiState>(WalletUiState.Loading)
    val uiState: StateFlow<WalletUiState> = _uiState.asStateFlow()

    private val _transactionsState = MutableStateFlow<TransactionsUiState>(TransactionsUiState.Loading)
    val transactionsState: StateFlow<TransactionsUiState> = _transactionsState.asStateFlow()

    private val _depositState = MutableStateFlow<DepositUiState>(DepositUiState.Idle)
    val depositState: StateFlow<DepositUiState> = _depositState.asStateFlow()

    init {
        loadWallet()
        loadTransactionHistory()
    }

    fun loadWallet() {
        viewModelScope.launch {
            _uiState.value = WalletUiState.Loading
            Log.d(TAG, "Loading wallet")

            walletRepository.getWallet()
                .onSuccess { wallet ->
                    Log.d(TAG, "Wallet loaded successfully")
                    _uiState.value = WalletUiState.Success(wallet)
                }
                .onFailure { error ->
                    Log.e(TAG, "Failed to load wallet", error)
                    _uiState.value = WalletUiState.Error(
                        error.message ?: "Failed to load wallet"
                    )
                }
        }
    }

    fun loadTransactionHistory(limit: Int = 20, offset: Int = 0) {
        viewModelScope.launch {
            _transactionsState.value = TransactionsUiState.Loading
            Log.d(TAG, "Loading transaction history")

            walletRepository.getTransactionHistory(limit, offset)
                .onSuccess { transactions ->
                    Log.d(TAG, "Loaded ${transactions.size} transactions")
                    _transactionsState.value = TransactionsUiState.Success(transactions)
                }
                .onFailure { error ->
                    Log.e(TAG, "Failed to load transactions", error)
                    _transactionsState.value = TransactionsUiState.Error(
                        error.message ?: "Failed to load transactions"
                    )
                }
        }
    }

    fun deposit(amount: Long, description: String = "Wallet deposit") {
        viewModelScope.launch {
            _depositState.value = DepositUiState.Loading
            Log.d(TAG, "Creating deposit for $amount")

            walletRepository.deposit(amount, description)
                .onSuccess { response ->
                    Log.d(TAG, "Deposit created: checkoutUrl=${response.checkoutUrl}")
                    _depositState.value = DepositUiState.Success(
                        checkoutUrl = response.checkoutUrl,
                        orderCode = response.orderCode
                    )
                }
                .onFailure { error ->
                    Log.e(TAG, "Deposit failed", error)
                    _depositState.value = DepositUiState.Error(
                        error.message ?: "Failed to create deposit"
                    )
                }
        }
    }

    fun resetDepositState() {
        _depositState.value = DepositUiState.Idle
    }
}

sealed class WalletUiState {
    object Loading : WalletUiState()
    data class Success(val wallet: Wallet) : WalletUiState()
    data class Error(val message: String) : WalletUiState()
}

sealed class TransactionsUiState {
    object Loading : TransactionsUiState()
    data class Success(val transactions: List<WalletTransaction>) : TransactionsUiState()
    data class Error(val message: String) : TransactionsUiState()
}

sealed class DepositUiState {
    object Idle : DepositUiState()
    object Loading : DepositUiState()
    data class Success(val checkoutUrl: String, val orderCode: Long) : DepositUiState()
    data class Error(val message: String) : DepositUiState()
}
