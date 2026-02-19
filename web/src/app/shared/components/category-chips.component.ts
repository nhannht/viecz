import { Component, inject, output, signal, OnInit } from '@angular/core';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { CategoryService } from '../../core/category.service';
import { Category } from '../../core/models';

@Component({
  selector: 'app-category-chips',
  standalone: true,
  imports: [MatChipListbox, MatChipOption],
  template: `
    <div class="category-chips">
      <mat-chip-listbox (change)="onSelect($event.value)">
        <mat-chip-option [value]="0" [selected]="selected() === 0">All</mat-chip-option>
        @for (cat of categoryService.categories(); track cat.id) {
          <mat-chip-option [value]="cat.id" [selected]="selected() === cat.id">
            {{ cat.name_vi || cat.name }}
          </mat-chip-option>
        }
      </mat-chip-listbox>
    </div>
  `,
  styles: `
    .category-chips {
      overflow-x: auto;
      white-space: nowrap;
      padding-bottom: 4px;
    }
  `,
})
export class CategoryChipsComponent implements OnInit {
  categoryService = inject(CategoryService);
  selected = signal(0);
  categorySelected = output<number>();

  ngOnInit() {
    this.categoryService.load();
  }

  onSelect(catId: number) {
    this.selected.set(catId);
    this.categorySelected.emit(catId);
  }
}
