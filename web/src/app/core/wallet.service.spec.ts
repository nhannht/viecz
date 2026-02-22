import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { WalletService } from './wallet.service';
import { Wallet, WalletTransaction, DepositResponse } from './models';

describe('WalletService', () => {
  let service: WalletService;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WalletService);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpCtrl.verify());

  it('should fetch wallet info', () => {
    const mockWallet: Wallet = {
      id: 1, user_id: 1, balance: 100000, escrow_balance: 20000,
      available_balance: 80000, total_deposited: 200000, total_withdrawn: 0,
      total_earned: 50000, total_spent: 50000,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    service.get().subscribe(w => expect(w).toEqual(mockWallet));
    const req = httpCtrl.expectOne('/api/v1/wallet');
    expect(req.request.method).toBe('GET');
    req.flush(mockWallet);
  });

  it('should deposit with amount and description', () => {
    const mockRes: DepositResponse = { checkout_url: 'https://pay.payos.vn/web/123', order_code: 123 };
    service.deposit(50000, 'Test deposit').subscribe(r => expect(r).toEqual(mockRes));
    const req = httpCtrl.expectOne('/api/v1/wallet/deposit');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.amount).toBe(50000);
    expect(req.request.body.description).toBe('Test deposit');
    expect(req.request.body.return_url).toContain('/payment/return');
    req.flush(mockRes);
  });

  it('should deposit with default description', () => {
    service.deposit(10000).subscribe();
    const req = httpCtrl.expectOne('/api/v1/wallet/deposit');
    expect(req.request.body.description).toBe('Wallet deposit');
    req.flush({ checkout_url: '', order_code: 1 });
  });

  it('should fetch transactions with pagination', () => {
    const mockTxs: WalletTransaction[] = [{
      id: 1, wallet_id: 1, type: 'deposit', amount: 50000,
      balance_before: 0, balance_after: 50000, escrow_before: 0, escrow_after: 0,
      description: 'Deposit', created_at: '2026-01-01T00:00:00Z',
    }];
    service.getTransactions(10, 5).subscribe(txs => expect(txs).toEqual(mockTxs));
    const req = httpCtrl.expectOne(r => r.url === '/api/v1/wallet/transactions');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('offset')).toBe('5');
    req.flush(mockTxs);
  });

  it('should use default pagination params', () => {
    service.getTransactions().subscribe();
    const req = httpCtrl.expectOne(r => r.url === '/api/v1/wallet/transactions');
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.get('offset')).toBe('0');
    req.flush([]);
  });

  it('should create escrow', () => {
    service.createEscrow(42).subscribe();
    const req = httpCtrl.expectOne('/api/v1/payments/escrow');
    expect(req.request.body).toEqual({ task_id: 42 });
    req.flush({});
  });

  it('should release payment', () => {
    service.releasePayment(42).subscribe();
    const req = httpCtrl.expectOne('/api/v1/payments/release');
    expect(req.request.body).toEqual({ task_id: 42 });
    req.flush({});
  });

  it('should refund payment', () => {
    service.refundPayment(42, 'bad work').subscribe();
    const req = httpCtrl.expectOne('/api/v1/payments/refund');
    expect(req.request.body).toEqual({ task_id: 42, reason: 'bad work' });
    req.flush({});
  });

  it('should handle HTTP error on get', () => {
    service.get().subscribe({ error: err => expect(err.status).toBe(401) });
    httpCtrl.expectOne('/api/v1/wallet').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should handle HTTP error on deposit', () => {
    service.deposit(500).subscribe({ error: err => expect(err.status).toBe(400) });
    httpCtrl.expectOne('/api/v1/wallet/deposit').flush({ error: 'Amount too low' }, { status: 400, statusText: 'Bad Request' });
  });
});
