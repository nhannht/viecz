import { Component, input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Multi-line text input with label and error display.
 *
 * Implements `ControlValueAccessor` for Angular reactive forms and `ngModel`.
 * Vertically resizable with a minimum height of 100px.
 * Shares the same visual language as `VieczInputComponent`.
 *
 * Replaces `MatFormField` + `<textarea matInput>` from Angular Material.
 *
 * @example
 * ```html
 * <viecz-textarea label="Description" placeholder="Describe the task..."
 *   [rows]="6" [formControl]="descCtrl" />
 * ```
 */
@Component({
  selector: 'viecz-textarea',
  standalone: true,
  template: `
    <div class="flex flex-col gap-1">
      @if (label()) {
        <label class="font-display text-[10px] tracking-[1px] text-fg" [for]="textareaId()">
          {{ label() }}
        </label>
      }
      <textarea
        class="w-full px-4 py-3 bg-card border border-border font-body text-[13px] text-fg
               placeholder:text-muted focus:border-fg focus:outline-none transition-colors duration-200
               resize-y min-h-[100px]"
        [id]="textareaId()"
        [placeholder]="placeholder()"
        [rows]="rows()"
        [disabled]="isDisabled"
        [value]="value"
        [attr.aria-label]="label() || placeholder()"
        [attr.aria-invalid]="error() ? true : null"
        (input)="onInput($event)"
        (blur)="onTouched()"></textarea>
      @if (error()) {
        <span class="font-body text-[11px] text-fg" role="alert">
          {{ error() }}
        </span>
      }
    </div>
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => VieczTextareaComponent), multi: true },
  ],
})
export class VieczTextareaComponent implements ControlValueAccessor {
  /** Label text rendered above the textarea in display font. */
  label = input('');

  /** Placeholder text shown when textarea is empty. */
  placeholder = input('');

  /** Number of visible text rows. Controls initial height. */
  rows = input(4);

  /** Error message displayed below the textarea. */
  error = input('');

  /** HTML `id` attribute. Auto-generated if not provided. */
  textareaId = input('nhannht-textarea-' + Math.random().toString(36).slice(2, 8));

  value = '';
  isDisabled = false;
  private onChange: (val: string) => void = () => {};
  onTouched: () => void = () => {};

  onInput(event: Event) {
    const val = (event.target as HTMLTextAreaElement).value;
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
