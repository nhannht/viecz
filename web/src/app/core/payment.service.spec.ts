import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaymentService, EscrowResponse } from './payment.service';

const mockEscrowResponse: EscrowResponse = {
  transaction: {
    id: 1,
    task_id: 42,
    payer_id: 10,
    payee_id: 20,
    amount: 50000,
    platform_fee: 5000,
    net_amount: 45000,
    type: 'escrow',
    status: 'pending',
    description: 'Escrow for task #42',
    created_at: '2026-02-19T10:00:00Z',
    updated_at: '2026-02-19T10:00:00Z',
  },
  checkout_url: 'https://pay.example.com/checkout/abc123',
};

describe('PaymentService', () => {
  let service: PaymentService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PaymentService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createEscrow()', () => {
    it('should POST to /api/v1/payments/escrow with task_id', () => {
      service.createEscrow(42).subscribe();
      const req = httpTesting.expectOne('/api/v1/payments/escrow');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ task_id: 42 });
      req.flush(mockEscrowResponse);
    });

    it('should return the escrow response', () => {
      const spy = vi.fn();
      service.createEscrow(42).subscribe(spy);
      httpTesting.expectOne('/api/v1/payments/escrow').flush(mockEscrowResponse);
      expect(spy).toHaveBeenCalledWith(mockEscrowResponse);
    });

    it('should propagate HTTP errors', () => {
      const errorSpy = vi.fn();
      service.createEscrow(999).subscribe({ error: errorSpy });
      httpTesting.expectOne('/api/v1/payments/escrow').flush(
        { error: 'Insufficient balance' },
        { status: 400, statusText: 'Bad Request' },
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('release()', () => {
    it('should POST to /api/v1/payments/release with task_id', () => {
      service.release(42).subscribe();
      const req = httpTesting.expectOne('/api/v1/payments/release');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ task_id: 42 });
      req.flush({ message: 'payment released successfully' });
    });

    it('should return the message response', () => {
      const spy = vi.fn();
      service.release(42).subscribe(spy);
      httpTesting.expectOne('/api/v1/payments/release').flush({ message: 'payment released successfully' });
      expect(spy).toHaveBeenCalledWith({ message: 'payment released successfully' });
    });

    it('should propagate HTTP errors', () => {
      const errorSpy = vi.fn();
      service.release(999).subscribe({ error: errorSpy });
      httpTesting.expectOne('/api/v1/payments/release').flush(
        { error: 'Task not found' },
        { status: 404, statusText: 'Not Found' },
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('refund()', () => {
    it('should POST to /api/v1/payments/refund with task_id and reason', () => {
      service.refund(42, 'Task was not completed').subscribe();
      const req = httpTesting.expectOne('/api/v1/payments/refund');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ task_id: 42, reason: 'Task was not completed' });
      req.flush({ message: 'refund processed successfully' });
    });

    it('should return the message response', () => {
      const spy = vi.fn();
      service.refund(42, 'Quality issue').subscribe(spy);
      httpTesting.expectOne('/api/v1/payments/refund').flush({ message: 'refund processed successfully' });
      expect(spy).toHaveBeenCalledWith({ message: 'refund processed successfully' });
    });

    it('should propagate HTTP errors', () => {
      const errorSpy = vi.fn();
      service.refund(999, 'Invalid task').subscribe({ error: errorSpy });
      httpTesting.expectOne('/api/v1/payments/refund').flush(
        { error: 'Refund not allowed' },
        { status: 403, statusText: 'Forbidden' },
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
