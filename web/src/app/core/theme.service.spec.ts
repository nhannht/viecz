import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dracula');
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dracula');
  });

  it('defaults to light theme', () => {
    expect(service.theme()).toBe('light');
  });

  it('toggles to dracula and back', () => {
    service.init();
    service.toggle();
    expect(service.theme()).toBe('dracula');
    expect(document.documentElement.classList.contains('dracula')).toBe(true);
    expect(localStorage.getItem('metro-theme')).toBe('dracula');

    service.toggle();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.classList.contains('dracula')).toBe(false);
    expect(localStorage.getItem('metro-theme')).toBe('light');
  });

  it('persists theme across service instances', () => {
    service.setTheme('dracula');
    expect(localStorage.getItem('metro-theme')).toBe('dracula');
  });

  it('applies dracula class on init when stored', () => {
    localStorage.setItem('metro-theme', 'dracula');
    // Re-create TestBed to pick up new localStorage state
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const freshService = TestBed.inject(ThemeService);
    freshService.init();
    expect(document.documentElement.classList.contains('dracula')).toBe(true);
    expect(freshService.theme()).toBe('dracula');
  });
});
