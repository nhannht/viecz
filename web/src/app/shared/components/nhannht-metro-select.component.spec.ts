import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NhannhtMetroSelectComponent } from './nhannht-metro-select.component';

describe('NhannhtMetroSelectComponent', () => {
  let fixture: ComponentFixture<NhannhtMetroSelectComponent>;
  let component: NhannhtMetroSelectComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NhannhtMetroSelectComponent] }).compileComponents();
    fixture = TestBed.createComponent(NhannhtMetroSelectComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Category');
    fixture.componentRef.setInput('placeholder', 'Pick one');
    fixture.componentRef.setInput('options', [
      { value: 'dev', label: 'Development' },
      { value: 'design', label: 'Design' },
    ]);
    fixture.componentRef.setInput('selectId', 'test-select');
    fixture.detectChanges();
  });

  it('should render options', () => {
    const options = fixture.nativeElement.querySelectorAll('option');
    expect(options.length).toBe(3); // 1 placeholder + 2 options
    expect(options[1].textContent.trim()).toBe('Development');
    expect(options[2].textContent.trim()).toBe('Design');
  });

  it('should render placeholder as disabled option', () => {
    const placeholder = fixture.nativeElement.querySelector('option[disabled]');
    expect(placeholder).toBeTruthy();
    expect(placeholder.textContent.trim()).toBe('Pick one');
  });

  it('registerOnChange: change event should call onChange', () => {
    const spy = vi.fn();
    component.registerOnChange(spy);
    component.onSelect({ target: { value: 'design' } } as any);
    expect(spy).toHaveBeenCalledWith('design');
    expect(component.value).toBe('design');
  });

  it('should show error message', () => {
    fixture.componentRef.setInput('error', 'Required');
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('[role="alert"]');
    expect(error).toBeTruthy();
    expect(error.textContent.trim()).toBe('Required');
  });

  it('setDisabledState should disable the select', () => {
    component.setDisabledState(true);
    expect(component.isDisabled).toBe(true);
  });

  it('setDisabledState(false) should re-enable the select', () => {
    component.setDisabledState(true);
    component.setDisabledState(false);
    expect(component.isDisabled).toBe(false);
  });

  it('should render disabled select element in DOM when disabled', () => {
    component.setDisabledState(true);
    fixture.changeDetectorRef.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });

  it('writeValue should set value', () => {
    component.writeValue('dev');
    expect(component.value).toBe('dev');
  });

  it('writeValue should handle null gracefully', () => {
    component.writeValue(null as any);
    expect(component.value).toBe('');
  });

  it('registerOnTouched should be callable', () => {
    const spy = vi.fn();
    component.registerOnTouched(spy);
    // registerOnTouched is a no-op in this component, just verifies it exists
  });

  it('should render label when provided', () => {
    const label = fixture.nativeElement.querySelector('label');
    expect(label).toBeTruthy();
    expect(label.textContent.trim()).toBe('Category');
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

  it('should not render placeholder option when placeholder is empty', () => {
    fixture.componentRef.setInput('placeholder', '');
    fixture.detectChanges();
    const disabledOpt = fixture.nativeElement.querySelector('option[disabled]');
    expect(disabledOpt).toBeNull();
    // Only the 2 real options remain
    const options = fixture.nativeElement.querySelectorAll('option');
    expect(options.length).toBe(2);
  });

  it('should apply border-red-600 class on select when error is set', () => {
    fixture.componentRef.setInput('error', 'Required');
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select.classList.contains('border-red-600')).toBe(true);
  });

  it('onSelect should update value and call onChange via DOM change event', () => {
    const spy = vi.fn();
    component.registerOnChange(spy);
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'design';
    select.dispatchEvent(new Event('change'));
    expect(component.value).toBe('design');
    expect(spy).toHaveBeenCalledWith('design');
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

      fixture.componentRef.setInput('label', 'Type');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('label')).toBeTruthy();
    });

    it('should toggle error from empty to provided (creates error block)', () => {
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();

      fixture.componentRef.setInput('error', 'Select a value');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    });

    it('should toggle error from provided to empty (destroys error block)', () => {
      fixture.componentRef.setInput('error', 'Select a value');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();

      fixture.componentRef.setInput('error', '');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('should toggle placeholder from provided to empty (destroys placeholder option)', () => {
      expect(fixture.nativeElement.querySelector('option[disabled]')).toBeTruthy();

      fixture.componentRef.setInput('placeholder', '');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('option[disabled]')).toBeNull();
    });

    it('should toggle placeholder from empty to provided (creates placeholder option)', () => {
      fixture.componentRef.setInput('placeholder', '');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('option[disabled]')).toBeNull();

      fixture.componentRef.setInput('placeholder', 'Choose...');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('option[disabled]')).toBeTruthy();
    });

    it('should update options when options input changes', () => {
      fixture.componentRef.setInput('options', [{ value: 'a', label: 'Option A' }]);
      fixture.detectChanges();
      const options = fixture.nativeElement.querySelectorAll('option:not([disabled])');
      expect(options.length).toBe(1);
      expect(options[0].textContent.trim()).toBe('Option A');
    });

    it('should toggle disabled from false to true and back', () => {
      component.setDisabledState(false);
      fixture.changeDetectorRef.detectChanges();
      expect((fixture.nativeElement.querySelector('select') as HTMLSelectElement).disabled).toBe(false);

      component.setDisabledState(true);
      fixture.changeDetectorRef.detectChanges();
      expect((fixture.nativeElement.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
    });
  });
});
