package com.viecz.vieczandroid.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.viecz.vieczandroid.R
import com.viecz.vieczandroid.data.models.BankAccount
import com.viecz.vieczandroid.data.models.VietQRBank
import com.viecz.vieczandroid.data.models.WalletTransaction
import com.viecz.vieczandroid.data.models.WalletTransactionType
import com.viecz.vieczandroid.ui.components.metro.MetroButton
import com.viecz.vieczandroid.ui.components.metro.MetroButtonVariant
import com.viecz.vieczandroid.ui.components.metro.MetroCard
import com.viecz.vieczandroid.ui.components.metro.MetroDialog
import com.viecz.vieczandroid.ui.components.metro.MetroDivider
import com.viecz.vieczandroid.ui.components.metro.MetroFab
import com.viecz.vieczandroid.ui.components.metro.MetroInput
import com.viecz.vieczandroid.ui.components.metro.MetroSelect
import com.viecz.vieczandroid.ui.components.metro.MetroSelectOption
import com.viecz.vieczandroid.ui.components.metro.MetroSpinner
import com.viecz.vieczandroid.ui.theme.MetroTheme
import com.viecz.vieczandroid.ui.viewmodels.*
import com.viecz.vieczandroid.utils.formatCurrency
import com.viecz.vieczandroid.utils.formatDateTime

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WalletScreen(
    onNavigateBack: () -> Unit,
    viewModel: WalletViewModel = hiltViewModel()
) {
    val colors = MetroTheme.colors
    val walletState by viewModel.uiState.collectAsState()
    val transactionsState by viewModel.transactionsState.collectAsState()
    val depositState by viewModel.depositState.collectAsState()
    val withdrawalState by viewModel.withdrawalState.collectAsState()
    val bankAccountsState by viewModel.bankAccountsState.collectAsState()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var showDepositDialog by remember { mutableStateOf(false) }
    var showWithdrawDialog by remember { mutableStateOf(false) }

    // Auto-refresh wallet when returning from browser (RESUMED state)
    LaunchedEffect(lifecycleOwner) {
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            viewModel.loadWallet()
            viewModel.loadTransactionHistory()
        }
    }

    // Open browser when deposit succeeds
    LaunchedEffect(depositState) {
        if (depositState is DepositUiState.Success) {
            val checkoutUrl = (depositState as DepositUiState.Success).checkoutUrl
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(checkoutUrl))
            context.startActivity(intent)
            showDepositDialog = false
            viewModel.resetDepositState()
        }
    }

    // Close withdraw dialog on success
    LaunchedEffect(withdrawalState) {
        if (withdrawalState is WithdrawalUiState.Success) {
            showWithdrawDialog = false
            viewModel.resetWithdrawalState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.wallet_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.wallet_back))
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadWallet() }) {
                        Icon(Icons.Default.Refresh, stringResource(R.string.wallet_refresh))
                    }
                }
            )
        },
        floatingActionButton = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalAlignment = Alignment.End
            ) {
                MetroFab(
                    onClick = { showWithdrawDialog = true },
                    icon = Icons.AutoMirrored.Filled.Send,
                    contentDescription = stringResource(R.string.wallet_withdraw),
                )
                MetroFab(
                    onClick = { showDepositDialog = true },
                    icon = Icons.Default.Add,
                    contentDescription = stringResource(R.string.wallet_deposit),
                )
            }
        }
    ) { paddingValues ->
        WalletContent(
            viewModel = viewModel,
            modifier = Modifier.padding(paddingValues)
        )
    }

    // Deposit Dialog
    if (showDepositDialog) {
        DepositDialog(
            depositState = depositState,
            onDeposit = { amount, description ->
                viewModel.deposit(amount, description)
            },
            onDismiss = {
                showDepositDialog = false
                viewModel.resetDepositState()
            }
        )
    }

    // Withdraw Dialog
    if (showWithdrawDialog) {
        val availableBalance = (walletState as? WalletUiState.Success)?.wallet?.availableBalance ?: 0L
        val bankAccounts = (bankAccountsState as? BankAccountsUiState.Success)?.accounts ?: emptyList()

        WithdrawDialog(
            withdrawalState = withdrawalState,
            bankAccounts = bankAccounts,
            availableBalance = availableBalance,
            onWithdraw = { amount, bankAccountId ->
                viewModel.withdraw(amount, bankAccountId)
            },
            onDismiss = {
                showWithdrawDialog = false
                viewModel.resetWithdrawalState()
            }
        )
    }
}

