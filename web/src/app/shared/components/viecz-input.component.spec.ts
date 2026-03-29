import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VieczInputComponent } from './viecz-input.component';

describe('VieczInputComponent', () => {
  let fixture: ComponentFixture<VieczInputComponent>;
  let component: VieczInputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VieczInputComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(VieczInputComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Email');
    fixture.componentRef.setInput('placeholder', 'you@example.com');
    fixture.componentRef.setInput('inputId', 'test-input');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('writeValue should set value for string', () => {
    component.writeValue('hello@test.com');
    expect(component.value).toBe('hello@test.com');
  });

  it('writeValue should handle null gracefully', () => {
    component.writeValue(null as any);
    expect(component.value).toBe('');
  });

  it('registerOnChange: input event should call onChange callback', () => {
    const spy = vi.fn();
    component.registerOnChange(spy);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'new-value';
    input.dispatchEvent(new Event('input'));
    expect(spy).toHaveBeenCalledWith('new-value');
  });

  it('registerOnTouched: blur event should call onTouched callback', () => {
    const spy = vi.fn();
    component.registerOnTouched(spy);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    expect(spy).toHaveBeenCalled();
  });

  it('setDisabledState should disable the input', () => {
    component.setDisabledState(true);
    expect(component.isDisabled).toBe(true);
  });

  it('setDisabledState false should enable the input', () => {
    component.setDisabledState(true);
    component.setDisabledState(false);
    expect(component.isDisabled).toBe(false);
  });

  it('should render label when provided', () => {
    const label = fixture.nativeElement.querySelector('label');
    expect(label).toBeTruthy();
    expect(label.textContent.trim()).toBe('Email');
  });

  it('should not render label when empty', () => {
    fixture.componentRef.setInput('label', '');
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label');
    expect(label).toBeNull();
  });

  it('should show error message and set aria-invalid', () => {
    fixture.componentRef.setInput('error', 'Required');
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('[role="alert"]');
    expect(error).toBeTruthy();
    expect(error.textContent.trim()).toBe('Required');
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('should not show error when error is empty', () => {
    const error = fixture.nativeElement.querySelector('[role="alert"]');
    expect(error).toBeNull();
  });

  it('onInput should update internal value and call onChange', () => {
    const spy = vi.fn();
    component.registerOnChange(spy);
    component.onInput({ target: { value: 'typed' } } as any);
    expect(component.value).toBe('typed');
    expect(spy).toHaveBeenCalledWith('typed');
  });

  it('should render input with type email when set', () => {
    fixture.componentRef.setInput('type', 'email');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('email');
  });

  it('should render input with type password when set', () => {
    fixture.componentRef.setInput('type', 'password');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('password');
  });

  it('should set aria-describedby when error is present', () => {
    fixture.componentRef.setInput('error', 'Invalid');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-describedby')).toBe('test-input-error');
  });

  it('should not set aria-describedby when no error', () => {
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });

  it('should not set aria-invalid when no error', () => {
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('should render disabled input when setDisabledState(true) is called', () => {
    component.setDisabledState(true);
    fixture.changeDetectorRef.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('should render enabled input when setDisabledState(false) after disable', () => {
    component.setDisabledState(true);
    fixture.changeDetectorRef.detectChanges();
    component.setDisabledState(false);
    fixture.changeDetectorRef.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(false);
  });

  it('should fire onInput from DOM input event', () => {
    const spy = vi.fn();
    component.registerOnChange(spy);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'dom-typed';
    input.dispatchEvent(new Event('input'));
    expect(component.value).toBe('dom-typed');
    expect(spy).toHaveBeenCalledWith('dom-typed');
  });

  it('should fire onTouched from DOM blur event', () => {
    const spy = vi.fn();
    component.registerOnTouched(spy);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    expect(spy).toHaveBeenCalled();
  });

  it('should apply border-red-600 class when error is set', () => {
    fixture.componentRef.setInput('error', 'Invalid');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.classList.contains('border-red-600')).toBe(true);
  });

  it('should use aria-label from label when label is set', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe('Email');
  });

  it('should use aria-label from placeholder when label is empty', () => {
    fixture.componentRef.setInput('label', '');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe('you@example.com');
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

      fixture.componentRef.setInput('label', 'Name');
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

    it('should toggle type from text to password', () => {
      fixture.componentRef.setInput('type', 'password');
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.type).toBe('password');

      fixture.componentRef.setInput('type', 'text');
      fixture.detectChanges();
      expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).type).toBe('text');
    });

    it('should toggle disabled state from false to true and back', () => {
      component.setDisabledState(false);
      fixture.changeDetectorRef.detectChanges();
      expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).disabled).toBe(false);

      component.setDisabledState(true);
      fixture.changeDetectorRef.detectChanges();
      expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).disabled).toBe(true);
    });

    it('should toggle label→error→label covering both @if blocks in sequence', () => {
      // Start with label, no error
      expect(fixture.nativeElement.querySelector('label')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();

      // Add error
      fixture.componentRef.setInput('error', 'Bad value');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();

      // Remove error, remove label
      fixture.componentRef.setInput('error', '');
      fixture.componentRef.setInput('label', '');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('label')).toBeNull();

      // Add label back
      fixture.componentRef.setInput('label', 'Phone');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('label')).toBeTruthy();
    });

    it('should apply border-border class when no error', () => {
      fixture.componentRef.setInput('error', '');
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.classList.contains('border-border')).toBe(true);
      expect(input.classList.contains('border-red-600')).toBe(false);
    });

    it('should toggle border classes when error toggles', () => {
      // No error → border-border
      fixture.componentRef.setInput('error', '');
      fixture.detectChanges();
      let input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.classList.contains('border-border')).toBe(true);

      // Error → border-red-600
      fixture.componentRef.setInput('error', 'Invalid');
      fixture.detectChanges();
      input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.classList.contains('border-red-600')).toBe(true);

      // No error again → border-border
      fixture.componentRef.setInput('error', '');
      fixture.detectChanges();
      input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.classList.contains('border-border')).toBe(true);
    });

    it('should set step and min attributes on input', () => {
      fixture.componentRef.setInput('step', 1000);
      fixture.componentRef.setInput('min', 2000);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.getAttribute('step')).toBe('1000');
      expect(input.getAttribute('min')).toBe('2000');
    });

    it('should render number type input', () => {
      fixture.componentRef.setInput('type', 'number');
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.type).toBe('number');
    });

    it('should render tel type input', () => {
      fixture.componentRef.setInput('type', 'tel');
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.type).toBe('tel');
    });
  });
});
