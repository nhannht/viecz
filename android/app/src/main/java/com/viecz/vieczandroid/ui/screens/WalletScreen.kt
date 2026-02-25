package com.viecz.vieczandroid.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.viecz.vieczandroid.data.models.WalletTransaction
import com.viecz.vieczandroid.data.models.WalletTransactionType
import com.viecz.vieczandroid.ui.components.EmptyState
import com.viecz.vieczandroid.ui.components.metro.MetroButton
import com.viecz.vieczandroid.ui.components.metro.MetroButtonVariant
import com.viecz.vieczandroid.ui.components.metro.MetroCard
import com.viecz.vieczandroid.ui.components.metro.MetroDialog
import com.viecz.vieczandroid.ui.components.metro.MetroDivider
import com.viecz.vieczandroid.ui.components.metro.MetroFab
import com.viecz.vieczandroid.ui.components.metro.MetroInput
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
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var showDepositDialog by remember { mutableStateOf(false) }

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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Wallet") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadWallet() }) {
                        Icon(Icons.Default.Refresh, "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            MetroFab(
                onClick = { showDepositDialog = true },
                icon = Icons.Default.Add,
                contentDescription = "Deposit",
            )
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
}

@Composable
fun WalletContent(
    viewModel: WalletViewModel = hiltViewModel(),
    modifier: Modifier = Modifier
) {
    val colors = MetroTheme.colors
    val walletState by viewModel.uiState.collectAsState()
    val transactionsState by viewModel.transactionsState.collectAsState()

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

        // Deposit limits info
        item {
            Text(
                text = "Min deposit: 2,000 VND \u2022 Max balance: 200,000 VND",
                style = MaterialTheme.typography.bodySmall,
                color = colors.muted,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center
            )
        }

        // Transaction History Header
        item {
            Text(
                text = "Transaction History",
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
                                text = "No transactions yet",
                                style = MaterialTheme.typography.bodyLarge,
                                color = colors.muted
                            )
                            Text(
                                text = "Deposit funds to get started",
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
fun WalletBalanceCard(wallet: com.viecz.vieczandroid.data.models.Wallet) {
    val colors = MetroTheme.colors
    val totalBalance = wallet.balance

    MetroCard(featured = true) {
        // Total Balance — hero number
        Text(
            text = "Total Balance",
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
                    text = "Available",
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
                    text = "In Escrow",
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
                    text = "Earned",
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
                    text = "Spent",
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
                    text = "Balance: ${formatCurrency(transaction.balanceAfter)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.muted
                )
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
    var description by remember { mutableStateOf("Wallet deposit") }
    val amountLong = amount.toLongOrNull()
    val isValidAmount = amountLong != null && amountLong >= 2000

    MetroDialog(
        open = true,
        onDismiss = onDismiss,
        title = "Deposit Funds",
        confirmLabel = "Deposit",
        cancelLabel = "Cancel",
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
                label = "AMOUNT (VND)",
                placeholder = "Min: 2,000 VND",
                keyboardType = KeyboardType.Number,
                error = if (amountLong != null && amountLong < 2000) "Min: 2,000 VND" else "",
            )

            MetroInput(
                value = description,
                onValueChange = { description = it },
                label = "DESCRIPTION",
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
            text = "Error",
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
            label = "Retry",
            onClick = onRetry,
            variant = MetroButtonVariant.Secondary,
        )
    }
}

// Helper functions
fun formatTransactionType(type: WalletTransactionType): String {
    return when (type) {
        WalletTransactionType.DEPOSIT -> "Deposit"
        WalletTransactionType.WITHDRAWAL -> "Withdrawal"
        WalletTransactionType.ESCROW_HOLD -> "Escrow Hold"
        WalletTransactionType.ESCROW_RELEASE -> "Escrow Release"
        WalletTransactionType.ESCROW_REFUND -> "Refund"
        WalletTransactionType.PAYMENT_RECEIVED -> "Payment Received"
        WalletTransactionType.PLATFORM_FEE -> "Platform Fee"
    }
}
