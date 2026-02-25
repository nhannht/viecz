package com.viecz.vieczandroid.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.models.BankAccount
import com.viecz.vieczandroid.data.models.VietQRBank
import com.viecz.vieczandroid.data.models.Wallet
import com.viecz.vieczandroid.data.models.WalletTransaction
import com.viecz.vieczandroid.data.models.WithdrawalResponse
import com.viecz.vieczandroid.data.repository.BankRepository
import com.viecz.vieczandroid.data.repository.WalletRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WalletViewModel @Inject constructor(
    private val walletRepository: WalletRepository,
    private val bankRepository: BankRepository
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

    private val _withdrawalState = MutableStateFlow<WithdrawalUiState>(WithdrawalUiState.Idle)
    val withdrawalState: StateFlow<WithdrawalUiState> = _withdrawalState.asStateFlow()

    private val _bankAccountsState = MutableStateFlow<BankAccountsUiState>(BankAccountsUiState.Loading)
    val bankAccountsState: StateFlow<BankAccountsUiState> = _bankAccountsState.asStateFlow()

    private val _banksState = MutableStateFlow<BanksUiState>(BanksUiState.Loading)
    val banksState: StateFlow<BanksUiState> = _banksState.asStateFlow()

    private val _addBankAccountState = MutableStateFlow<AddBankAccountUiState>(AddBankAccountUiState.Idle)
    val addBankAccountState: StateFlow<AddBankAccountUiState> = _addBankAccountState.asStateFlow()

    init {
        loadWallet()
        loadTransactionHistory()
        loadBanks()
        loadBankAccounts()
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

    fun loadBanks() {
        viewModelScope.launch {
            _banksState.value = BanksUiState.Loading
            Log.d(TAG, "Loading VietQR banks")

            bankRepository.getBanks()
                .onSuccess { banks ->
                    Log.d(TAG, "Loaded ${banks.size} banks")
                    _banksState.value = BanksUiState.Success(banks)
                }
                .onFailure { error ->
                    Log.e(TAG, "Failed to load banks", error)
                    _banksState.value = BanksUiState.Error(
                        error.message ?: "Failed to load banks"
                    )
                }
        }
    }

    fun loadBankAccounts() {
        viewModelScope.launch {
            _bankAccountsState.value = BankAccountsUiState.Loading
            Log.d(TAG, "Loading bank accounts")

            bankRepository.getBankAccounts()
                .onSuccess { accounts ->
                    Log.d(TAG, "Loaded ${accounts.size} bank accounts")
                    _bankAccountsState.value = BankAccountsUiState.Success(accounts)
                }
                .onFailure { error ->
                    Log.e(TAG, "Failed to load bank accounts", error)
                    _bankAccountsState.value = BankAccountsUiState.Error(
                        error.message ?: "Failed to load bank accounts"
                    )
                }
        }
    }

    fun addBankAccount(
        bankBin: String,
        bankName: String,
        accountNumber: String,
        accountHolderName: String
    ) {
        viewModelScope.launch {
            _addBankAccountState.value = AddBankAccountUiState.Loading
            Log.d(TAG, "Adding bank account: $bankName")

            bankRepository.addBankAccount(bankBin, bankName, accountNumber, accountHolderName)
                .onSuccess { account ->
                    Log.d(TAG, "Bank account added: id=${account.id}")
                    _addBankAccountState.value = AddBankAccountUiState.Success(account)
                    loadBankAccounts()
                }
                .onFailure { error ->
                    Log.e(TAG, "Failed to add bank account", error)
                    _addBankAccountState.value = AddBankAccountUiState.Error(
                        error.message ?: "Failed to add bank account"
                    )
                }
        }
    }

    fun deleteBankAccount(id: Long) {
        viewModelScope.launch {
            Log.d(TAG, "Deleting bank account: $id")

            bankRepository.deleteBankAccount(id)
                .onSuccess {
                    Log.d(TAG, "Bank account deleted: $id")
                    loadBankAccounts()
                }
                .onFailure { error ->
                    Log.e(TAG, "Failed to delete bank account", error)
                }
        }
    }

    fun withdraw(amount: Long, bankAccountId: Long) {
        viewModelScope.launch {
            _withdrawalState.value = WithdrawalUiState.Loading
            Log.d(TAG, "Creating withdrawal for $amount to bank account $bankAccountId")

            walletRepository.withdraw(amount, bankAccountId)
                .onSuccess { response ->
                    Log.d(TAG, "Withdrawal created: transactionId=${response.transactionId}")
                    _withdrawalState.value = WithdrawalUiState.Success(response)
                    loadWallet()
                    loadTransactionHistory()
                }
                .onFailure { error ->
                    Log.e(TAG, "Withdrawal failed", error)
                    _withdrawalState.value = WithdrawalUiState.Error(
                        error.message ?: "Failed to create withdrawal"
                    )
                }
        }
    }

    fun resetWithdrawalState() {
        _withdrawalState.value = WithdrawalUiState.Idle
    }

    fun resetAddBankAccountState() {
        _addBankAccountState.value = AddBankAccountUiState.Idle
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

sealed class WithdrawalUiState {
    object Idle : WithdrawalUiState()
    object Loading : WithdrawalUiState()
    data class Success(val response: WithdrawalResponse) : WithdrawalUiState()
    data class Error(val message: String) : WithdrawalUiState()
}

sealed class BankAccountsUiState {
    object Loading : BankAccountsUiState()
    data class Success(val accounts: List<BankAccount>) : BankAccountsUiState()
    data class Error(val message: String) : BankAccountsUiState()
}

sealed class BanksUiState {
    object Loading : BanksUiState()
    data class Success(val banks: List<VietQRBank>) : BanksUiState()
    data class Error(val message: String) : BanksUiState()
}

sealed class AddBankAccountUiState {
    object Idle : AddBankAccountUiState()
    object Loading : AddBankAccountUiState()
    data class Success(val account: BankAccount) : AddBankAccountUiState()
    data class Error(val message: String) : AddBankAccountUiState()
}
