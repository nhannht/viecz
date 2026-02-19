import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TaskApplication } from './models';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private http = inject(HttpClient);

  apply(taskId: number, body: { proposed_price?: number; message?: string }) {
    return this.http.post<TaskApplication>(`/api/v1/tasks/${taskId}/applications`, body);
  }

  getForTask(taskId: number) {
    return this.http.get<TaskApplication[]>(`/api/v1/tasks/${taskId}/applications`);
  }

  accept(applicationId: number) {
    return this.http.post<{ message: string }>(`/api/v1/applications/${applicationId}/accept`, {});
  }
}
