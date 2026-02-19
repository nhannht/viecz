import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'vnd', standalone: true })
export class VndPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value == null) return '';
    return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
  }
}

@Pipe({ name: 'timeAgo', standalone: true })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    if (!value) return '';
    const secs = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
    if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
    if (secs < 604800) return Math.floor(secs / 86400) + 'd ago';
    return new Date(value).toLocaleDateString('vi-VN');
  }
}
