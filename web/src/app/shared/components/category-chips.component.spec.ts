import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoryChipsComponent } from './category-chips.component';
import { CategoryService } from '../../core/category.service';
import { Category } from '../../core/models';
import { signal } from '@angular/core';

const mockCategories: Category[] = [
  { id: 1, name: 'Delivery', name_vi: 'Giao hang', is_active: true },
  { id: 2, name: 'Cleaning', name_vi: 'Don dep', is_active: true },
];

describe('CategoryChipsComponent', () => {
  let component: CategoryChipsComponent;
  let fixture: ComponentFixture<CategoryChipsComponent>;
  let categoryService: { categories: ReturnType<typeof signal<Category[]>>; load: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    categoryService = {
      categories: signal<Category[]>(mockCategories),
      load: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CategoryChipsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CategoryService, useValue: categoryService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryChipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call categoryService.load() on init', () => {
    expect(categoryService.load).toHaveBeenCalled();
  });

  it('should render "All" chip', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('All');
  });

  it('should render category chips from service', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Giao hang');
    expect(el.textContent).toContain('Don dep');
  });

  it('should have initial selected as 0 (All)', () => {
    expect(component.selected()).toBe(0);
  });

  it('should emit categorySelected when a category is selected', () => {
    const emitSpy = vi.fn();
    component.categorySelected.subscribe(emitSpy);

    component.onSelect(2);

    expect(component.selected()).toBe(2);
    expect(emitSpy).toHaveBeenCalledWith(2);
  });

  it('should update selected signal on onSelect', () => {
    component.onSelect(1);
    expect(component.selected()).toBe(1);

    component.onSelect(0);
    expect(component.selected()).toBe(0);
  });
});
