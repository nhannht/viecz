import { Component, input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Date picker using native `<input type="date">` with nhannht-metro styling.
 *
 * Implements `ControlValueAccessor` for Angular reactive forms.
 * Values are ISO date strings (`YYYY-MM-DD`). Supports `min` and `max`
 * constraints. Uses the browser's native date picker UI.
 *
 * Replaces `MatDatepicker` + `MatDatepickerInput` + `MatNativeDateModule`
 * from Angular Material.
 *
 * @example
 * ```html
 * <nhannht-metro-datepicker label="Deadline" min="2026-01-01"
 *   [formControl]="deadlineCtrl"
 *   [error]="deadlineCtrl.hasError('required') ? 'Deadline is required' : ''" />
 * ```
 */
@Component({
  selector: 'nhannht-metro-datepicker',
  standalone: true,
  template: `
    <div class="flex flex-col gap-1">
      @if (label()) {
        <label class="font-display text-[10px] tracking-[1px] text-fg" [for]="dateId()">
          {{ label() }}
        </label>
      }
      <input
        type="date"
        class="w-full px-4 py-3 bg-card border border-border font-body text-[13px] text-fg
               focus:border-fg focus:outline-none transition-colors duration-200 cursor-pointer"
        [id]="dateId()"
        [disabled]="isDisabled"
        [value]="value"
        [min]="min()"
        [max]="max()"
        [attr.aria-label]="label()"
        (change)="onDateChange($event)" />
      @if (error()) {
        <span class="font-body text-[11px] text-red-600 font-semibold" role="alert">
          {{ error() }}
        </span>
      }
    </div>
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NhannhtMetroDatepickerComponent), multi: true },
  ],
})
export class NhannhtMetroDatepickerComponent implements ControlValueAccessor {
  /** Label text in display font above the date input. */
  label = input('');

  /** Error message displayed below the input. */
  error = input('');

  /** Minimum selectable date in `YYYY-MM-DD` format. */
  min = input('');

  /** Maximum selectable date in `YYYY-MM-DD` format. */
  max = input('');

  /** HTML `id` attribute. Auto-generated if not provided. */
  dateId = input('nhannht-date-' + Math.random().toString(36).slice(2, 8));

  value = '';
  isDisabled = false;
  private onChange: (val: string) => void = () => {};

  onDateChange(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.value = val;
    this.onChange(val);
  }

  writeValue(val: string): void {
    this.value = val ?? '';
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {}

  setDisabledState(disabled: boolean): void {
    this.isDisabled = disabled;
  }
}
