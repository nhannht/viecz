import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VieczTextareaComponent } from './viecz-textarea.component';

describe('VieczTextareaComponent', () => {
  let fixture: ComponentFixture<VieczTextareaComponent>;
  let component: VieczTextareaComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VieczTextareaComponent] }).compileComponents();
    fixture = TestBed.createComponent(VieczTextareaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Description');
    fixture.componentRef.setInput('placeholder', 'Enter text');
    fixture.componentRef.setInput('rows', 6);
    fixture.componentRef.setInput('textareaId', 'test-textarea');
    fixture.detectChanges();
  });

  it('should render textarea with correct rows', () => {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.rows).toBe(6);
  });

  it('writeValue should set value', () => {
    component.writeValue('Hello world');
    expect(component.value).toBe('Hello world');
  });

  it('registerOnChange: input event should call onChange', () => {
    const spy = vi.fn();
    component.registerOnChange(spy);
    component.onInput({ target: { value: 'new text' } } as any);
    expect(spy).toHaveBeenCalledWith('new text');
    expect(component.value).toBe('new text');
  });

  it('registerOnTouched: blur event should call onTouched callback', () => {
    const spy = vi.fn();
    component.registerOnTouched(spy);
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.dispatchEvent(new Event('blur'));
    expect(spy).toHaveBeenCalled();
  });

  it('writeValue should handle null gracefully', () => {
    component.writeValue(null as any);
    expect(component.value).toBe('');
  });

  it('setDisabledState(true) should disable the textarea', () => {
    component.setDisabledState(true);
    expect(component.isDisabled).toBe(true);
  });

  it('setDisabledState(false) should re-enable the textarea', () => {
    component.setDisabledState(true);
    component.setDisabledState(false);
    expect(component.isDisabled).toBe(false);
  });

  it('should render disabled textarea in DOM when disabled', () => {
    component.setDisabledState(true);
    fixture.changeDetectorRef.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });

  it('should render enabled textarea in DOM when not disabled', () => {
    component.setDisabledState(false);
    fixture.changeDetectorRef.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(false);
  });

  it('should render label when provided', () => {
    const label = fixture.nativeElement.querySelector('label');
    expect(label).toBeTruthy();
    expect(label.textContent.trim()).toBe('Description');
  });

  it('should not render label when empty', () => {
    fixture.componentRef.setInput('label', '');
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label');
    expect(label).toBeNull();
  });

  it('should show error message when error is set', () => {
    fixture.componentRef.setInput('error', 'Too short');
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('[role="alert"]');
    expect(error).toBeTruthy();
    expect(error.textContent.trim()).toBe('Too short');
  });

  it('should not show error when error is empty', () => {
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('[role="alert"]');
    expect(error).toBeNull();
  });

  it('should set aria-invalid when error is present', () => {
    fixture.componentRef.setInput('error', 'Error');
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
  });

  it('should not set aria-invalid when error is empty', () => {
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.getAttribute('aria-invalid')).toBeNull();
  });

  it('should use aria-label from label when label is set', () => {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.getAttribute('aria-label')).toBe('Description');
  });

  it('should use aria-label from placeholder when label is empty', () => {
    fixture.componentRef.setInput('label', '');
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.getAttribute('aria-label')).toBe('Enter text');
  });

  it('onInput from DOM should update value and call onChange', () => {
    const spy = vi.fn();
    component.registerOnChange(spy);
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'dom input';
    textarea.dispatchEvent(new Event('input'));
    expect(component.value).toBe('dom input');
    expect(spy).toHaveBeenCalledWith('dom input');
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

      fixture.componentRef.setInput('label', 'Notes');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('label')).toBeTruthy();
    });

    it('should toggle error from empty to provided (creates error block)', () => {
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();

      fixture.componentRef.setInput('error', 'Too short');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    });

    it('should toggle error from provided to empty (destroys error block)', () => {
      fixture.componentRef.setInput('error', 'Too short');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();

      fixture.componentRef.setInput('error', '');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('should update rows when rows input changes', () => {
      fixture.componentRef.setInput('rows', 3);
      fixture.detectChanges();
      expect((fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement).rows).toBe(3);

      fixture.componentRef.setInput('rows', 10);
      fixture.detectChanges();
      expect((fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement).rows).toBe(10);
    });

    it('should toggle disabled state from false to true and back', () => {
      component.setDisabledState(false);
      fixture.changeDetectorRef.detectChanges();
      expect((fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement).disabled).toBe(false);

      component.setDisabledState(true);
      fixture.changeDetectorRef.detectChanges();
      expect((fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement).disabled).toBe(true);
    });
  });
});
