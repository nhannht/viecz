import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { PaymentReturnComponent } from './payment-return.component';

function createComponent(queryParams: Record<string, string>): ComponentFixture<PaymentReturnComponent> {
  TestBed.configureTestingModule({
    imports: [PaymentReturnComponent],
    providers: [
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
});
