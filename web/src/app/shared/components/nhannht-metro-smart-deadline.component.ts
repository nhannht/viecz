import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

interface DeadlinePreset {
  key: string;
  translationKey: string;
  date: Date;
}

/**
 * Smart deadline picker with preset time chips and a custom date+time fallback.
 *
 * Implements `ControlValueAccessor`. Values are full ISO datetime strings
 * (e.g. `2026-03-01T22:00:00.000Z`) or empty string for no deadline.
 *
 * Preset chips offer common deadlines relative to "now" (Tonight 10PM,
 * Tomorrow 9AM, etc.). A "Custom..." chip reveals a date input + time
 * select for arbitrary datetime selection.
 *
 * @example
 * ```html
 * <nhannht-metro-smart-deadline
 *   label="DEADLINE"
 *   [(ngModel)]="deadline"
 *   [error]="deadlineError" />
 * ```
 */
@Component({
  selector: 'nhannht-metro-smart-deadline',
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      <div class="flex flex-col gap-2">
        @if (label()) {
          <label class="font-display text-[10px] tracking-[1px] text-fg">
            {{ label() }}
          </label>
        }

        @if (value) {
          <div class="flex items-center justify-between px-4 py-2 bg-card border border-fg">
            <span class="font-body text-[13px] text-fg">{{ formatDisplay(value) }}</span>
            <button
              type="button"
              class="font-display text-[10px] tracking-[1px] text-muted hover:text-fg cursor-pointer transition-colors duration-200"
              [disabled]="isDisabled"
              (click)="onClear()">
              {{ t('smartDeadline.clear') }}
            </button>
          </div>
        }

        <div class="flex gap-2 flex-wrap font-body text-[13px]">
          @for (preset of presets(); track preset.key) {
            <button
              type="button"
              class="px-4 py-2 border cursor-pointer transition-all duration-200 whitespace-nowrap"
              [class]="selectedPresetKey() === preset.key ? 'bg-fg text-bg border-fg' : 'bg-transparent text-muted border-border hover:border-fg hover:text-fg'"
              [disabled]="isDisabled"
              (click)="onPresetClick(preset)">
              {{ t('smartDeadline.' + preset.translationKey) }}
            </button>
          }
          <button
            type="button"
            class="px-4 py-2 border cursor-pointer transition-all duration-200 whitespace-nowrap"
            [class]="mode() === 'custom' ? 'bg-fg text-bg border-fg' : 'bg-transparent text-muted border-border hover:border-fg hover:text-fg'"
            [disabled]="isDisabled"
            (click)="onCustomClick()">
            {{ t('smartDeadline.custom') }}
          </button>
        </div>

        @if (mode() === 'custom') {
          <div class="flex gap-3 items-end">
            <div class="flex flex-col gap-1 flex-1">
              <label class="font-display text-[10px] tracking-[1px] text-fg">
                {{ t('smartDeadline.date') }}
              </label>
              <input
                type="date"
                class="w-full px-4 py-3 bg-card border border-border font-body text-[13px] text-fg
                       focus:border-fg focus:outline-none transition-colors duration-200 cursor-pointer"
                [disabled]="isDisabled"
                [value]="customDate()"
                [min]="todayDate()"
                (change)="onCustomDateChange($event)" />
            </div>
            <div class="flex flex-col gap-1 flex-1">
              <label class="font-display text-[10px] tracking-[1px] text-fg">
                {{ t('smartDeadline.time') }}
              </label>
              @if (customTimeMode() === 'preset') {
                <select
                  class="w-full px-4 py-3 bg-card border border-border font-body text-[13px] text-fg
                         focus:border-fg focus:outline-none transition-colors duration-200 cursor-pointer"
                  [disabled]="isDisabled"
                  [value]="customTime()"
                  (change)="onCustomTimeSelectChange($event)">
                  <option value="09:00">{{ t('smartDeadline.morning9am') }}</option>
                  <option value="12:00">{{ t('smartDeadline.noon') }}</option>
                  <option value="15:00">{{ t('smartDeadline.afternoon3pm') }}</option>
                  <option value="18:00">{{ t('smartDeadline.evening6pm') }}</option>
                  <option value="21:00">{{ t('smartDeadline.night9pm') }}</option>
                  <option value="22:00">{{ t('smartDeadline.night10pm') }}</option>
                  <option value="23:00">{{ t('smartDeadline.night11pm') }}</option>
                  <option value="__custom__">{{ t('smartDeadline.customTime') }}</option>
                </select>
              } @else {
                <input
                  type="time"
                  class="w-full px-4 py-3 bg-card border border-border font-body text-[13px] text-fg
                         focus:border-fg focus:outline-none transition-colors duration-200 cursor-pointer"
                  [disabled]="isDisabled"
                  [value]="customTime()"
                  (change)="onCustomTimeInputChange($event)" />
              }
            </div>
          </div>
        }

        @if (error()) {
          <span class="font-body text-[11px] text-red-600 font-semibold" role="alert">
            {{ error() }}
          </span>
        }
      </div>
    </ng-container>
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NhannhtMetroSmartDeadlineComponent), multi: true },
  ],
})
export class NhannhtMetroSmartDeadlineComponent implements ControlValueAccessor {
  label = input('');
  error = input('');

