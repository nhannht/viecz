import { Component, input, output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Single-line text input with label and error display.
 *
 * Implements `ControlValueAccessor` for Angular reactive forms and `ngModel`.
 * Label uses `--font-display` at 10px. Input uses `--font-body` at 13px.
 * Border transitions from `--border` to `--fg` on focus.
 *
 * Replaces `MatFormField` + `MatInput` + `MatLabel` + `MatError` from Angular Material.
 *
 * Accessibility: links label via `for`/`id`, sets `aria-invalid` and
 * `aria-describedby` when an error is present, error uses `role="alert"`.
 *
 * @example
 * ```html
 * <nhannht-metro-input label="Email" placeholder="you@example.com" type="email"
 *   [formControl]="emailCtrl" [error]="emailCtrl.hasError('required') ? 'Required' : ''" />
 * ```
 */
@Component({
  selector: 'nhannht-metro-input',
  standalone: true,
  template: `
    <div class="flex flex-col gap-1">
      @if (label()) {
        <label class="font-display text-[10px] tracking-[1px] text-fg" [for]="inputId()">
          {{ label() }}
        </label>
      }
      <input
        class="w-full px-4 py-3 bg-card font-body text-[13px] text-fg
               placeholder:text-muted focus:outline-none transition-colors duration-200"
        [class.border]="true"
        [class.border-border]="!error()"
        [class.focus:border-fg]="!error()"
        [class.border-red-600]="!!error()"
        [id]="inputId()"
        [type]="type()"
        [placeholder]="placeholder()"
        [disabled]="isDisabled"
        [value]="value"
        [attr.step]="step()"
        [attr.min]="min()"
        [attr.aria-label]="label() || placeholder()"
        [attr.aria-invalid]="error() ? true : null"
        [attr.aria-describedby]="error() ? inputId() + '-error' : null"
        (input)="onInput($event)"
        (blur)="onTouched()" />
      @if (error()) {
        <span class="font-body text-[11px] text-red-600 font-semibold" [id]="inputId() + '-error'" role="alert">
          {{ error() }}
        </span>
      }
    </div>
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NhannhtMetroInputComponent), multi: true },
  ],
})
export class NhannhtMetroInputComponent implements ControlValueAccessor {
  /** Label text rendered above the input in display font. Empty string hides the label. */
  label = input('');

  /** Placeholder text shown when input is empty. */
  placeholder = input('');

  /** HTML input type. */
  type = input<'text' | 'email' | 'password' | 'number' | 'tel' | 'url'>('text');

  /** Step value for number inputs (e.g. 1000 for VND). */
  step = input<string | number | undefined>(undefined);

  /** Minimum value for number inputs. */
  min = input<string | number | undefined>(undefined);

  /** Error message. When non-empty, displays below the input and sets `aria-invalid`. */
  error = input('');

  /** HTML `id` attribute. Auto-generated if not provided. Used to link `<label>` and error. */
  inputId = input('nhannht-input-' + Math.random().toString(36).slice(2, 8));

  value = '';
  isDisabled = false;
  private onChange: (val: string) => void = () => {};
  onTouched: () => void = () => {};

  onInput(event: Event) {
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

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled = disabled;
  }
}
