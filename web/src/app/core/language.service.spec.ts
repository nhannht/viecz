import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageService } from './language.service';
import { provideTranslocoForTesting } from './transloco-testing';

describe('LanguageService', () => {
  function setup(platform: string = 'browser') {
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: platform },
        LanguageService,
      ],
    });
    return TestBed.inject(LanguageService);
  }

  afterEach(() => {
    localStorage.clear();
  });

  describe('init()', () => {
    it('should use stored "vi" language', () => {
      localStorage.setItem('viecz_lang', 'vi');
      const service = setup();
      service.init();
      expect(service.activeLang).toBe('vi');
    });

    it('should use stored "en" language', () => {
      localStorage.setItem('viecz_lang', 'en');
      const service = setup();
      service.init();
      expect(service.activeLang).toBe('en');
    });

    it('should fall back to browser language "vi" when stored value is invalid', () => {
      localStorage.setItem('viecz_lang', 'invalid');
      vi.spyOn(navigator, 'language', 'get').mockReturnValue('vi-VN');
      const service = setup();
      service.init();
      expect(service.activeLang).toBe('vi');
    });

    it('should fall back to "en" when stored value is invalid and browser is not Vietnamese', () => {
      localStorage.setItem('viecz_lang', 'invalid');
      vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
      const service = setup();
      service.init();
      expect(service.activeLang).toBe('en');
    });

    it('should be a no-op on SSR (server platform)', () => {
      const service = setup('server');
      const transloco = TestBed.inject(TranslocoService);
      const spy = vi.spyOn(transloco, 'setActiveLang');
      service.init();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('activeLang', () => {
    it('should delegate to TranslocoService.getActiveLang()', () => {
      const service = setup();
      const transloco = TestBed.inject(TranslocoService);
      vi.spyOn(transloco, 'getActiveLang').mockReturnValue('vi');
      expect(service.activeLang).toBe('vi');
    });
  });

  describe('setLanguage()', () => {
    it('should set language and write to localStorage in browser', () => {
      const service = setup();
      service.setLanguage('vi');
      expect(service.activeLang).toBe('vi');
      expect(localStorage.getItem('viecz_lang')).toBe('vi');
    });

    it('should set language but skip localStorage on SSR', () => {
      const service = setup('server');
      const transloco = TestBed.inject(TranslocoService);
      vi.spyOn(transloco, 'setActiveLang');
      service.setLanguage('vi');
      expect(transloco.setActiveLang).toHaveBeenCalledWith('vi');
      expect(localStorage.getItem('viecz_lang')).toBeNull();
    });
  });

  describe('toggle()', () => {
    it('should toggle from vi to en', () => {
      const service = setup();
      service.setLanguage('vi');
      service.toggle();
      expect(service.activeLang).toBe('en');
    });

    it('should toggle from en to vi', () => {
      const service = setup();
      service.setLanguage('en');
      service.toggle();
      expect(service.activeLang).toBe('vi');
    });
  });
});