  value = '';
  isDisabled = false;

  mode = signal<'chips' | 'custom'>('chips');
  selectedPresetKey = signal('');
  customDate = signal('');
  customTime = signal('09:00');
  customTimeMode = signal<'preset' | 'free'>('preset');

  todayDate = computed(() => {
    const now = new Date();
    return this.formatDateLocal(now);
  });

  presets = computed<DeadlinePreset[]>(() => {
    const now = new Date();
    const result: DeadlinePreset[] = [];

    if (now.getHours() < 22) {
      const tonight = new Date(now);
      tonight.setHours(22, 0, 0, 0);
      result.push({ key: 'tonightTenPm', translationKey: 'tonightTenPm', date: tonight });
    }

    const tomorrowMorning = new Date(now);
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(9, 0, 0, 0);
    result.push({ key: 'tomorrowMorning', translationKey: 'tomorrowMorning', date: tomorrowMorning });

    const tomorrowEvening = new Date(now);
    tomorrowEvening.setDate(tomorrowEvening.getDate() + 1);
    tomorrowEvening.setHours(18, 0, 0, 0);
    result.push({ key: 'tomorrowEvening', translationKey: 'tomorrowEvening', date: tomorrowEvening });

    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const saturday = new Date(now);
    if (isWeekend) {
      saturday.setDate(saturday.getDate() + (6 - dayOfWeek + 7) % 7 || 7);
    } else {
      saturday.setDate(saturday.getDate() + (6 - dayOfWeek));
    }
    saturday.setHours(18, 0, 0, 0);
    result.push({
      key: isWeekend ? 'nextWeekend' : 'thisWeekend',
      translationKey: isWeekend ? 'nextWeekend' : 'thisWeekend',
      date: saturday,
    });

    const monday = new Date(now);
    const daysUntilMonday = ((1 - dayOfWeek + 7) % 7) || 7;
    monday.setDate(monday.getDate() + daysUntilMonday);
    monday.setHours(18, 0, 0, 0);
    result.push({ key: 'nextWeek', translationKey: 'nextWeek', date: monday });

    return result;
  });

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  onPresetClick(preset: DeadlinePreset) {
    this.selectedPresetKey.set(preset.key);
    this.mode.set('chips');
    this.setValue(preset.date.toISOString());
  }

  onCustomClick() {
    this.selectedPresetKey.set('');
    this.mode.set('custom');
    if (!this.customDate()) {
      this.customDate.set(this.todayDate());
    }
    this.emitCustomValue();
  }

  onCustomDateChange(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.customDate.set(val);
    this.emitCustomValue();
  }

  onCustomTimeSelectChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    if (val === '__custom__') {
      this.customTimeMode.set('free');
      this.customTime.set('09:00');
    } else {
      this.customTime.set(val);
    }
    this.emitCustomValue();
  }

  onCustomTimeInputChange(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.customTime.set(val);
    this.emitCustomValue();
  }

  onClear() {
    this.selectedPresetKey.set('');
    this.mode.set('chips');
    this.customDate.set('');
    this.customTime.set('09:00');
    this.customTimeMode.set('preset');
    this.setValue('');
  }

  formatDisplay(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  writeValue(val: string): void {
    this.value = val ?? '';
    if (!this.value) {
      this.selectedPresetKey.set('');
      this.mode.set('chips');
      this.customDate.set('');
      this.customTime.set('09:00');
      this.customTimeMode.set('preset');
      return;
    }
    const d = new Date(this.value);
    if (isNaN(d.getTime())) return;
    this.mode.set('custom');
    this.customDate.set(this.formatDateLocal(d));
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    this.customTime.set(timeStr);
    const presetTimes = ['09:00', '12:00', '15:00', '18:00', '21:00', '22:00', '23:00'];
    if (presetTimes.includes(timeStr)) {
      this.customTimeMode.set('preset');
    } else {
      this.customTimeMode.set('free');
    }
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

  private setValue(iso: string) {
    this.value = iso;
    this.onChange(iso);
    this.onTouched();
  }

  private emitCustomValue() {
    const dateStr = this.customDate();
    const timeStr = this.customTime();
    if (!dateStr) {
      this.setValue('');
      return;
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
    this.setValue(d.toISOString());
  }

  private formatDateLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
