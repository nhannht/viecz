import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PLATFORM_ID, signal } from '@angular/core';
import { PaymentReturnComponent } from './payment-return.component';
import { AuthService } from '../core/auth.service';
import { provideTranslocoForTesting } from '../core/transloco-testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

function createComponent(
  queryParams: Record<string, string>,
  loggedIn = true,
): ComponentFixture<PaymentReturnComponent> {
  TestBed.configureTestingModule({
    imports: [PaymentReturnComponent],
    providers: [
      provideTranslocoForTesting(),
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: 'browser' },
      {
        provide: AuthService,
        useValue: {
          currentUser: signal(loggedIn ? { id: 1, name: 'Test' } : null),
          isAuthenticated: signal(loggedIn),
          getAccessToken: () => (loggedIn ? 'token' : null),
        },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(queryParams),
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(PaymentReturnComponent);
  fixture.detectChanges();
  return fixture;
}

describe('PaymentReturnComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    const fixture = createComponent({});
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show success when code=00', () => {
    const fixture = createComponent({ code: '00', status: 'PAID' });
    expect(fixture.componentInstance.state()).toBe('success');
  });

  it('should show success when status=PAID', () => {
    const fixture = createComponent({ status: 'PAID' });
    expect(fixture.componentInstance.state()).toBe('success');
  });

  it('should show cancelled when cancel=true', () => {
    const fixture = createComponent({ cancel: 'true' });
    expect(fixture.componentInstance.state()).toBe('cancelled');
  });

  it('should show error for unknown params', () => {
    const fixture = createComponent({ code: '01' });
    expect(fixture.componentInstance.state()).toBe('error');
  });

  it('should render success UI when state is success (covers @if state===success branch)', () => {
    const fixture = createComponent({ code: '00' });
    fixture.componentInstance.state.set('success');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('PAYMENT SUCCESSFUL');
  });

  it('should render cancelled UI when state is cancelled (covers @else if state===cancelled branch)', () => {
    const fixture = createComponent({ cancel: 'true' });
    fixture.componentInstance.state.set('cancelled');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('PAYMENT CANCELLED');
  });

  it('should render error UI when state is error (covers @else branch)', () => {
    const fixture = createComponent({ code: '99' });
    fixture.componentInstance.state.set('error');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('PAYMENT ERROR');
  });

  it('should show wallet button when loggedIn is true (covers @if loggedIn() true branch)', () => {
    const fixture = createComponent({ code: '00' }, true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Go to Wallet');
  });

  it('should show login button when not loggedIn (covers @else branch of loggedIn)', () => {
    const fixture = createComponent({ code: '00' }, false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Log In');
  });

  it('should skip query param parsing on server platform', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PaymentReturnComponent],
      providers: [
        provideTranslocoForTesting(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal(null),
            isAuthenticated: signal(false),
            getAccessToken: () => null,
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ code: '00' }) },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(PaymentReturnComponent);
    fixture.detectChanges();
    // On server, ngOnInit returns early — state remains 'error' (default)
    expect(fixture.componentInstance.state()).toBe('error');
  });
});
