import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDeleteDialogComponent } from './confirm-delete-dialog.component';

describe('ConfirmDeleteDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDeleteDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDeleteDialogComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: MAT_DIALOG_DATA, useValue: { taskTitle: 'Fix Laptop' } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDeleteDialogComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display Cancel Task title', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Cancel Task');
  });

  it('should display task title in confirmation message', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Fix Laptop');
  });

  it('should display warning text', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('reject all pending applications');
  });

  it('should have Keep and Cancel buttons', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No, Keep It');
    expect(el.textContent).toContain('Yes, Cancel Task');
  });
});
