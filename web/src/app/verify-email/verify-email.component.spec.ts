import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTransloco } from '@jsverse/transloco';
import { VerifyEmailComponent } from './verify-email.component';

function setup(token: string | null) {
  TestBed.configureTestingModule({
    imports: [VerifyEmailComponent],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTransloco({
        config: { availableLangs: ['en'], defaultLang: 'en', reRenderOnLangChange: false },
      }),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(token ? { token } : {}),
          },
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(VerifyEmailComponent);
  const component = fixture.componentInstance;
  const httpMock = TestBed.inject(HttpTestingController);
  return { fixture, component, httpMock };
}

describe('VerifyEmailComponent', () => {
  it('should show error when no token provided', () => {
    const { fixture, component } = setup(null);
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.success()).toBe(false);
    expect(component.errorMessage()).toBe('No verification token provided');
  });

  it('should call verify-email API and set success', () => {
    const { fixture, component, httpMock } = setup('valid-token');
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/v1/auth/verify-email');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'valid-token' });

    req.flush({ message: 'email verified successfully' });

    expect(component.loading()).toBe(false);
    expect(component.success()).toBe(true);
  });

  it('should handle verification error', () => {
    const { fixture, component, httpMock } = setup('bad-token');
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/v1/auth/verify-email');
    req.flush({ error: 'invalid or expired verification link' }, { status: 400, statusText: 'Bad Request' });

    expect(component.loading()).toBe(false);
    expect(component.success()).toBe(false);
    expect(component.errorMessage()).toBe('invalid or expired verification link');
  });
});
