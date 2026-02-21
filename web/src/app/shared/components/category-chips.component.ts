import { Component, inject, output, signal, OnInit } from '@angular/core';
import { CategoryService } from '../../core/category.service';

@Component({
  selector: 'app-category-chips',
  standalone: true,
  template: `
    <div class="flex gap-2 overflow-x-auto pb-1 font-body text-[13px]">
      <button
        class="px-4 py-2 border cursor-pointer transition-all duration-200 whitespace-nowrap"
        [class]="selected() === 0 ? 'bg-fg text-bg border-fg' : 'bg-transparent text-muted border-border hover:border-fg hover:text-fg'"
        (click)="onSelect(0)">
        All
      </button>
      @for (cat of categoryService.categories(); track cat.id) {
        <button
          class="px-4 py-2 border cursor-pointer transition-all duration-200 whitespace-nowrap"
          [class]="selected() === cat.id ? 'bg-fg text-bg border-fg' : 'bg-transparent text-muted border-border hover:border-fg hover:text-fg'"
          (click)="onSelect(cat.id)">
          {{ cat.name_vi || cat.name }}
        </button>
      }
    </div>
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
