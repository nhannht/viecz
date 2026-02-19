import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmEscrowDialogComponent } from './confirm-escrow-dialog.component';

describe('ConfirmEscrowDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmEscrowDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmEscrowDialogComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: MAT_DIALOG_DATA, useValue: { amount: 50000 } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmEscrowDialogComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display dialog title', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Confirm Escrow Payment');
  });

  it('should display escrow amount formatted', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('50.000');
    expect(el.textContent).toContain('₫');
  });

  it('should display info text about escrow', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('held in escrow');
  });

  it('should have Cancel and Confirm buttons', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Cancel');
    expect(el.textContent).toContain('Confirm & Pay');
  });
});
