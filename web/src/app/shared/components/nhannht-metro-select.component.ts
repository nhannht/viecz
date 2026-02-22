import { Component, input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Dropdown select using a native `<select>` element with custom styling.
 *
 * Implements `ControlValueAccessor` for Angular reactive forms.
 * Uses `appearance: none` to remove browser chrome and applies nhannht-metro
 * border/font styling. Options are passed as an array of `{ value, label }`.
 *
 * Replaces `MatSelect` + `MatOption` from Angular Material.
 *
 * @example
 * ```html
 * <nhannht-metro-select
 *   label="Category"
 *   placeholder="Select a category"
 *   [options]="[{ value: 'dev', label: 'Development' }, { value: 'design', label: 'Design' }]"
 *   [formControl]="categoryCtrl" />
 * ```
 */
@Component({
  selector: 'nhannht-metro-select',
  standalone: true,
  template: `
    <div class="flex flex-col gap-1">
      @if (label()) {
        <label class="font-display text-[10px] tracking-[1px] text-fg" [for]="selectId()">
          {{ label() }}
        </label>
      }
      <select
        class="w-full px-4 py-3 bg-card font-body text-[13px] text-fg
               focus:outline-none transition-colors duration-200
               appearance-none cursor-pointer"
        [class.border]="true"
        [class.border-border]="!error()"
        [class.focus:border-fg]="!error()"
        [class.border-red-600]="!!error()"
        [id]="selectId()"
        [disabled]="isDisabled"
        [value]="value"
        [attr.aria-label]="label()"
        (change)="onSelect($event)">
        @if (placeholder()) {
          <option value="" disabled [selected]="!value">{{ placeholder() }}</option>
        }
        @for (opt of options(); track opt.value) {
          <option [value]="opt.value">{{ opt.label }}</option>
        }
      </select>
      @if (error()) {
        <span class="font-body text-[11px] text-red-600 font-semibold" role="alert">
          {{ error() }}
        </span>
      }
    </div>
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NhannhtMetroSelectComponent), multi: true },
  ],
})
export class NhannhtMetroSelectComponent implements ControlValueAccessor {
  /** Label text in display font above the select. */
  label = input('');

  /** Placeholder shown as a disabled first option. */
  placeholder = input('');

  /** Available options. Each must have a `value` (form value) and `label` (display text). */
  options = input<{ value: string; label: string }[]>([]);

  /** Error message displayed below the select. */
  error = input('');

  /** HTML `id` attribute. Auto-generated if not provided. */
  selectId = input('nhannht-select-' + Math.random().toString(36).slice(2, 8));

  value = '';
  isDisabled = false;
  private onChange: (val: string) => void = () => {};

  onSelect(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
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