@Composable
fun WalletContent(
    viewModel: WalletViewModel = hiltViewModel(),
    modifier: Modifier = Modifier
) {
    val colors = MetroTheme.colors
    val walletState by viewModel.uiState.collectAsState()
    val transactionsState by viewModel.transactionsState.collectAsState()
    val bankAccountsState by viewModel.bankAccountsState.collectAsState()
    val banksState by viewModel.banksState.collectAsState()
    val addBankAccountState by viewModel.addBankAccountState.collectAsState()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Wallet Balance Card
        item {
            when (val state = walletState) {
                is WalletUiState.Loading -> {
                    MetroCard {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            MetroSpinner()
                        }
                    }
                }
                is WalletUiState.Success -> {
                    WalletBalanceCard(state.wallet)
                }
                is WalletUiState.Error -> {
                    ErrorCard(state.message) {
                        viewModel.loadWallet()
                    }
                }
            }
        }

        // Deposit/Withdrawal limits info
        item {
            Text(
                text = stringResource(R.string.wallet_limits),
                style = MaterialTheme.typography.bodySmall,
                color = colors.muted,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center
            )
        }

        // Bank Accounts Section
        item {
            BankAccountsSection(
                bankAccountsState = bankAccountsState,
                banksState = banksState,
                addBankAccountState = addBankAccountState,
                onAddBankAccount = { bankBin, bankName, accountNumber, accountHolderName ->
                    viewModel.addBankAccount(bankBin, bankName, accountNumber, accountHolderName)
                },
                onDeleteBankAccount = { id -> viewModel.deleteBankAccount(id) },
                onResetAddState = { viewModel.resetAddBankAccountState() }
            )
        }

        // Transaction History Header
        item {
            Text(
                text = stringResource(R.string.wallet_transaction_history),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = colors.fg
            )
        }

        // Transaction List
        when (val state = transactionsState) {
            is TransactionsUiState.Loading -> {
                item {
                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        MetroSpinner()
                    }
                }
            }
            is TransactionsUiState.Success -> {
                if (state.transactions.isEmpty()) {
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Receipt,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = colors.muted.copy(alpha = 0.5f)
                            )
                            Text(
                                text = stringResource(R.string.wallet_no_transactions),
                                style = MaterialTheme.typography.bodyLarge,
                                color = colors.muted
                            )
                            Text(
                                text = stringResource(R.string.wallet_deposit_to_start),
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.muted.copy(alpha = 0.7f)
                            )
                        }
                    }
                } else {
                    items(state.transactions) { transaction ->
                        TransactionItem(transaction)
                    }
                }
            }
            is TransactionsUiState.Error -> {
                item {
                    ErrorCard(state.message) {
                        viewModel.loadTransactionHistory()
                    }
                }
            }
        }
    }
}

@Composable
fun BankAccountsSection(
    bankAccountsState: BankAccountsUiState,
    banksState: BanksUiState,
    addBankAccountState: AddBankAccountUiState,
    onAddBankAccount: (String, String, String, String) -> Unit,
    onDeleteBankAccount: (Long) -> Unit,
    onResetAddState: () -> Unit
) {
    val colors = MetroTheme.colors
    var expanded by remember { mutableStateOf(false) }

    MetroCard {
        Row(
            modifier = Modifier
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(R.string.wallet_bank_accounts),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = colors.fg
            )
            IconButton(onClick = { expanded = !expanded }) {
                Icon(
                    imageVector = if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = if (expanded) stringResource(R.string.wallet_collapse) else stringResource(R.string.wallet_expand),
                    tint = colors.fg
                )
            }
        }

        AnimatedVisibility(visible = expanded) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                MetroDivider()

                // Bank accounts list
                when (bankAccountsState) {
                    is BankAccountsUiState.Loading -> {
                        Box(
                            modifier = Modifier.fillMaxWidth(),
                            contentAlignment = Alignment.Center
                        ) {
                            MetroSpinner()
                        }
                    }
                    is BankAccountsUiState.Success -> {
                        if (bankAccountsState.accounts.isEmpty()) {
                            Text(
                                text = stringResource(R.string.wallet_no_bank_accounts),
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.muted
                            )
                        } else {
                            bankAccountsState.accounts.forEach { account ->
                                BankAccountItem(
                                    account = account,
                                    onDelete = { onDeleteBankAccount(account.id) }
                                )
                            }
                        }
                    }
                    is BankAccountsUiState.Error -> {
                        Text(
                            text = bankAccountsState.message,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }

                MetroDivider()

                // Add bank account form
                val banks = (banksState as? BanksUiState.Success)?.banks ?: emptyList()
                AddBankAccountForm(
                    banks = banks,
                    addState = addBankAccountState,
                    onAdd = onAddBankAccount,
                    onResetState = onResetAddState
                )
            }
        }
    }
}

