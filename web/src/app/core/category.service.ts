import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Category } from './models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);

  list() {
    return this.http.get<Category[]>('/api/v1/categories');
  }
}
