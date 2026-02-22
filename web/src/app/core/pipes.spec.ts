import { TestBed } from '@angular/core/testing';
import { VndPipe, TimeAgoPipe } from './pipes';
import { provideTranslocoForTesting } from './transloco-testing';

describe('VndPipe', () => {
  const pipe = new VndPipe();

  it('should format a number as Vietnamese Dong', () => {
    expect(pipe.transform(20000)).toContain('20');
    expect(pipe.transform(20000)).toContain('₫');
  });

  it('should format zero', () => {
    expect(pipe.transform(0)).toBe('0 ₫');
  });

  it('should format large numbers with separators', () => {
    const result = pipe.transform(1000000);
    expect(result).toContain('₫');
    expect(result).toContain('1.000.000');
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should format negative numbers', () => {
    const result = pipe.transform(-5000);
    expect(result).toContain('₫');
    expect(result).toContain('5.000');
  });
});

describe('TimeAgoPipe', () => {
  let pipe: TimeAgoPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTranslocoForTesting(), TimeAgoPipe],
    });
    pipe = TestBed.inject(TimeAgoPipe);
  });

  it('should return "just now" for recent timestamps', () => {
    const now = new Date().toISOString();
    expect(pipe.transform(now)).toBe('just now');
  });

  it('should return minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(pipe.transform(fiveMinAgo)).toBe('5m ago');
  });

  it('should return hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(pipe.transform(twoHoursAgo)).toBe('2h ago');
  });

  it('should return days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(pipe.transform(threeDaysAgo)).toBe('3d ago');
  });

  it('should return formatted date for old timestamps', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const result = pipe.transform(twoWeeksAgo);
    // Should be a locale date string, not "Xd ago"
    expect(result).not.toContain('d ago');
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(pipe.transform('')).toBe('');
  });
});
