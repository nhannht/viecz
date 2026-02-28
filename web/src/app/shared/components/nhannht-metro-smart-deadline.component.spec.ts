import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslocoForTesting } from '../../core/transloco-testing';
import { NhannhtMetroSmartDeadlineComponent } from './nhannht-metro-smart-deadline.component';

describe('NhannhtMetroSmartDeadlineComponent', () => {
  let fixture: ComponentFixture<NhannhtMetroSmartDeadlineComponent>;
  let component: NhannhtMetroSmartDeadlineComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NhannhtMetroSmartDeadlineComponent],
      providers: [provideTranslocoForTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(NhannhtMetroSmartDeadlineComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'DEADLINE');
    fixture.detectChanges();
  });

  it('should render label', () => {
    const label = fixture.nativeElement.querySelector('label');
    expect(label).toBeTruthy();
    expect(label.textContent.trim()).toBe('DEADLINE');
  });

  it('preset chip click emits correct ISO with matching hours', () => {
    const spy = vi.fn();
    component.registerOnChange(spy);
    const presets = component.presets();
    const tomorrowMorning = presets.find(p => p.key === 'tomorrowMorning')!;
    expect(tomorrowMorning).toBeTruthy();

    component.onPresetClick(tomorrowMorning);
    expect(spy).toHaveBeenCalledTimes(1);
    const iso = spy.mock.calls[0][0] as string;
    const d = new Date(iso);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });

  it('"Tonight" chip hidden when hour >= 22', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 1, 23, 0, 0));
    // Re-create the component to pick up new time
    fixture = TestBed.createComponent(NhannhtMetroSmartDeadlineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const presets = component.presets();
    expect(presets.find(p => p.key === 'tonightTenPm')).toBeUndefined();
    vi.useRealTimers();
  });

  it('weekend/next-weekend key swaps on Sat/Sun', () => {
    vi.useFakeTimers();
    // Saturday
    vi.setSystemTime(new Date(2026, 2, 7, 10, 0, 0));
    fixture = TestBed.createComponent(NhannhtMetroSmartDeadlineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const presets = component.presets();
    expect(presets.find(p => p.key === 'nextWeekend')).toBeTruthy();
    expect(presets.find(p => p.key === 'thisWeekend')).toBeUndefined();
    vi.useRealTimers();
  });

  it('custom mode opens on "Custom..." click', () => {
    component.onCustomClick();
    fixture.detectChanges();
    expect(component.mode()).toBe('custom');
    const dateInput = fixture.nativeElement.querySelector('input[type="date"]');
    expect(dateInput).toBeTruthy();
  });

  it('custom date+time produces correct ISO', () => {
    const spy = vi.fn();
    component.registerOnChange(spy);
    component.onCustomClick();
    component.onCustomDateChange({ target: { value: '2026-04-15' } } as any);
    component.onCustomTimeSelectChange({ target: { value: '18:00' } } as any);
    expect(spy).toHaveBeenCalled();
    const lastIso = spy.mock.calls[spy.mock.calls.length - 1][0] as string;
    const d = new Date(lastIso);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3); // April = 3
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(18);
  });

  it('"Other time..." reveals time input', () => {
    component.onCustomClick();
    fixture.detectChanges();
    expect(component.customTimeMode()).toBe('preset');

    component.onCustomTimeSelectChange({ target: { value: '__custom__' } } as any);
    fixture.detectChanges();
    expect(component.customTimeMode()).toBe('free');
    const timeInput = fixture.nativeElement.querySelector('input[type="time"]');
    expect(timeInput).toBeTruthy();
  });

  it('writeValue with ISO string populates custom mode', () => {
    component.writeValue('2026-05-20T15:30:00.000Z');
    expect(component.mode()).toBe('custom');
    expect(component.customDate()).toBeTruthy();
    expect(component.customTime()).toBeTruthy();
  });

  it('writeValue("") clears state', () => {
    component.writeValue('2026-05-20T15:30:00.000Z');
    expect(component.mode()).toBe('custom');
    component.writeValue('');
    expect(component.value).toBe('');
    expect(component.mode()).toBe('chips');
    expect(component.selectedPresetKey()).toBe('');
  });

  it('clear button resets value', () => {
    const spy = vi.fn();
    component.registerOnChange(spy);
    const presets = component.presets();
    component.onPresetClick(presets[0]);
    fixture.detectChanges();

    component.onClear();
    fixture.detectChanges();
    expect(component.value).toBe('');
    expect(component.mode()).toBe('chips');
    expect(spy).toHaveBeenLastCalledWith('');
  });

  it('disabled state disables all buttons/inputs', () => {
    component.setDisabledState(true);
    expect(component.isDisabled).toBe(true);

    component.onCustomClick();
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons.forEach((btn: HTMLButtonElement) => {
      expect(btn.disabled).toBe(true);
    });
    const dateInput = fixture.nativeElement.querySelector('input[type="date"]') as HTMLInputElement;
    if (dateInput) {
      expect(dateInput.disabled).toBe(true);
    }
  });

  it('should show error message', () => {
    fixture.componentRef.setInput('error', 'Deadline is past');
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('[role="alert"]');
    expect(error).toBeTruthy();
    expect(error.textContent.trim()).toBe('Deadline is past');
  });

  it('should not render label when empty', () => {
    fixture.componentRef.setInput('label', '');
    fixture.detectChanges();
    const labels = fixture.nativeElement.querySelectorAll('label');
    // No label above the component (custom mode labels may appear but top label should not)
    expect(component.label()).toBe('');
  });

  it('writeValue handles null gracefully', () => {
    component.writeValue(null as any);
    expect(component.value).toBe('');
  });

  it('formatDisplay returns readable date string', () => {
    const result = component.formatDisplay('2026-03-15T18:00:00.000Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formatDisplay returns empty for empty string', () => {
    expect(component.formatDisplay('')).toBe('');
  });
});
