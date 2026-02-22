import { TestBed } from '@angular/core/testing';
import { NhannhtMetroSnackbarService } from './nhannht-metro-snackbar.service';
import { TranslocoService } from '@jsverse/transloco';
import { provideTranslocoForTesting } from '../../core/transloco-testing';

describe('NhannhtMetroSnackbarService', () => {
  let service: NhannhtMetroSnackbarService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(NhannhtMetroSnackbarService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show message and set visible', () => {
    service.show('Hello');
    expect(service.visible()).toBe(true);
    expect(service.message()).toBe('Hello');
  });

  it('should auto-hide after default 4000ms duration', () => {
    service.show('Hello');
    expect(service.visible()).toBe(true);
    vi.advanceTimersByTime(3999);
    expect(service.visible()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(service.visible()).toBe(false);
  });

  it('should auto-hide after custom duration', () => {
    service.show('Hello', undefined, { duration: 2000 });
    vi.advanceTimersByTime(2000);
    expect(service.visible()).toBe(false);
  });

  it('should reset timeout when called again before timeout', () => {
    service.show('First', undefined, { duration: 3000 });
    vi.advanceTimersByTime(2000);
    service.show('Second', undefined, { duration: 3000 });
    vi.advanceTimersByTime(2000);
    // Should still be visible since second call reset the timer
    expect(service.visible()).toBe(true);
    expect(service.message()).toBe('Second');
    vi.advanceTimersByTime(1000);
    expect(service.visible()).toBe(false);
  });

  it('should dismiss immediately and clear timeout', () => {
    service.show('Hello', undefined, { duration: 5000 });
    expect(service.visible()).toBe(true);
    service.dismiss();
    expect(service.visible()).toBe(false);
    // Advancing time should not cause issues (timeout was cleared)
    vi.advanceTimersByTime(5000);
    expect(service.visible()).toBe(false);
  });

  it('should dismiss when no timeout is active (covers if (this.timeout) false branch)', () => {
    // Do not call show() first — timeout is undefined
    expect(service.visible()).toBe(false);
    // dismiss should not throw even when timeout is not set
    expect(() => service.dismiss()).not.toThrow();
    expect(service.visible()).toBe(false);
  });

  it('visible signal starts as false and message signal starts as empty (covers class field initializers)', () => {
    // Verify initial signal values — covers the signal() initialization branches
    expect(service.visible()).toBe(false);
    expect(service.message()).toBe('');
  });
});

describe('TestTranslocoLoader - unknown language fallback (transloco-testing.ts line 169)', () => {
  it('should fall back to English translations when an unknown language is requested', async () => {
    TestBed.configureTestingModule({
      providers: [provideTranslocoForTesting()],
    });
    const transloco = TestBed.inject(TranslocoService);
    // Loading 'fr' which is not in translations → the || branch returns translations['en']
    // Verify the loader returns the English data (covering the || fallback branch)
    const translation = await transloco.load('fr').toPromise();
    // The loaded translation should be the English fallback (not null/undefined)
    expect(translation).toBeTruthy();
    // The fallback English data should contain common.cancel = 'Cancel'
    expect((translation as any)['common']['cancel']).toBe('Cancel');
  });
});
