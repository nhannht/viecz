import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { VieczSnackbarService } from '../shared/services/viecz-snackbar.service';
import { errorInterceptor } from './error.interceptor';
import { provideTranslocoForTesting } from './transloco-testing';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let snackbarService: VieczSnackbarService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    snackbarService = TestBed.inject(VieczSnackbarService);
    vi.spyOn(snackbarService, 'show');
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should show snackbar on 400 error', () => {
    http.get('/api/v1/tasks').subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/v1/tasks');
    req.flush({ error: 'Validation error' }, { status: 400, statusText: 'Bad Request' });

    expect(snackbarService.show).toHaveBeenCalledWith('Validation error', 'Close', { duration: 4000 });
  });

  it('should show snackbar on 500 error', () => {
    http.get('/api/v1/tasks').subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/v1/tasks');
    req.flush({ error: 'Internal server error' }, { status: 500, statusText: 'Server Error' });

    expect(snackbarService.show).toHaveBeenCalledWith('Internal server error', 'Close', { duration: 4000 });
  });

  it('should NOT show snackbar on 401 error (handled by auth interceptor)', () => {
    http.get('/api/v1/tasks').subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/v1/tasks');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(snackbarService.show).not.toHaveBeenCalled();
  });

  it('should use message field as fallback', () => {
    http.get('/api/v1/tasks').subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/v1/tasks');
    req.flush({ message: 'Something went wrong' }, { status: 404, statusText: 'Not Found' });

    expect(snackbarService.show).toHaveBeenCalledWith('Something went wrong', 'Close', { duration: 4000 });
  });

  it('should show generic message when no error details', () => {
    http.get('/api/v1/tasks').subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/v1/tasks');
    req.flush({}, { status: 500, statusText: 'Server Error' });

    expect(snackbarService.show).toHaveBeenCalledWith('An error occurred', 'Close', { duration: 4000 });
  });

  it('should not show snackbar on success', () => {
    http.get('/api/v1/tasks').subscribe();

    const req = httpTesting.expectOne('/api/v1/tasks');
    req.flush([]);

    expect(snackbarService.show).not.toHaveBeenCalled();
  });
});
