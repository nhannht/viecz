import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Category } from './models';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);

  categories = signal<Category[]>([]);
  private loaded = false;

  load() {
    if (this.loaded && this.categories().length > 0) return;
    this.http.get<Category[]>('/api/v1/categories').pipe(
      tap(cats => {
        this.categories.set(cats);
        this.loaded = true;
      }),
    ).subscribe();
  }

  list() {
    return this.http.get<Category[]>('/api/v1/categories').pipe(
      tap(cats => {
        this.categories.set(cats);
        this.loaded = true;
      }),
    );
  }
}