@Composable
fun BankAccountItem(
    account: BankAccount,
    onDelete: () -> Unit
) {
    val colors = MetroTheme.colors

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = account.bankName,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = colors.fg
            )
            Text(
                text = stringResource(R.string.wallet_bank_account_detail, account.accountNumber, account.accountHolderName),
                style = MaterialTheme.typography.bodySmall,
                color = colors.muted
            )
        }
        IconButton(onClick = onDelete) {
            Icon(
                imageVector = Icons.Default.Delete,
                contentDescription = stringResource(R.string.wallet_delete),
                tint = MaterialTheme.colorScheme.error
            )
        }
    }
}

@Composable
fun AddBankAccountForm(
    banks: List<VietQRBank>,
    addState: AddBankAccountUiState,
    onAdd: (String, String, String, String) -> Unit,
    onResetState: () -> Unit
) {
    val colors = MetroTheme.colors
    var selectedBankBin by remember { mutableStateOf("") }
    var accountNumber by remember { mutableStateOf("") }
    var accountHolderName by remember { mutableStateOf("") }

    val selectedBank = banks.find { it.bin == selectedBankBin && it.transferSupported == 1 }
    val bankOptions = buildBankOptions(banks, stringResource(R.string.wallet_bank_bin, "%s"))
    val binValidationError = validateSelectedBankBin(selectedBankBin, banks, stringResource(R.string.wallet_invalid_bank))

    val isValid = selectedBankBin.isNotEmpty() &&
            binValidationError.isEmpty() &&
            accountNumber.isNotBlank() &&
            accountHolderName.isNotBlank()

    // Reset form on success
    LaunchedEffect(addState) {
        if (addState is AddBankAccountUiState.Success) {
            selectedBankBin = ""
            accountNumber = ""
            accountHolderName = ""
            onResetState()
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = stringResource(R.string.wallet_add_bank_title),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = colors.fg
        )

        MetroSelect(
            selected = selectedBankBin,
            onSelected = { selectedBankBin = it },
            options = bankOptions,
            label = stringResource(R.string.wallet_bank_label),
            placeholder = stringResource(R.string.wallet_bank_placeholder),
            error = binValidationError,
        )

        MetroInput(
            value = accountNumber,
            onValueChange = { accountNumber = it },
            label = stringResource(R.string.wallet_account_number_label),
            placeholder = stringResource(R.string.wallet_account_number_placeholder),
            keyboardType = KeyboardType.Number,
        )

        MetroInput(
            value = accountHolderName,
            onValueChange = { accountHolderName = it },
            label = stringResource(R.string.wallet_account_holder_label),
            placeholder = stringResource(R.string.wallet_account_holder_placeholder),
        )

        when (addState) {
            is AddBankAccountUiState.Loading -> {
                MetroSpinner()
            }
            is AddBankAccountUiState.Error -> {
                Text(
                    text = addState.message,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            else -> {}
        }

        MetroButton(
            label = stringResource(R.string.wallet_add_account_button),
            onClick = {
                if (isValid && selectedBank != null) {
                    onAdd(selectedBankBin, selectedBank.shortName, accountNumber, accountHolderName)
                }
            },
            enabled = isValid && addState !is AddBankAccountUiState.Loading,
            variant = MetroButtonVariant.Secondary,
        )
    }
}

@Composable
fun WalletBalanceCard(wallet: com.viecz.vieczandroid.data.models.Wallet) {
    val colors = MetroTheme.colors
    val totalBalance = wallet.balance

    MetroCard(featured = true) {
        // Total Balance — hero number
        Text(
            text = stringResource(R.string.wallet_total_balance),
            style = MaterialTheme.typography.titleMedium,
            color = colors.muted
        )
        Text(
            text = formatCurrency(totalBalance),
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            color = colors.fg
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Available + Escrow side by side
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Available card
            MetroCard(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(12.dp),
            ) {
                Text(
                    text = stringResource(R.string.wallet_available),
                    style = MaterialTheme.typography.labelMedium,
                    color = colors.muted
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = formatCurrency(wallet.availableBalance),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = colors.fg
                )
            }

            // Escrow card
            MetroCard(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(12.dp),
            ) {
                Text(
                    text = stringResource(R.string.wallet_in_escrow),
                    style = MaterialTheme.typography.labelMedium,
                    color = colors.muted
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = formatCurrency(wallet.escrowBalance),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = colors.fg
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        MetroDivider()
        Spacer(modifier = Modifier.height(12.dp))

        // Earned + Spent — secondary stats
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = stringResource(R.string.wallet_earned),
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.muted.copy(alpha = 0.6f)
                )
                Text(
                    text = formatCurrency(wallet.totalEarned),
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.fg.copy(alpha = 0.8f)
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = stringResource(R.string.wallet_spent),
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.muted.copy(alpha = 0.6f)
                )
                Text(
                    text = formatCurrency(wallet.totalSpent),
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.fg.copy(alpha = 0.8f)
                )
            }
        }
    }
}

@Composable
fun TransactionItem(transaction: WalletTransaction) {
    val colors = MetroTheme.colors

    MetroCard(contentPadding = PaddingValues(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = transaction.description,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    color = colors.fg
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = formatTransactionType(transaction.type),
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.muted
                )
                Text(
                    text = formatDateTime(transaction.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.muted
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = formatCurrency(transaction.amount),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (transaction.amount >= 0) colors.fg else MaterialTheme.colorScheme.error
                )
                Text(
                    text = stringResource(R.string.wallet_balance_after, formatCurrency(transaction.balanceAfter)),
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.muted
                )
            }
        }
    }
}

@Composable
fun WithdrawDialog(
    withdrawalState: WithdrawalUiState,
    bankAccounts: List<BankAccount>,
    availableBalance: Long,
    onWithdraw: (Long, Long) -> Unit,
    onDismiss: () -> Unit
) {
    var amount by remember { mutableStateOf("") }
    var selectedAccountId by remember { mutableStateOf("") }
    val amountLong = amount.toLongOrNull()

    val accountOptions = bankAccounts.map {
        MetroSelectOption(
            value = it.id.toString(),
            label = stringResource(R.string.wallet_bank_option, it.bankName, it.accountNumber)
        )
    }

    val withdrawMinError = stringResource(R.string.wallet_withdraw_min)
    val withdrawMaxError = stringResource(R.string.wallet_withdraw_max)
    val withdrawMultiplesError = stringResource(R.string.wallet_withdraw_multiples)
    val withdrawExceedsError = stringResource(R.string.wallet_withdraw_exceeds, formatCurrency(availableBalance))

    val amountError = when {
        amountLong == null -> ""
        amountLong < 10000 -> withdrawMinError
        amountLong > 200000 -> withdrawMaxError
        amountLong % 1000 != 0L -> withdrawMultiplesError
        amountLong > availableBalance -> withdrawExceedsError
        else -> ""
    }

    val isValid = amountLong != null &&
            amountLong in 10000..200000 &&
            amountLong % 1000 == 0L &&
            amountLong <= availableBalance &&
            selectedAccountId.isNotEmpty()

    MetroDialog(
        open = true,
        onDismiss = onDismiss,
        title = stringResource(R.string.wallet_withdraw_title),
        confirmLabel = stringResource(R.string.wallet_withdraw_confirm),
        cancelLabel = stringResource(R.string.wallet_withdraw_cancel),
        onConfirm = {
            if (isValid) {
                onWithdraw(amountLong!!, selectedAccountId.toLong())
            }
        },
        onCancel = onDismiss,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (bankAccounts.isEmpty()) {
                Text(
                    text = stringResource(R.string.wallet_withdraw_no_accounts),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            } else {
                MetroSelect(
                    selected = selectedAccountId,
                    onSelected = { selectedAccountId = it },
                    options = accountOptions,
                    label = stringResource(R.string.wallet_withdraw_bank_label),
                    placeholder = stringResource(R.string.wallet_withdraw_bank_placeholder),
                )
            }

            MetroInput(
                value = amount,
                onValueChange = { amount = it },
                label = stringResource(R.string.wallet_withdraw_amount_label),
                placeholder = stringResource(R.string.wallet_withdraw_amount_placeholder),
                keyboardType = KeyboardType.Number,
                error = amountError,
            )

            Text(
                text = stringResource(R.string.wallet_withdraw_available, formatCurrency(availableBalance)),
                style = MaterialTheme.typography.bodySmall,
                color = MetroTheme.colors.muted
            )

            when (withdrawalState) {
                is WithdrawalUiState.Loading -> {
                    MetroSpinner()
                }
                is WithdrawalUiState.Error -> {
                    Text(
                        text = withdrawalState.message,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                else -> {}
            }
        }
    }
}

@Composable
fun DepositDialog(
    depositState: DepositUiState,
    onDeposit: (Long, String) -> Unit,
    onDismiss: () -> Unit
) {
    var amount by remember { mutableStateOf("") }
    val defaultDescription = stringResource(R.string.wallet_deposit_description)
    var description by remember { mutableStateOf(defaultDescription) }
    val amountLong = amount.toLongOrNull()
    val isValidAmount = amountLong != null && amountLong >= 2000

    val depositMinError = stringResource(R.string.wallet_deposit_min)

    MetroDialog(
        open = true,
        onDismiss = onDismiss,
        title = stringResource(R.string.wallet_deposit_title),
        confirmLabel = stringResource(R.string.wallet_deposit_confirm),
        cancelLabel = stringResource(R.string.wallet_deposit_cancel),
        onConfirm = {
            if (isValidAmount) {
                onDeposit(amountLong!!, description)
            }
        },
        onCancel = onDismiss,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            MetroInput(
                value = amount,
                onValueChange = { amount = it },
                label = stringResource(R.string.wallet_deposit_amount_label),
                placeholder = stringResource(R.string.wallet_deposit_amount_placeholder),
                keyboardType = KeyboardType.Number,
                error = if (amountLong != null && amountLong < 2000) depositMinError else "",
            )

            MetroInput(
                value = description,
                onValueChange = { description = it },
                label = stringResource(R.string.wallet_deposit_description_label),
            )

            when (depositState) {
                is DepositUiState.Loading -> {
                    MetroSpinner()
                }
                is DepositUiState.Error -> {
                    Text(
                        text = depositState.message,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                else -> {}
            }
        }
    }
}

@Composable
fun ErrorCard(message: String, onRetry: () -> Unit) {
    val colors = MetroTheme.colors

    MetroCard(contentPadding = PaddingValues(16.dp)) {
        Text(
            text = stringResource(R.string.wallet_error_title),
            style = MaterialTheme.typography.titleMedium,
            color = colors.fg
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = colors.muted
        )
        Spacer(modifier = Modifier.height(8.dp))
        MetroButton(
            label = stringResource(R.string.wallet_retry),
            onClick = onRetry,
            variant = MetroButtonVariant.Secondary,
        )
    }
}

// Helper functions
internal fun buildBankOptions(banks: List<VietQRBank>, binFormat: String = "BIN %s"): List<MetroSelectOption> {
    return banks
        .filter { it.transferSupported == 1 }
        .map {
            MetroSelectOption(
                value = it.bin,
                label = it.shortName,
                supportingText = String.format(binFormat, it.bin),
                imageUrl = it.logo,
            )
        }
}

internal fun validateSelectedBankBin(selectedBankBin: String, banks: List<VietQRBank>, invalidBinMessage: String = "Invalid bank BIN selected"): String {
    if (selectedBankBin.isEmpty()) return ""

    val validBins = banks
        .asSequence()
        .filter { it.transferSupported == 1 }
        .map { it.bin }
        .toSet()

    return if (selectedBankBin in validBins) "" else invalidBinMessage
}

@Composable
fun formatTransactionType(type: WalletTransactionType): String {
    return when (type) {
        WalletTransactionType.DEPOSIT -> stringResource(R.string.wallet_type_deposit)
        WalletTransactionType.WITHDRAWAL -> stringResource(R.string.wallet_type_withdrawal)
        WalletTransactionType.ESCROW_HOLD -> stringResource(R.string.wallet_type_escrow_hold)
        WalletTransactionType.ESCROW_RELEASE -> stringResource(R.string.wallet_type_escrow_release)
        WalletTransactionType.ESCROW_REFUND -> stringResource(R.string.wallet_type_escrow_refund)
        WalletTransactionType.PAYMENT_RECEIVED -> stringResource(R.string.wallet_type_payment_received)
        WalletTransactionType.PLATFORM_FEE -> stringResource(R.string.wallet_type_platform_fee)
    }
}
