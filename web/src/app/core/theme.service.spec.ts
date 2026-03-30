import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  const allClasses = ['dracula', 'sang-frostglass'];

  beforeEach(() => {
    localStorage.clear();
    allClasses.forEach(c => document.documentElement.classList.remove(c));
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    allClasses.forEach(c => document.documentElement.classList.remove(c));
  });

  it('defaults to sang-frostglass theme', () => {
    expect(service.theme()).toBe('sang-frostglass');
  });

  it('cycles through all 3 themes', () => {
    service.init();

    service.toggle();
    expect(service.theme()).toBe('dracula');
    expect(document.documentElement.classList.contains('dracula')).toBe(true);

    service.toggle();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.classList.contains('dracula')).toBe(false);

    service.toggle();
    expect(service.theme()).toBe('sang-frostglass');
    expect(document.documentElement.classList.contains('sang-frostglass')).toBe(true);
  });

  it('persists theme across service instances', () => {
    service.setTheme('sang-frostglass');
    expect(localStorage.getItem('metro-theme')).toBe('sang-frostglass');
  });

  it('applies correct class on init when stored', () => {
    localStorage.setItem('metro-theme', 'sang-frostglass');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const freshService = TestBed.inject(ThemeService);
    freshService.init();
    expect(document.documentElement.classList.contains('sang-frostglass')).toBe(true);
    expect(freshService.theme()).toBe('sang-frostglass');
  });

  it('falls back to light for invalid stored value', () => {
    localStorage.setItem('metro-theme', 'invalid-theme');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const freshService = TestBed.inject(ThemeService);
    expect(freshService.theme()).toBe('sang-frostglass');
  });

  it('removes all other theme classes when switching', () => {
    service.init();
    service.setTheme('dracula');
    service.setTheme('sang-frostglass');
    expect(document.documentElement.classList.contains('dracula')).toBe(false);
    expect(document.documentElement.classList.contains('sang-frostglass')).toBe(true);
  });
});
