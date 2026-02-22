import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NhannhtMetroDatepickerComponent } from './nhannht-metro-datepicker.component';

describe('NhannhtMetroDatepickerComponent', () => {
  let fixture: ComponentFixture<NhannhtMetroDatepickerComponent>;
  let component: NhannhtMetroDatepickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NhannhtMetroDatepickerComponent] }).compileComponents();
    fixture = TestBed.createComponent(NhannhtMetroDatepickerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Deadline');
    fixture.componentRef.setInput('min', '2026-01-01');
    fixture.componentRef.setInput('max', '2026-12-31');
    fixture.componentRef.setInput('dateId', 'test-date');
    fixture.detectChanges();
  });

  it('should create with date input type', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe('date');
  });

  it('writeValue should set value', () => {
    component.writeValue('2026-06-15');
    expect(component.value).toBe('2026-06-15');
  });

  it('registerOnChange: change event should call onChange', () => {
    const spy = vi.fn();
    component.registerOnChange(spy);
    component.onDateChange({ target: { value: '2026-03-01' } } as any);
    expect(spy).toHaveBeenCalledWith('2026-03-01');
    expect(component.value).toBe('2026-03-01');
  });

  it('should apply min and max constraints', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.min).toBe('2026-01-01');
    expect(input.max).toBe('2026-12-31');
  });

  it('should show error message', () => {
    fixture.componentRef.setInput('error', 'Deadline required');
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('[role="alert"]');
    expect(error).toBeTruthy();
    expect(error.textContent.trim()).toBe('Deadline required');
  });

  it('setDisabledState should disable the input', () => {
    component.setDisabledState(true);
    expect(component.isDisabled).toBe(true);
  });

  it('setDisabledState(false) should re-enable the input', () => {
    component.setDisabledState(true);
    component.setDisabledState(false);
    expect(component.isDisabled).toBe(false);
  });

  it('should render disabled input in DOM when disabled', () => {
    component.setDisabledState(true);
    fixture.changeDetectorRef.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('should render enabled input in DOM when not disabled', () => {
    component.setDisabledState(false);
    fixture.changeDetectorRef.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(false);
  });

  it('writeValue should handle null gracefully', () => {
    component.writeValue(null as any);
    expect(component.value).toBe('');
  });

  it('registerOnTouched should be callable', () => {
    const spy = vi.fn();
    component.registerOnTouched(spy);
    // no-op in this component, just verifies it exists
  });

  it('should render label when provided', () => {
    const label = fixture.nativeElement.querySelector('label');
    expect(label).toBeTruthy();
    expect(label.textContent.trim()).toBe('Deadline');
  });

  it('should not render label when empty', () => {
    fixture.componentRef.setInput('label', '');
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label');
    expect(label).toBeNull();
  });

  it('should not render error when error is empty', () => {
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('[role="alert"]');
    expect(error).toBeNull();
  });

  it('onDateChange from DOM change event should update value', () => {
    const spy = vi.fn();
    component.registerOnChange(spy);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '2026-07-01';
    input.dispatchEvent(new Event('change'));
    expect(component.value).toBe('2026-07-01');
    expect(spy).toHaveBeenCalledWith('2026-07-01');
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle label from provided to empty (destroys label block)', () => {
      expect(fixture.nativeElement.querySelector('label')).toBeTruthy();

      fixture.componentRef.setInput('label', '');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('label')).toBeNull();
    });

    it('should toggle label from empty to provided (creates label block)', () => {
      fixture.componentRef.setInput('label', '');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('label')).toBeNull();

      fixture.componentRef.setInput('label', 'Due Date');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('label')).toBeTruthy();
    });

    it('should toggle error from empty to provided (creates error block)', () => {
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();

      fixture.componentRef.setInput('error', 'Required');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    });

    it('should toggle error from provided to empty (destroys error block)', () => {
      fixture.componentRef.setInput('error', 'Required');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();

      fixture.componentRef.setInput('error', '');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('should update min constraint when min input changes', () => {
      fixture.componentRef.setInput('min', '2026-06-01');
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.min).toBe('2026-06-01');
    });

    it('should update max constraint when max input changes', () => {
      fixture.componentRef.setInput('max', '2026-09-30');
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.max).toBe('2026-09-30');
    });
  });
});
