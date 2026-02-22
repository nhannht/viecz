import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

@Pipe({ name: 'vnd', standalone: true })
export class VndPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value == null) return '';
    return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
  }
}

@Pipe({ name: 'timeAgo', standalone: true, pure: false })
export class TimeAgoPipe implements PipeTransform {
  private transloco = inject(TranslocoService);

  transform(value: string | undefined | null): string {
    if (!value) return '';
    const secs = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
    if (secs < 60) return this.transloco.translate('timeAgo.justNow');
    if (secs < 3600) return this.transloco.translate('timeAgo.minutesAgo', { count: Math.floor(secs / 60) });
    if (secs < 86400) return this.transloco.translate('timeAgo.hoursAgo', { count: Math.floor(secs / 3600) });
    if (secs < 604800) return this.transloco.translate('timeAgo.daysAgo', { count: Math.floor(secs / 86400) });
    return new Date(value).toLocaleDateString('vi-VN');
  }
}
