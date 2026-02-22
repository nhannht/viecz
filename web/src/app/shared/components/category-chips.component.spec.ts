import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { CategoryChipsComponent } from './category-chips.component';
import { CategoryService } from '../../core/category.service';
import { LanguageService } from '../../core/language.service';
import { Category } from '../../core/models';
import { provideTranslocoForTesting } from '../../core/transloco-testing';

const mockCategories: Category[] = [
  { id: 1, name: 'Delivery', name_vi: 'Giao hang', is_active: true },
  { id: 2, name: 'Cleaning', name_vi: 'Don dep', is_active: true },
];

describe('CategoryChipsComponent', () => {
  let component: CategoryChipsComponent;
  let fixture: ComponentFixture<CategoryChipsComponent>;
  let categoryService: { categories: ReturnType<typeof signal<Category[]>>; load: ReturnType<typeof vi.fn> };
  let langService: { activeLang: string; init: ReturnType<typeof vi.fn>; setLanguage: ReturnType<typeof vi.fn>; toggle: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    categoryService = {
      categories: signal<Category[]>(mockCategories),
      load: vi.fn(),
    };
    langService = {
      activeLang: 'en',
      init: vi.fn(),
      setLanguage: vi.fn(),
      toggle: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CategoryChipsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CategoryService, useValue: categoryService },
        { provide: LanguageService, useValue: langService },
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
    expect(el.textContent).toContain('Delivery');
    expect(el.textContent).toContain('Cleaning');
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

  it('should render English names when language is en', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Delivery');
    expect(el.textContent).not.toContain('Giao hang');
  });

  it('should highlight selected "All" chip with active class', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    // First button is "All", should have active class
    expect(buttons[0].classList.toString()).toContain('bg-fg');
  });

  it('should highlight selected category chip after selection', () => {
    component.onSelect(1);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    // First button (All) should not have active class
    expect(buttons[0].classList.toString()).toContain('bg-transparent');
    // Second button (Delivery, id=1) should have active class
    expect(buttons[1].classList.toString()).toContain('bg-fg');
  });

  it('should render correct number of category buttons plus All', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(3); // All + 2 categories
  });

  it('onSelect with 0 should select All', () => {
    component.onSelect(1); // select something else first
    component.onSelect(0);
    expect(component.selected()).toBe(0);
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should render English category names when language is en (non-vi branch)', () => {
      // langService.activeLang is 'en' in this describe block
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Delivery');
      expect(el.textContent).not.toContain('Giao hang');
    });
  });
});

describe('CategoryChipsComponent (Vietnamese)', () => {
  it('should fall back to English name when name_vi is empty in vi mode', async () => {
    const viLangService = { activeLang: 'vi', init: vi.fn(), setLanguage: vi.fn(), toggle: vi.fn() };
    const noViNameCategories: Category[] = [
      { id: 1, name: 'Delivery', name_vi: '', is_active: true },
    ];
    const viCategoryService = {
      categories: signal<Category[]>(noViNameCategories),
      load: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CategoryChipsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CategoryService, useValue: viCategoryService },
        { provide: LanguageService, useValue: viLangService },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(CategoryChipsComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    // name_vi is empty so falls back to name
    expect(el.textContent).toContain('Delivery');
  });

  it('should display Vietnamese name when language is vi', async () => {
    const viLangService = { activeLang: 'vi', init: vi.fn(), setLanguage: vi.fn(), toggle: vi.fn() };
    const viCategoryService = {
      categories: signal<Category[]>(mockCategories),
      load: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CategoryChipsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CategoryService, useValue: viCategoryService },
        { provide: LanguageService, useValue: viLangService },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(CategoryChipsComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Giao hang');
  });
});
