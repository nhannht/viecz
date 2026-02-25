import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Task, TaskListResponse, TaskApplication } from './models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);

  list(params?: {
    category_id?: number;
    requester_id?: number;
    tasker_id?: number;
    status?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    page?: number;
    limit?: number;
    lat?: number;
    lng?: number;
    radius?: number;
    sort?: string;
  }) {
    let hp = new HttpParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') hp = hp.set(k, String(v));
      }
    }
    return this.http.get<TaskListResponse>('/api/v1/tasks', { params: hp });
  }

  get(id: number) {
    return this.http.get<Task>(`/api/v1/tasks/${id}`);
  }

  create(task: Partial<Task>) {
    return this.http.post<Task>('/api/v1/tasks', task);
  }

  update(id: number, task: Partial<Task>) {
    return this.http.put<Task>(`/api/v1/tasks/${id}`, task);
  }

  delete(id: number) {
    return this.http.delete<{ message: string }>(`/api/v1/tasks/${id}`);
  }

  apply(taskId: number, body: { proposed_price?: number; message?: string }) {
    return this.http.post<TaskApplication>(`/api/v1/tasks/${taskId}/applications`, body);
  }

  getApplications(taskId: number) {
    return this.http.get<TaskApplication[]>(`/api/v1/tasks/${taskId}/applications`);
  }

  acceptApplication(applicationId: number) {
    return this.http.post<{ message: string }>(`/api/v1/applications/${applicationId}/accept`, {});
  }

  complete(taskId: number) {
    return this.http.post<{ message: string }>(`/api/v1/tasks/${taskId}/complete`, {});
  }
}
