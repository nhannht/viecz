import { Component, inject, OnInit, signal, input } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardActions } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaskService } from '../core/task.service';
import { CategoryService } from '../core/category.service';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [
    FormsModule,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCardActions,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatSelect,
    MatOption,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButton,
    MatIcon,
    MatProgressSpinner,
  ],
  template: `
    @if (loadingTask()) {
      <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
    } @else {
      <mat-card class="form-card">
        <mat-card-header>
          <mat-card-title>{{ isEditMode() ? 'Edit Task' : 'Create Task' }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form class="task-form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Title</mat-label>
              <input matInput [(ngModel)]="title" name="title" required maxlength="200"
                     placeholder="What do you need help with?">
              @if (submitted && !title) {
                <mat-error>Title is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput [(ngModel)]="description" name="description" required
                        maxlength="2000" rows="5"
                        placeholder="Describe the task in detail"></textarea>
              @if (submitted && !description) {
                <mat-error>Description is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Category</mat-label>
              <mat-select [(ngModel)]="categoryId" name="categoryId" required>
                @for (cat of categoryService.categories(); track cat.id) {
                  <mat-option [value]="cat.id">{{ cat.name_vi || cat.name }}</mat-option>
                }
              </mat-select>
              @if (submitted && !categoryId) {
                <mat-error>Category is required</mat-error>
              }
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Price (VND)</mat-label>
                <input matInput type="number" [(ngModel)]="price" name="price"
                       required min="1" placeholder="e.g. 50000">
                @if (submitted && (!price || price <= 0)) {
                  <mat-error>Price must be greater than 0</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Location</mat-label>
                <input matInput [(ngModel)]="location" name="location" required
                       maxlength="255" placeholder="Where is this task?">
                @if (submitted && !location) {
                  <mat-error>Location is required</mat-error>
                }
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Deadline</mat-label>
              <input matInput [matDatepicker]="picker" [(ngModel)]="deadline" name="deadline">
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
            </mat-form-field>

            <mat-card-actions align="end">
              <button mat-button type="button" (click)="onCancel()">Cancel</button>
              <button mat-raised-button type="submit" [disabled]="saving()">
                @if (saving()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <ng-container>
                    <mat-icon>{{ isEditMode() ? 'save' : 'add' }}</mat-icon>
                    {{ isEditMode() ? 'Save Changes' : 'Create Task' }}
                  </ng-container>
                }
              </button>
            </mat-card-actions>
          </form>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 64px 0; }
    .form-card { max-width: 700px; margin: 0 auto; }
    .task-form { display: flex; flex-direction: column; gap: 4px; padding-top: 16px; }
    .full-width { width: 100%; }
    .half-width { flex: 1; }
    .form-row {
      display: flex; gap: 16px;
    }
    @media (max-width: 600px) {
      .form-row { flex-direction: column; gap: 4px; }
      .half-width { width: 100%; }
    }
  `,
})
export class TaskFormComponent implements OnInit {
  id = input<string>();

  private taskService = inject(TaskService);
  categoryService = inject(CategoryService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isEditMode = signal(false);
  loadingTask = signal(false);
  saving = signal(false);
  submitted = false;

  title = '';
  description = '';
  categoryId: number | null = null;
  price: number | null = null;
  location = '';
  deadline: Date | null = null;

  ngOnInit() {
    this.categoryService.load();
    const taskId = this.id();
    if (taskId) {
      this.isEditMode.set(true);
      this.loadingTask.set(true);
      this.taskService.get(Number(taskId)).subscribe({
        next: task => {
          this.title = task.title;
          this.description = task.description;
          this.categoryId = task.category_id;
          this.price = task.price;
          this.location = task.location;
          this.deadline = task.deadline ? new Date(task.deadline) : null;
          this.loadingTask.set(false);
        },
        error: () => {
          this.snackBar.open('Task not found', 'Close', { duration: 3000 });
          this.router.navigate(['/']);
          this.loadingTask.set(false);
        },
      });
    }
  }

  onSubmit() {
    this.submitted = true;
    if (!this.title || !this.description || !this.categoryId || !this.price || this.price <= 0 || !this.location) {
      return;
    }

    this.saving.set(true);
    const body: Record<string, unknown> = {
      title: this.title,
      description: this.description,
      category_id: this.categoryId,
      price: this.price,
      location: this.location,
    };
    if (this.deadline) {
      body['deadline'] = this.deadline.toISOString();
    }

    if (this.isEditMode()) {
      this.taskService.update(Number(this.id()), body).subscribe({
        next: task => {
          this.snackBar.open('Task updated', 'Close', { duration: 3000 });
          this.router.navigate(['/tasks', task.id]);
          this.saving.set(false);
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.taskService.create(body).subscribe({
        next: task => {
          this.snackBar.open('Task created', 'Close', { duration: 3000 });
          this.router.navigate(['/tasks', task.id]);
          this.saving.set(false);
        },
        error: () => this.saving.set(false),
      });
    }
  }

  onCancel() {
    if (this.isEditMode()) {
      this.router.navigate(['/tasks', this.id()]);
    } else {
      this.router.navigate(['/']);
    }
  }
}
