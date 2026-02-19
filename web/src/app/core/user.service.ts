import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getProfile(id: number) {
    return this.http.get<User>(`/api/v1/users/${id}`);
  }

  getMyProfile() {
    return this.http.get<User>('/api/v1/users/me');
  }

  updateProfile(data: { name?: string; phone?: string; bio?: string }) {
    return this.http.put<User>('/api/v1/users/me', data);
  }

  uploadAvatar(file: File) {
    const fd = new FormData();
    fd.append('avatar', file);
    return this.http.post<User>('/api/v1/users/me/avatar', fd);
  }

  becomeTasker() {
    return this.http.post<User>('/api/v1/users/become-tasker', {});
  }
}
