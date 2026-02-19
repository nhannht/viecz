import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NotificationListResponse } from './models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);

  list(limit = 20, offset = 0) {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http.get<NotificationListResponse>('/api/v1/notifications', { params });
  }

  getUnreadCount() {
    return this.http.get<{ unread_count: number }>('/api/v1/notifications/unread-count');
  }

  markAsRead(id: number) {
    return this.http.post(`/api/v1/notifications/${id}/read`, {});
  }

  markAllAsRead() {
    return this.http.post('/api/v1/notifications/read-all', {});
  }

  remove(id: number) {
    return this.http.delete(`/api/v1/notifications/${id}`);
  }
}
