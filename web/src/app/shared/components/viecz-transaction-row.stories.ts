import type { Meta, StoryObj } from '@storybook/angular';
import { VieczTransactionRowComponent } from './viecz-transaction-row.component';
import type { WalletTransaction } from '../../core/models';

const baseTx: WalletTransaction = {
  id: 1,
  wallet_id: 1,
  type: 'deposit',
  amount: 500000,
  balance_before: 0,
  balance_after: 500000,
  escrow_before: 0,
  escrow_after: 0,
  description: 'Deposit via PayOS',
  created_at: '2026-02-20T10:00:00Z',
};

const meta: Meta<VieczTransactionRowComponent> = {
  title: 'viecz/TransactionRow',
  component: VieczTransactionRowComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczTransactionRowComponent>;

export const Deposit: Story = {
  args: { transaction: baseTx },
};

export const EscrowHold: Story = {
  args: {
    transaction: { ...baseTx, type: 'escrow_hold', amount: 200000, description: 'Escrow for task #5' },
  },
};

export const PaymentReceived: Story = {
  args: {
    transaction: { ...baseTx, type: 'payment_received', amount: 180000, description: 'Payment for "Help move furniture"' },
  },
};

export const PlatformFee: Story = {
  args: {
    transaction: { ...baseTx, type: 'platform_fee', amount: 20000, description: 'Platform fee (10%)' },
  },
};

export const EscrowRefund: Story = {
  args: {
    transaction: { ...baseTx, type: 'escrow_refund', amount: 200000, description: 'Escrow refund — task cancelled' },
  },
};
