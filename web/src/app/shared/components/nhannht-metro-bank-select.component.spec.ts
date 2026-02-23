import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { NhannhtMetroBankSelectComponent } from './nhannht-metro-bank-select.component';
import { VietQRBank } from '../../core/bank-list';

const mockBanks: VietQRBank[] = [
  { id: 17, name: 'Vietcombank Full', code: 'VCB', bin: '970436', shortName: 'Vietcombank', logo: 'https://api.vietqr.io/img/VCB.png', transferSupported: 1, lookupSupported: 1 },
  { id: 43, name: 'VietinBank Full', code: 'ICB', bin: '970415', shortName: 'VietinBank', logo: 'https://api.vietqr.io/img/ICB.png', transferSupported: 1, lookupSupported: 1 },
  { id: 4, name: 'BIDV Full', code: 'BIDV', bin: '970418', shortName: 'BIDV', logo: 'https://api.vietqr.io/img/BIDV.png', transferSupported: 1, lookupSupported: 1 },
];

describe('NhannhtMetroBankSelectComponent', () => {
  let component: NhannhtMetroBankSelectComponent;
  let fixture: ComponentFixture<NhannhtMetroBankSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NhannhtMetroBankSelectComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(NhannhtMetroBankSelectComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render placeholder when no value is set', () => {
    fixture.componentRef.setInput('placeholder', 'Choose bank');
    fixture.componentRef.setInput('banks', mockBanks);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Choose bank');
  });

  it('should show selected bank logo and name when value is set', () => {
    fixture.componentRef.setInput('banks', mockBanks);
    component.writeValue('970436');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Vietcombank');
    expect(el.textContent).toContain('VCB');
    const img = el.querySelector('button img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('VCB.png');
  });

  it('should open dropdown on click', () => {
    fixture.componentRef.setInput('banks', mockBanks);
    fixture.detectChanges();
    expect(component.open()).toBe(false);

    const trigger = fixture.nativeElement.querySelector('button') as HTMLElement;
    trigger.click();
    fixture.detectChanges();
    expect(component.open()).toBe(true);

    const listbox = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(listbox).toBeTruthy();
    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);
  });

  it('should select a bank and emit value', () => {
    fixture.componentRef.setInput('banks', mockBanks);
    fixture.detectChanges();

    const onChangeSpy = vi.fn();
    component.registerOnChange(onChangeSpy);

    component.toggle();
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    options[1].click(); // VietinBank
    fixture.detectChanges();

    expect(component.value()).toBe('970415');
    expect(onChangeSpy).toHaveBeenCalledWith('970415');
    expect(component.open()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('VietinBank');
  });

  it('should close on click outside', () => {
    fixture.componentRef.setInput('banks', mockBanks);
    fixture.detectChanges();
    component.toggle();
    expect(component.open()).toBe(true);

    // Simulate click outside
    component.onDocumentClick({ target: document.body } as any);
    expect(component.open()).toBe(false);
  });

  it('should not close on click inside', () => {
    fixture.componentRef.setInput('banks', mockBanks);
    fixture.detectChanges();
    component.toggle();
    expect(component.open()).toBe(true);

    // Simulate click inside
    component.onDocumentClick({ target: fixture.nativeElement } as any);
    expect(component.open()).toBe(true);
  });

  it('should close on Escape key', () => {
    fixture.componentRef.setInput('banks', mockBanks);
    fixture.detectChanges();
    component.toggle();
    expect(component.open()).toBe(true);

    component.onEscape();
    expect(component.open()).toBe(false);
  });

  it('should not toggle when disabled', () => {
    fixture.componentRef.setInput('banks', mockBanks);
    component.setDisabledState(true);
    fixture.detectChanges();

    component.toggle();
    expect(component.open()).toBe(false);
  });

  it('should render label when provided', () => {
    fixture.componentRef.setInput('label', 'Bank Name');
    fixture.componentRef.setInput('banks', mockBanks);
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label');
    expect(label).toBeTruthy();
    expect(label.textContent).toContain('Bank Name');
  });

  it('should render error message when provided', () => {
    fixture.componentRef.setInput('error', 'Required field');
    fixture.componentRef.setInput('banks', mockBanks);
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('Required field');
  });

  it('should implement writeValue', () => {
    fixture.componentRef.setInput('banks', mockBanks);
    component.writeValue('970418');
    fixture.detectChanges();
    expect(component.value()).toBe('970418');
    expect(fixture.nativeElement.textContent).toContain('BIDV');
  });

  it('should handle null writeValue', () => {
    component.writeValue(null as any);
    expect(component.value()).toBe('');
  });
});
