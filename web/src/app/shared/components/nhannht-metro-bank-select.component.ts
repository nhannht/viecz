import { Component, input, forwardRef, signal, computed, ElementRef, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { VietQRBank } from '../../core/bank-list';

@Component({
  selector: 'nhannht-metro-bank-select',
  standalone: true,
  template: `
    <div class="flex flex-col gap-1">
      @if (label()) {
        <label class="font-display text-[10px] tracking-[1px] text-fg">
          {{ label() }}
        </label>
      }
      <div class="relative">
        <button type="button"
          class="w-full border bg-card font-body text-[13px] text-fg
                 px-3 py-2 text-left flex items-center gap-2 cursor-pointer
                 focus:outline-none transition-colors duration-200"
          [class.border-fg]="open()"
          [class.border-border]="!open() && !error()"
          [class.border-red-600]="!!error()"
          [disabled]="isDisabled"
          (click)="toggle()">
          @if (selectedBank()) {
            <img [src]="selectedBank()!.logo" [alt]="selectedBank()!.shortName"
              class="w-8 h-5 object-contain flex-shrink-0" />
            <span class="truncate">{{ selectedBank()!.shortName }} &mdash; {{ selectedBank()!.code }}</span>
          } @else {
            <span class="text-muted">{{ placeholder() }}</span>
          }
          <span class="ml-auto text-muted">&#9662;</span>
        </button>
        @if (open()) {
          <div class="absolute z-50 left-0 right-0 mt-1 border border-border bg-card max-h-60 overflow-y-auto"
            role="listbox">
            @for (bank of banks(); track bank.bin) {
              <button type="button"
                class="w-full px-3 py-2 flex items-center gap-2 hover:bg-bg
                       text-left cursor-pointer font-body text-[13px]"
                role="option"
                [attr.aria-selected]="bank.bin === value()"
                (click)="select(bank)">
                <img [src]="bank.logo" [alt]="bank.shortName"
                  class="w-8 h-5 object-contain flex-shrink-0" />
                <span class="font-semibold text-[12px]">{{ bank.shortName }}</span>
                <span class="text-muted text-[11px] truncate">{{ bank.name }}</span>
              </button>
            }
          </div>
        }
      </div>
      @if (error()) {
        <span class="font-body text-[11px] text-red-600 font-semibold" role="alert">
          {{ error() }}
        </span>
      }
    </div>
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NhannhtMetroBankSelectComponent), multi: true },
  ],
})
export class NhannhtMetroBankSelectComponent implements ControlValueAccessor {
  label = input('');
  placeholder = input('');
  banks = input<VietQRBank[]>([]);
  error = input('');

  open = signal(false);
  value = signal('');
  isDisabled = false;
  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  selectedBank = computed(() => {
    const v = this.value();
    if (!v) return null;
    return this.banks().find(b => b.bin === v) ?? null;
  });

  constructor(private el: ElementRef) {}

  toggle() {
    if (this.isDisabled) return;
    this.open.update(v => !v);
  }

  select(bank: VietQRBank) {
    this.value.set(bank.bin);
    this.onChange(bank.bin);
    this.onTouched();
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.open() && !this.el.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.open()) {
      this.open.set(false);
    }
  }

  writeValue(val: string): void {
    this.value.set(val ?? '');
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
