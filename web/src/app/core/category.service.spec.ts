import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoryService } from './category.service';
import { Category } from './models';

const mockCategories: Category[] = [
  { id: 1, name: 'Delivery', name_vi: 'Giao hang', is_active: true },
  { id: 2, name: 'Cleaning', name_vi: 'Don dep', is_active: true },
  { id: 3, name: 'Tutoring', name_vi: 'Gia su', is_active: true },
];

describe('CategoryService', () => {
  let service: CategoryService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CategoryService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have empty categories signal initially', () => {
    expect(service.categories()).toEqual([]);
  });

  describe('list()', () => {
    it('should fetch categories via GET', () => {
      service.list().subscribe();
      const req = httpTesting.expectOne('/api/v1/categories');
      expect(req.request.method).toBe('GET');
      req.flush(mockCategories);
    });

    it('should cache categories in signal after list()', () => {
      service.list().subscribe();
      const req = httpTesting.expectOne('/api/v1/categories');
      req.flush(mockCategories);
      expect(service.categories()).toEqual(mockCategories);
    });

    it('should return the categories observable', () => {
      const spy = vi.fn();
      service.list().subscribe(spy);
      const req = httpTesting.expectOne('/api/v1/categories');
      req.flush(mockCategories);
      expect(spy).toHaveBeenCalledWith(mockCategories);
    });
  });

  describe('load()', () => {
    it('should fetch categories on first call', () => {
      service.load();
      const req = httpTesting.expectOne('/api/v1/categories');
      req.flush(mockCategories);
      expect(service.categories()).toEqual(mockCategories);
    });

    it('should not fetch again if already loaded', () => {
      service.load();
      const req = httpTesting.expectOne('/api/v1/categories');
      req.flush(mockCategories);

      service.load();
      httpTesting.expectNone('/api/v1/categories');
    });

    it('should fetch again when loaded flag is true but categories is empty (cond-expr false branch)', () => {
      // Manually set loaded=true but keep categories empty (length === 0)
      // This hits the false branch of: this.loaded && this.categories().length > 0
      (service as any).loaded = true;
      // categories() is still empty (signal([]))
      expect(service.categories().length).toBe(0);
      // Should still fetch because categories is empty
      service.load();
      const req = httpTesting.expectOne('/api/v1/categories');
      req.flush(mockCategories);
      expect(service.categories()).toEqual(mockCategories);
    });
  });
});
