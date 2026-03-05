import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  const allClasses = ['dracula', 'sang-sunglass', 'sang-moonriver'];

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

  it('defaults to light theme', () => {
    expect(service.theme()).toBe('light');
  });

  it('cycles through all 4 themes', () => {
    service.init();

    service.toggle();
    expect(service.theme()).toBe('sang-sunglass');
    expect(document.documentElement.classList.contains('sang-sunglass')).toBe(true);

    service.toggle();
    expect(service.theme()).toBe('dracula');
    expect(document.documentElement.classList.contains('dracula')).toBe(true);
    expect(document.documentElement.classList.contains('sang-sunglass')).toBe(false);

    service.toggle();
    expect(service.theme()).toBe('sang-moonriver');
    expect(document.documentElement.classList.contains('sang-moonriver')).toBe(true);
    expect(document.documentElement.classList.contains('dracula')).toBe(false);

    service.toggle();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.classList.contains('sang-moonriver')).toBe(false);
  });

  it('persists theme across service instances', () => {
    service.setTheme('sang-sunglass');
    expect(localStorage.getItem('metro-theme')).toBe('sang-sunglass');

    service.setTheme('sang-moonriver');
    expect(localStorage.getItem('metro-theme')).toBe('sang-moonriver');
  });

  it('applies correct class on init when stored', () => {
    localStorage.setItem('metro-theme', 'sang-moonriver');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const freshService = TestBed.inject(ThemeService);
    freshService.init();
    expect(document.documentElement.classList.contains('sang-moonriver')).toBe(true);
    expect(freshService.theme()).toBe('sang-moonriver');
  });

  it('falls back to light for invalid stored value', () => {
    localStorage.setItem('metro-theme', 'invalid-theme');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const freshService = TestBed.inject(ThemeService);
    expect(freshService.theme()).toBe('light');
  });

  it('removes all other theme classes when switching', () => {
    service.init();
    service.setTheme('dracula');
    service.setTheme('sang-sunglass');
    expect(document.documentElement.classList.contains('dracula')).toBe(false);
    expect(document.documentElement.classList.contains('sang-sunglass')).toBe(true);
  });
});
